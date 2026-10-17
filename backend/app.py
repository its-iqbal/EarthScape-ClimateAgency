
import os
import sys
from collections import defaultdict
from math import cos, pi, sin, sqrt
from statistics import mean, pstdev

from flask import Flask, jsonify, request
from flask_cors import CORS
from pymongo import MongoClient
from pymongo.errors import PyMongoError

# Allow importing ml_predict from the same directory as this file
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

app = Flask(__name__)
CORS(app)

from auth import auth_bp, role_required, token_required
app.register_blueprint(auth_bp)

from streaming import stream_bp
app.register_blueprint(stream_bp)

from alerts import alerts_bp
app.register_blueprint(alerts_bp)

client = MongoClient("mongodb://localhost:27017", serverSelectionTimeoutMS=3000)
db       = client["earthscape_climate"]
readings = db["climate_readings"]


# ── internal helpers ──────────────────────────────────────────────────────────

def numeric_values(records, field):
    return [
        float(r[field])
        for r in records
        if isinstance(r.get(field), (int, float))
        and not isinstance(r.get(field), bool)
    ]


def pearson_correlation(xs, ys):
    if len(xs) != len(ys) or len(xs) < 2:
        return None
    mx, my = mean(xs), mean(ys)
    dx = [v - mx for v in xs]
    dy = [v - my for v in ys]
    sx = sqrt(sum(v**2 for v in dx))
    sy = sqrt(sum(v**2 for v in dy))
    if sx == 0 or sy == 0:
        return None
    return sum(a * b for a, b in zip(dx, dy)) / (sx * sy)


def nasa_records_by_city():
    all_records = list(
        readings.find({"source": "NASA POWER"}, {"_id": 0})
        .sort([("location", 1), ("date", 1)])
    )
    cities = {}
    for r in all_records:
        cities.setdefault(r.get("location", "Unknown"), []).append(r)
    return cities


def _interpret(r):
    if r is None:
        return "insufficient data"
    a = abs(r)
    direction = "positive" if r >= 0 else "negative"
    strength = "strong" if a >= 0.7 else "moderate" if a >= 0.4 else "weak" if a >= 0.2 else "negligible"
    return f"{strength} {direction}"


# ── core routes ───────────────────────────────────────────────────────────────

@app.route("/")
def home():
    return jsonify({"project": "EarthScape Climate Agency", "status": "Backend is running"})


@app.route("/api/health")
def health():
    try:
        client.admin.command("ping")
        return jsonify({"api": "online", "mongodb": "connected"})
    except PyMongoError:
        return jsonify({"api": "online", "mongodb": "disconnected"}), 503


@app.route("/api/climate")
def get_climate_data():
    try:
        location = request.args.get("location", "").strip()
        source   = request.args.get("source", "NASA POWER").strip()
        try:
            limit = int(request.args.get("limit", "1500"))
        except ValueError:
            return jsonify({"error": "limit must be a whole number"}), 400
        if not 1 <= limit <= 1500:
            return jsonify({"error": "limit must be between 1 and 1500"}), 400

        query = {}
        if source.lower() != "all":
            query["source"] = {"$regex": f"^{source}$", "$options": "i"}
        if location:
            query["location"] = {"$regex": f"^{location}$", "$options": "i"}

        records = list(
            readings.find(query, {"_id": 0})
            .sort([("date", 1), ("location", 1)])
            .limit(limit)
        )
        return jsonify({"count": len(records), "source": source, "data": records})
    except PyMongoError:
        return jsonify({"error": "Unable to retrieve climate data"}), 503


# ── analytics routes (Phase 2) ────────────────────────────────────────────────

