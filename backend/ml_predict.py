"""
EarthScape Climate Agency — Machine Learning Module
====================================================
Two models:
  1. Seasonal Linear Regression  — temperature trend + prediction
  2. Isolation Forest            — multi-feature anomaly detection

Both models operate on NASA POWER historical records only.
No measurements are invented; records with missing fields are excluded.
"""

import os
import sys
from datetime import date, timedelta
from math import cos, pi, sin, sqrt

import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.linear_model import LinearRegression, Ridge
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.preprocessing import StandardScaler

# Allow running this file directly from the project root
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from pymongo import MongoClient

MONGO_URI  = "mongodb://localhost:27017"
DATABASE   = "earthscape_climate"
COLLECTION = "climate_readings"
VALID_CITIES = {
    "Karachi", "Lahore", "Islamabad", "Rawalpindi", "Faisalabad", "Multan", "Peshawar",
    "Quetta", "Sialkot", "Gujranwala", "Hyderabad", "Sukkur", "Bahawalpur", "Sargodha",
    "Abbottabad", "Swat", "Larkana", "Nawabshah", "Gwadar", "Turbat", "Gilgit", "Skardu",
    "Muzaffarabad", "Mirpur", "Dera Ismail Khan"
}


def get_valid_cities():
    try:
        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=1500)
        cities = client[DATABASE][COLLECTION].distinct("location")
        client.close()
        return set(cities) if cities else VALID_CITIES
    except Exception:
        return VALID_CITIES


# ── feature engineering ───────────────────────────────────────────────────────

def _features_for_date(d):
    """
    Fourier harmonic seasonal feature vector:
      - sin_1 : annual fundamental harmonic (365.25d cycle)
      - cos_1 : orthogonal annual component
      - sin_2 : semi-annual harmonic (monsoon & transition dynamics)
      - cos_2 : orthogonal semi-annual component
    """
    if isinstance(d, str):
        d = date.fromisoformat(d)
    doy = d.timetuple().tm_yday
    sin_1 = sin(2 * pi * doy / 365.25)
    cos_1 = cos(2 * pi * doy / 365.25)
    sin_2 = sin(4 * pi * doy / 365.25)
    cos_2 = cos(4 * pi * doy / 365.25)
    return [sin_1, cos_1, sin_2, cos_2]


# ── model 1: seasonal linear regression ───────────────────────────────────────

def build_prediction(city: str, days_ahead: int = 30) -> dict | None:
    """
    Fit a Fourier harmonic seasonal regression for `city` and predict the
    next `days_ahead` days.

    Returns a dict with keys:
      city, historical (last 90 records), predictions (N days),
      metrics (r2, mae, rmse, …)
    Returns None if there are fewer than 10 valid records.
    """
    allowed_cities = get_valid_cities()
    if city not in allowed_cities:
        raise ValueError(f"City '{city}' must be one of {sorted(allowed_cities)}")

    days_ahead = max(1, min(days_ahead, 90))

    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=3000)
    try:
        client.admin.command("ping")
        records = list(
            client[DATABASE][COLLECTION]
            .find(
                {"location": city},
                {"_id": 0, "date": 1, "avg_temp_c": 1},
            )
            .sort("date", 1)
        )
    finally:
        client.close()

    valid = [
        r for r in records
        if isinstance(r.get("avg_temp_c"), (int, float))
        and not isinstance(r.get("avg_temp_c"), bool)
    ]

    if len(valid) < 10:
        return None

    dates = [date.fromisoformat(r["date"]) for r in valid]
    temps = [float(r["avg_temp_c"]) for r in valid]

    X = np.array([_features_for_date(d) for d in dates])
    y = np.array(temps)

    # 80/20 chronological split
    split   = max(len(X) - max(30, int(len(X) * 0.2)), int(len(X) * 0.8))
    X_train, X_test = X[:split], X[split:]
    y_train, y_test = y[:split], y[split:]

    model = Ridge(alpha=0.5)
    model.fit(X_train, y_train)

    y_pred_test = model.predict(X_test)
    raw_r2 = float(r2_score(y_test, y_pred_test))
    r2   = round(max(0.0, raw_r2), 4)
    mae  = round(float(mean_absolute_error(y_test, y_pred_test)), 3)
    rmse = round(float(sqrt(mean_squared_error(y_test, y_pred_test))), 3)

    # Approximate 95% prediction interval via ±1.96 × RMSE
    margin = round(1.96 * rmse, 2)

    last_date    = dates[-1]
    future_dates = [last_date + timedelta(days=i + 1) for i in range(days_ahead)]
    X_future     = np.array([_features_for_date(d) for d in future_dates])
    y_future     = model.predict(X_future)

    return {
        "city": city,
        "historical": [
            {"date": d.isoformat(), "avg_temp_c": round(t, 2)}
            for d, t in zip(dates[-90:], temps[-90:])
        ],
        "predictions": [
            {
                "date":             d.isoformat(),
                "predicted_temp_c": round(float(p), 2),
                "lower_bound":      round(float(p) - margin, 2),
                "upper_bound":      round(float(p) + margin, 2),
            }
            for d, p in zip(future_dates, y_future)
        ],
        "metrics": {
            "r2_score":         round(r2, 4),
            "mae_celsius":      round(mae, 3),
            "rmse_celsius":     round(rmse, 3),
            "confidence_margin": round(margin, 3),
            "training_records": int(split),
            "test_records":     int(len(X_test)),
            "total_records":    len(valid),
            "days_predicted":   days_ahead,
            "model_type":       "Seasonal Linear Regression",
            "features":         ["day_ordinal", "sin_month", "cos_month"],
        },
    }


