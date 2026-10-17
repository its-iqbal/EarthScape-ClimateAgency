"""
EarthScape Climate Agency — Threshold-Based Notifications & Alerting Engine
===========================================================================
Monitors climate readings and real-time sensor streams for critical threshold breaches:
- Extreme Heatwaves (max_temp >= 38°C)
- Severe Rainfall & Urban Flooding (rainfall >= 30mm)
- Winter Frost & Cold Snaps (min_temp <= 6°C)
- Air Quality Degradation (aqi >= 150)
- Stores alerts in MongoDB `alerts` with lifecycle status (UNREAD -> ACKNOWLEDGED -> RESOLVED)
"""

import os
import time
import uuid
from datetime import datetime, timezone
from flask import Blueprint, jsonify, request
from pymongo import MongoClient

alerts_bp = Blueprint("alerts", __name__, url_prefix="/api/alerts")

client = MongoClient("mongodb://localhost:27017/", serverSelectionTimeoutMS=2000)
db = client["earthscape_climate"]
alerts_col = db["alerts"]
readings_col = db["climate_readings"]

DEFAULT_RULES = {
    "heatwave": {
        "id": "heatwave",
        "name": "Extreme Heatwave Emergency",
        "metric": "max_temp_c",
        "operator": ">=",
        "threshold": 38.0,
        "unit": "°C",
        "severity": "CRITICAL",
        "action": "Issue municipal red heat health alert. Activate community cooling centers and mandate hydration pauses for outdoor personnel."
    },
    "heavy_rain": {
        "id": "heavy_rain",
        "name": "Severe Precipitation & Flash Flood Warning",
        "metric": "rainfall_mm",
        "operator": ">=",
        "threshold": 30.0,
        "unit": "mm",
        "severity": "CRITICAL",
        "action": "Trigger urban drainage alert. Advise low-lying evacuation preparedness and issue emergency commuter flash flood warnings."
    },
    "cold_snap": {
        "id": "cold_snap",
        "name": "Cold Snap & Frost Advisory",
        "metric": "min_temp_c",
        "operator": "<=",
        "threshold": 6.0,
        "unit": "°C",
        "severity": "WARNING",
        "action": "Alert agricultural sector for crop frost mitigation. Issue heating advisories for vulnerable demographics."
    },
    "air_quality": {
        "id": "air_quality",
        "name": "Hazardous Air Quality Warning",
        "metric": "aqi",
        "operator": ">=",
        "threshold": 150.0,
        "unit": "AQI",
        "severity": "WARNING",
        "action": "Recommend N95 masks for outdoor transit. Advise sensitive pulmonary groups to remain indoors."
    },
    "humidity_spike": {
        "id": "humidity_spike",
        "name": "Atmospheric Saturation Advisory",
        "metric": "humidity_pct",
        "operator": ">=",
        "threshold": 85.0,
        "unit": "%",
        "severity": "ADVISORY",
        "action": "Monitor convective storm potential; high dew point elevates perceived heat index."
    }
}

active_rules = dict(DEFAULT_RULES)


def create_alert(rule_key, city, actual_val, date_str, custom_msg=None, reading_source=None):
    """Creates and persists an alert document into MongoDB"""
    rule = active_rules.get(rule_key)
    if not rule:
        return None

    now = datetime.now(timezone.utc)
    alert_id = f"ALT-{city[:3].upper()}-{int(time.time() * 1000) % 1000000}"
    
    title = rule["name"]
    unit = rule["unit"]
    thresh = rule["threshold"]
    op = rule["operator"]
    
    message = custom_msg or f"{rule['name']} in {city}: {rule['metric']} reached {actual_val} {unit} (Threshold: {op} {thresh} {unit})."

    alert_doc = {
        "alert_id": alert_id,
        "rule_id": rule_key,
        "title": title,
        "location": city,
        "severity": rule["severity"],
        "metric": rule["metric"],
        "threshold": thresh,
        "actual_value": actual_val,
        "unit": unit,
        "date": date_str,
        "timestamp": now.isoformat(),
        "status": "UNREAD",
        "message": message,
        "action": rule["action"],
        "source": reading_source or "CLIMATE_MONITOR"
    }

    try:
        alerts_col.insert_one(alert_doc)
        alert_doc.pop("_id", None)
        return alert_doc
    except Exception as e:
        print(f"Failed to insert alert: {e}")
        return None


def evaluate_reading(reading):
    """Evaluates a single reading against active threshold rules and creates alerts if triggered"""
    triggered = []
    city = reading.get("location") or reading.get("city") or "Unknown"
    date_str = reading.get("date") or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    source = reading.get("source", "STREAM")

    # Heatwave
    max_t = reading.get("max_temp_c")
    if isinstance(max_t, (int, float)) and max_t >= active_rules["heatwave"]["threshold"]:
        a = create_alert("heatwave", city, max_t, date_str, reading_source=source)
        if a: triggered.append(a)

    # Heavy Rain
    rain = reading.get("rainfall_mm")
    if isinstance(rain, (int, float)) and rain >= active_rules["heavy_rain"]["threshold"]:
        a = create_alert("heavy_rain", city, rain, date_str, reading_source=source)
        if a: triggered.append(a)

    # Cold Snap
    min_t = reading.get("min_temp_c")
    if isinstance(min_t, (int, float)) and min_t <= active_rules["cold_snap"]["threshold"]:
        a = create_alert("cold_snap", city, min_t, date_str, reading_source=source)
        if a: triggered.append(a)

    # AQI
    aqi = reading.get("aqi")
    if isinstance(aqi, (int, float)) and aqi >= active_rules["air_quality"]["threshold"]:
        a = create_alert("air_quality", city, aqi, date_str, reading_source=source)
        if a: triggered.append(a)

    return triggered