@app.route("/api/analytics/summary")
def analytics_summary():
    try:
        client.admin.command("ping")
        cities  = nasa_records_by_city()
        results = []
        for city, recs in sorted(cities.items()):
            temps = numeric_values(recs, "avg_temp_c")
            mins  = numeric_values(recs, "min_temp_c")
            maxs  = numeric_values(recs, "max_temp_c")
            rain  = numeric_values(recs, "rainfall_mm")
            hum   = numeric_values(recs, "humidity_pct")
            results.append({
                "city": city, "record_count": len(recs),
                "temperature": {
                    "avg": round(mean(temps), 2) if temps else None,
                    "min": round(min(temps), 2)  if temps else None,
                    "max": round(max(temps), 2)  if temps else None,
                    "stddev": round(pstdev(temps), 2) if len(temps) > 1 else None,
                },
                "min_temp": {"avg": round(mean(mins), 2) if mins else None, "min": round(min(mins), 2) if mins else None},
                "max_temp": {"avg": round(mean(maxs), 2) if maxs else None, "max": round(max(maxs), 2) if maxs else None},
                "rainfall": {
                    "total_mm": round(sum(rain), 2) if rain else None,
                    "avg_daily_mm": round(mean(rain), 2) if rain else None,
                    "rainy_days": sum(1 for v in rain if v > 0),
                },
                "humidity": {
                    "avg": round(mean(hum), 2) if hum else None,
                    "min": round(min(hum), 2)  if hum else None,
                    "max": round(max(hum), 2)  if hum else None,
                },
            })
        return jsonify({"cities": results, "source": "NASA POWER"})
    except PyMongoError:
        return jsonify({"error": "Database unavailable"}), 503


@app.route("/api/analytics/anomalies")
def analytics_anomalies():
    try:
        client.admin.command("ping")
        try:
            limit = min(int(request.args.get("limit", "50")), 200)
        except ValueError:
            limit = 50
        cities     = nasa_records_by_city()
        flagged_all = []
        for city, recs in sorted(cities.items()):
            temps = numeric_values(recs, "avg_temp_c")
            if len(temps) < 2:
                continue
            center = mean(temps)
            spread = pstdev(temps)
            if spread == 0:
                continue
            for r in recs:
                t = r.get("avg_temp_c")
                if not isinstance(t, (int, float)):
                    continue
                z = abs(t - center) / spread
                if z > 3:
                    flagged_all.append({
                        "date": r["date"], "city": city,
                        "avg_temp_c": round(t, 2),
                        "z_score": round(z, 3),
                        "city_mean": round(center, 2),
                        "city_stddev": round(spread, 2),
                    })
        flagged_all.sort(key=lambda r: r["z_score"], reverse=True)
        return jsonify({
            "flagged_count": len(flagged_all), "shown": min(len(flagged_all), limit),
            "method": "3-sigma population standard deviation",
            "anomalies": flagged_all[:limit],
        })
    except PyMongoError:
        return jsonify({"error": "Database unavailable"}), 503


@app.route("/api/analytics/correlation")
def analytics_correlation():
    try:
        client.admin.command("ping")
        cities  = nasa_records_by_city()
        results = []
        for city, recs in sorted(cities.items()):
            th = [(r["avg_temp_c"], r["humidity_pct"]) for r in recs
                  if isinstance(r.get("avg_temp_c"), (int, float)) and isinstance(r.get("humidity_pct"), (int, float))]
            tr = [(r["avg_temp_c"], r["rainfall_mm"]) for r in recs
                  if isinstance(r.get("avg_temp_c"), (int, float)) and isinstance(r.get("rainfall_mm"), (int, float))]
            th_xs, th_ys = (list(zip(*th)) if th else ([], []))
            tr_xs, tr_ys = (list(zip(*tr)) if tr else ([], []))
            r_th = pearson_correlation(list(th_xs), list(th_ys))
            r_tr = pearson_correlation(list(tr_xs), list(tr_ys))
            results.append({
                "city": city,
                "temp_humidity": {"r": round(r_th, 4) if r_th is not None else None, "paired_records": len(th), "interpretation": _interpret(r_th)},
                "temp_rainfall": {"r": round(r_tr, 4) if r_tr is not None else None, "paired_records": len(tr), "interpretation": _interpret(r_tr)},
            })
        return jsonify({"correlations": results, "source": "NASA POWER"})
    except PyMongoError:
        return jsonify({"error": "Database unavailable"}), 503