# ── model 2: isolation forest ─────────────────────────────────────────────────

IF_FEATURES = [
    "avg_temp_c",
    "min_temp_c",
    "max_temp_c",
    "rainfall_mm",
    "humidity_pct",
]


def run_isolation_forest(contamination: float = 0.05) -> dict:
    """
    Run Isolation Forest across all NASA POWER records using all 5 climate
    features.  Only records complete in every feature are used.

    contamination : expected fraction of anomalies (0.01 – 0.5)
    Returns dict with anomalies list and model metadata.
    """
    contamination = max(0.01, min(float(contamination), 0.5))

    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=3000)
    try:
        client.admin.command("ping")
        records = list(
            client[DATABASE][COLLECTION]
            .find({}, {"_id": 0})
            .sort([("location", 1), ("date", 1)])
        )
    finally:
        client.close()

    complete = [
        r for r in records
        if all(
            isinstance(r.get(f), (int, float)) and not isinstance(r.get(f), bool)
            for f in IF_FEATURES
        )
    ]

    if len(complete) < 20:
        return {
            "error": "Fewer than 20 complete records — cannot fit Isolation Forest.",
            "anomalies": [],
        }

    X = np.array([[r[f] for f in IF_FEATURES] for r in complete])

    scaler   = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    model = IsolationForest(
        contamination=contamination,
        n_estimators=200,
        random_state=42,
    )
    predictions = model.fit_predict(X_scaled)      # -1 = anomaly
    scores      = model.score_samples(X_scaled)    # lower = more anomalous

    anomalies = [
        {
            "date":          r["date"],
            "city":          r["location"],
            "avg_temp_c":    r["avg_temp_c"],
            "min_temp_c":    r.get("min_temp_c"),
            "max_temp_c":    r.get("max_temp_c"),
            "rainfall_mm":   r.get("rainfall_mm"),
            "humidity_pct":  r.get("humidity_pct"),
            "anomaly_score": round(float(s), 4),   # most negative = most anomalous
        }
        for r, pred, s in zip(complete, predictions, scores)
        if pred == -1
    ]
    anomalies.sort(key=lambda x: x["anomaly_score"])  # most extreme first

    # Per-city breakdown
    city_counts = {}
    for a in anomalies:
        city_counts[a["city"]] = city_counts.get(a["city"], 0) + 1

    return {
        "total_records_analyzed": len(complete),
        "flagged_count":          len(anomalies),
        "contamination_rate":     contamination,
        "features_used":          IF_FEATURES,
        "model":                  "Isolation Forest (scikit-learn, n_estimators=200)",
        "city_breakdown":         city_counts,
        "anomalies":              anomalies,
    }


# ── standalone smoke-test ─────────────────────────────────────────────────────

if __name__ == "__main__":
    print("=== Seasonal Linear Regression ===")
    for city in sorted(VALID_CITIES):
        result = build_prediction(city, days_ahead=30)
        if result:
            m = result["metrics"]
            print(
                f"  {city:12s}  R²={m['r2_score']:.4f}  "
                f"MAE={m['mae_celsius']:.2f}°C  "
                f"RMSE={m['rmse_celsius']:.2f}°C  "
                f"±{m['confidence_margin']:.2f}°C (95% PI)"
            )
        else:
            print(f"  {city}: insufficient data")

    print("\n=== Isolation Forest ===")
    result = run_isolation_forest(contamination=0.05)
    print(f"  Records analysed : {result['total_records_analyzed']}")
    print(f"  Anomalies flagged: {result['flagged_count']}")
    print(f"  City breakdown   : {result['city_breakdown']}")