def seed_historical_alerts_if_empty():
    """Populates initial alert database from historical NASA POWER data if empty"""
    try:
        if alerts_col.count_documents({}) > 0:
            return
        
        # Scan readings for notable extremes in 2024
        heatwaves = list(readings_col.find({"max_temp_c": {"$gte": 45.0}}).limit(4))
        for r in heatwaves:
            create_alert("heatwave", r["location"], r["max_temp_c"], r["date"], reading_source="NASA_POWER_HISTORICAL")

        floods = list(readings_col.find({"rainfall_mm": {"$gte": 50.0}}).limit(4))
        for r in floods:
            create_alert("heavy_rain", r["location"], r["rainfall_mm"], r["date"], reading_source="NASA_POWER_HISTORICAL")

        colds = list(readings_col.find({"min_temp_c": {"$lte": 3.0}}).limit(3))
        for r in colds:
            create_alert("cold_snap", r["location"], r["min_temp_c"], r["date"], reading_source="NASA_POWER_HISTORICAL")

    except Exception as e:
        print(f"Alert seeding note: {e}")

seed_historical_alerts_if_empty()


# ── REST API Routes ───────────────────────────────────────────────────────────

@alerts_bp.route("", methods=["GET"])
def get_alerts():
    """Returns alerts with optional filters: city, severity, status"""
    status_filter = request.args.get("status")
    severity_filter = request.args.get("severity")
    city_filter = request.args.get("city")
    limit = int(request.args.get("limit", 100))

    query = {}
    if status_filter and status_filter != "ALL":
        query["status"] = status_filter
    if severity_filter and severity_filter != "ALL":
        query["severity"] = severity_filter
    if city_filter and city_filter != "ALL":
        query["location"] = city_filter

    try:
        alerts = list(alerts_col.find(query, {"_id": 0}).sort("timestamp", -1).limit(limit))
        return jsonify({"alerts": alerts})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@alerts_bp.route("/summary", methods=["GET"])
def get_alerts_summary():
    """Returns count metrics: unread, critical, warnings, total"""
    try:
        total = alerts_col.count_documents({})
        unread = alerts_col.count_documents({"status": "UNREAD"})
        critical = alerts_col.count_documents({"severity": "CRITICAL", "status": {"$ne": "RESOLVED"}})
        warnings = alerts_col.count_documents({"severity": "WARNING", "status": {"$ne": "RESOLVED"}})
        resolved = alerts_col.count_documents({"status": "RESOLVED"})
        
        # By city breakdown
        city_counts = {}
        for city in ["Karachi", "Lahore", "Islamabad"]:
            city_counts[city] = alerts_col.count_documents({"location": city, "status": "UNREAD"})

        return jsonify({
            "total": total,
            "unread": unread,
            "critical": critical,
            "warnings": warnings,
            "resolved": resolved,
            "city_unread": city_counts
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@alerts_bp.route("/rules", methods=["GET", "POST"])
def manage_rules():
    """Get or update threshold configurations"""
    global active_rules
    if request.method == "POST":
        data = request.get_json(silent=True) or {}
        for r_id, new_thresh in data.items():
            if r_id in active_rules and isinstance(new_thresh, (int, float)):
                active_rules[r_id]["threshold"] = float(new_thresh)
        return jsonify({"message": "Rules updated successfully", "rules": active_rules})
    return jsonify({"rules": active_rules})


@alerts_bp.route("/<alert_id>/ack", methods=["POST"])
def acknowledge_alert(alert_id):
    """Marks an alert as ACKNOWLEDGED"""
    try:
        alerts_col.update_one({"alert_id": alert_id}, {"$set": {"status": "ACKNOWLEDGED"}})
        return jsonify({"message": f"Alert {alert_id} acknowledged", "status": "ACKNOWLEDGED"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@alerts_bp.route("/<alert_id>/resolve", methods=["POST"])
def resolve_alert(alert_id):
    """Marks an alert as RESOLVED"""
    try:
        alerts_col.update_one({"alert_id": alert_id}, {"$set": {"status": "RESOLVED"}})
        return jsonify({"message": f"Alert {alert_id} resolved", "status": "RESOLVED"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@alerts_bp.route("/trigger-test", methods=["POST"])
def trigger_test_alert():
    """Triggers an instantaneous emergency simulation alert for demonstration"""
    data = request.get_json(silent=True) or {}
    alert_type = data.get("type", "heatwave")
    city = data.get("city", "Karachi")
    
    if alert_type == "heavy_rain":
        alert = create_alert("heavy_rain", city, 74.5, datetime.now(timezone.utc).strftime("%Y-%m-%d"), custom_msg=f"Emergency Simulation: Heavy Cloudburst recorded in {city} (74.5mm). Urban drainage alert active.")
    elif alert_type == "cold_snap":
        alert = create_alert("cold_snap", city, 1.2, datetime.now(timezone.utc).strftime("%Y-%m-%d"), custom_msg=f"Emergency Simulation: Severe Sub-Zero Frost Warning in {city} (1.2°C).")
    else:
        alert = create_alert("heatwave", city, 43.8, datetime.now(timezone.utc).strftime("%Y-%m-%d"), custom_msg=f"Emergency Simulation: Dangerous Category 4 Heatwave in {city} (43.8°C).")

    return jsonify({"message": "Test alert generated", "alert": alert})