@app.route("/api/analytics/monthly")
def analytics_monthly():
    try:
        client.admin.command("ping")
        city_filter = request.args.get("city", "").strip()
        query = {"source": "NASA POWER"}
        if city_filter:
            query["location"] = {"$regex": f"^{city_filter}$", "$options": "i"}
        recs    = list(readings.find(query, {"_id": 0}).sort("date", 1))
        buckets = defaultdict(lambda: defaultdict(list))
        for r in recs:
            buckets[r.get("location", "Unknown")][r.get("date", "")[:7]].append(r)
        results = []
        for city in sorted(buckets):
            for month in sorted(buckets[city]):
                m_recs = buckets[city][month]
                temps  = numeric_values(m_recs, "avg_temp_c")
                rain   = numeric_values(m_recs, "rainfall_mm")
                hum    = numeric_values(m_recs, "humidity_pct")
                results.append({
                    "city": city, "month": month,
                    "avg_temp_c":    round(mean(temps), 2) if temps else None,
                    "total_rain_mm": round(sum(rain),   2) if rain  else None,
                    "avg_humidity":  round(mean(hum),   2) if hum   else None,
                })
        return jsonify({"monthly": results})
    except PyMongoError:
        return jsonify({"error": "Database unavailable"}), 503


# ── ML routes (Phase 3) ───────────────────────────────────────────────────────

@app.route("/api/ml/predict")
def ml_predict():
    """
    Seasonal linear regression temperature prediction for one city.
    Query params:
      city  : Karachi | Lahore | Islamabad  (default: Karachi)
      days  : 1-90                          (default: 30)
    """
    city = request.args.get("city", "Karachi").strip()
    try:
        days = max(1, min(int(request.args.get("days", "30")), 90))
    except ValueError:
        days = 30

    if city not in {"Karachi", "Lahore", "Islamabad"}:
        return jsonify({"error": "city must be Karachi, Lahore, or Islamabad"}), 400

    try:
        from ml_predict import build_prediction
        result = build_prediction(city, days)
        if result is None:
            return jsonify({"error": "Insufficient data for prediction"}), 422
        return jsonify(result)
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@app.route("/api/ml/anomalies")
def ml_if_anomalies():
    """
    Isolation Forest anomaly detection across all 5 climate features.
    Query params:
      contamination : 0.01-0.50  (default: 0.05)
    """
    try:
        contamination = max(0.01, min(float(request.args.get("contamination", "0.05")), 0.5))
    except ValueError:
        contamination = 0.05

    try:
        from ml_predict import run_isolation_forest
        result = run_isolation_forest(contamination)
        return jsonify(result)
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@app.route("/api/ml/models")
def ml_models():
    """
    Run all three cities through the regression model and return
    a combined summary — used by the dashboard model-overview card.
    """
    try:
        from ml_predict import build_prediction
        summaries = []
        for city in ["Islamabad", "Karachi", "Lahore"]:
            result = build_prediction(city, days_ahead=30)
            if result:
                summaries.append({
                    "city":    city,
                    "metrics": result["metrics"],
                    "next_30_avg_predicted": round(
                        sum(p["predicted_temp_c"] for p in result["predictions"]) / len(result["predictions"]), 2
                    ),
                })
        return jsonify({"models": summaries})
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


# ══════════════════════════════════════════════════════════════════════════════
# Phase 4 — Hadoop & MapReduce / HDFS Simulation Endpoints
# ══════════════════════════════════════════════════════════════════════════════

@app.route("/api/hadoop/status")
def hadoop_status():
    """
    Returns simulated HDFS cluster status: NameNode state, 3 DataNodes,
    partitioning, storage capacity, and block replication metadata.
    """
    try:
        from hadoop.hdfs_simulator import HDFSSimulator
        hdfs = HDFSSimulator()
        return jsonify(hdfs.get_cluster_status())
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@app.route("/api/hadoop/jobs")
def hadoop_jobs():
    """
    Returns list of executed MapReduce jobs with telemetry counters.
    """
    try:
        from hadoop.hadoop_runner import HadoopRunner
        runner = HadoopRunner()
        return jsonify({"jobs": runner.get_job_history()})
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@app.route("/api/hadoop/jobs/run", methods=["POST"])
@role_required(["admin"])
def hadoop_run_job():
    """
    Triggers execution of a MapReduce job (monthly or extremes).
    Payload: {"job_type": "monthly" | "extremes", "city": "ALL" | "Karachi" | ...}
    """
    try:
        from hadoop.hadoop_runner import HadoopRunner
        runner = HadoopRunner()
        data = request.get_json(silent=True) or {}
        job_type = data.get("job_type", "monthly")
        city = data.get("city", "ALL")
        
        result = runner.run_mapreduce_job(job_type=job_type, city_filter=city)
        return jsonify(result)
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@app.route("/api/hadoop/results")
def hadoop_results():
    """
    Reads the HDFS part-00000 output file for monthly or extremes job.
    """
    try:
        from hadoop.hadoop_runner import HadoopRunner
        runner = HadoopRunner()
        job_type = request.args.get("job_type", "monthly")
        results = runner.parse_results(job_type)
        return jsonify({"job_type": job_type, "results": results})
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@app.route("/api/hadoop/code")
def hadoop_code():
    """
    Exposes mapper and reducer source scripts for educational and inspection display.
    """
    try:
        from hadoop.hadoop_runner import HadoopRunner
        runner = HadoopRunner()
        script_name = request.args.get("file", "mapper_monthly")
        code = runner.get_source_code(script_name)
        return jsonify({"file": script_name, "code": code})
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


# ── Phase 8: Data Export ──────────────────────────────────────────────────────

import csv
import io
import json as _json
import platform
import time as _time

_SERVER_START_TIME = _time.time()


@app.route("/api/export")
def export_data():
    """
    Export climate data as CSV or JSON.
    Query params:
        format  = 'csv' | 'json'  (default: json)
        city    = 'Karachi' | 'Lahore' | 'Islamabad' | 'All'  (default: All)
        dataset = 'climate' | 'anomalies' | 'monthly'   (default: climate)
    """
    fmt     = request.args.get("format", "json").lower()
    city    = request.args.get("city", "All")
    dataset = request.args.get("dataset", "climate")

    try:
        query = {"source": "NASA POWER"}
        if city != "All":
            query["location"] = city

        if dataset == "climate":
            docs = list(
                readings.find(query, {"_id": 0})
                .sort([("location", 1), ("date", 1)])
                .limit(5000)
            )
        elif dataset == "anomalies":
            all_recs = list(readings.find(query, {"_id": 0}))
            # Inline 3-sigma detection (same logic as /api/analytics/anomalies)
            cities_map = {}
            for r in all_recs:
                cities_map.setdefault(r.get("location", "Unknown"), []).append(r)
            docs = []
            for _city, recs in sorted(cities_map.items()):
                temps = numeric_values(recs, "avg_temp_c")
                if len(temps) < 2:
                    continue
                _mean  = mean(temps)
                _spread = pstdev(temps)
                if _spread == 0:
                    continue
                for r in recs:
                    t = r.get("avg_temp_c")
                    if not isinstance(t, (int, float)):
                        continue
                    z = abs(t - _mean) / _spread
                    if z > 3:
                        docs.append({
                            "date":        r.get("date"),
                            "city":        _city,
                            "avg_temp_c":  round(t, 2),
                            "z_score":     round(z, 3),
                            "city_mean":   round(_mean, 2),
                            "city_stddev": round(_spread, 2),
                        })
            docs.sort(key=lambda x: x["z_score"], reverse=True)

        elif dataset == "monthly":
            pipeline = [
                {"$match": query},
                {"$group": {
                    "_id": {"city": "$location", "month": {"$substr": ["$date", 0, 7]}},
                    "avg_temp_c":   {"$avg": "$avg_temp_c"},
                    "total_rain_mm": {"$sum": "$rainfall_mm"},
                    "avg_humidity": {"$avg": "$humidity_pct"},
                    "count":        {"$sum": 1},
                }},
                {"$sort": {"_id.city": 1, "_id.month": 1}},
            ]
            raw = list(readings.aggregate(pipeline))
            docs = [
                {
                    "city":          r["_id"]["city"],
                    "month":         r["_id"]["month"],
                    "avg_temp_c":    round(r.get("avg_temp_c") or 0, 2),
                    "total_rain_mm": round(r.get("total_rain_mm") or 0, 2),
                    "avg_humidity":  round(r.get("avg_humidity") or 0, 2),
                    "count":         r.get("count", 0),
                }
                for r in raw
            ]
        else:
            return jsonify({"error": "Unknown dataset"}), 400

        if fmt == "csv":
            if not docs:
                return jsonify({"error": "No data"}), 404
            si = io.StringIO()
            writer = csv.DictWriter(si, fieldnames=list(docs[0].keys()))
            writer.writeheader()
            writer.writerows(docs)
            output = si.getvalue()
            from flask import Response
            filename = f"earthscape_{dataset}_{city.lower()}.csv"
            return Response(
                output,
                mimetype="text/csv",
                headers={"Content-Disposition": f"attachment; filename={filename}"},
            )
        else:
            return jsonify({"dataset": dataset, "city": city, "count": len(docs), "data": docs})

    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


# ── Phase 8: System Health ────────────────────────────────────────────────────

@app.route("/api/system/health")
def system_health():
    """Return platform health stats: uptime, MongoDB stats, component status."""
    try:
        uptime_s  = int(_time.time() - _SERVER_START_TIME)
        uptime_h  = uptime_s // 3600
        uptime_m  = (uptime_s % 3600) // 60
        uptime_label = f"{uptime_h}h {uptime_m}m {uptime_s % 60}s"

        # MongoDB server info
        mongo_ok = True
        db_stats = {}
        collection_counts = {}
        try:
            db_stats_raw = db.command("dbStats")
            db_stats = {
                "dataSize_mb":    round(db_stats_raw.get("dataSize", 0) / 1024 / 1024, 2),
                "storageSize_mb": round(db_stats_raw.get("storageSize", 0) / 1024 / 1024, 2),
                "collections":    db_stats_raw.get("collections", 0),
                "indexes":        db_stats_raw.get("indexes", 0),
            }
            for col_name in ["climate_readings", "users", "alerts"]:
                collection_counts[col_name] = db[col_name].count_documents({})
        except Exception as e:
            mongo_ok = False
            db_stats = {"error": str(e)}

        # Component statuses
        components = {
            "flask_api":    {"status": "online",  "label": "Flask REST API"},
            "mongodb":      {"status": "online" if mongo_ok else "error", "label": "MongoDB"},
            "ml_engine":    {"status": "online",  "label": "scikit-learn ML"},
            "hadoop_sim":   {"status": "online",  "label": "Hadoop MapReduce Simulator"},
            "streaming":    {"status": "online",  "label": "Real-Time Streaming Engine"},
            "alerts_engine":{"status": "online",  "label": "Alerts & Threshold Monitor"},
        }

        # Python & platform info
        py_info = {
            "python_version": platform.python_version(),
            "platform":       platform.system(),
            "machine":        platform.machine(),
        }

        return jsonify({
            "uptime":           uptime_label,
            "uptime_seconds":   uptime_s,
            "db_stats":         db_stats,
            "collection_counts": collection_counts,
            "components":       components,
            "system":           py_info,
            "api_version":      "8.0.0",
            "platform_name":    "EarthScape Climate Intelligence Platform",
        })
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


if __name__ == "__main__":
    app.run(debug=True)

