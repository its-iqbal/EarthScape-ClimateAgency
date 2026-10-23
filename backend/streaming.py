"""
EarthScape Climate Agency — Real-Time Climate Streaming Engine
==============================================================
Simulates continuous real-time IoT meteorological sensor streams:
- Active Weather Stations across Karachi, Lahore, and Islamabad
- Threaded non-blocking background generator
- Server-Sent Events (SSE) and polling endpoints
- Direct live ingestion into MongoDB `climate_readings`
"""

import time
import random
import threading
from datetime import datetime, timezone
from collections import deque
from flask import Blueprint, Response, jsonify, request
from pymongo import MongoClient

stream_bp = Blueprint("stream", __name__, url_prefix="/api/stream")

client = MongoClient("mongodb://localhost:27017/", serverSelectionTimeoutMS=2000)
db = client["earthscape_climate"]
readings_col = db["climate_readings"]

STATIONS = [
    {"id": "STA-KHI-01", "name": "Karachi Coastal Observatory", "city": "Karachi", "province": "Sindh", "lat": 24.8607, "lon": 67.0011, "base_temp": 28.5, "base_humidity": 68.0, "base_rain_prob": 0.08},
    {"id": "STA-LHE-02", "name": "Lahore Urban Center Station", "city": "Lahore", "province": "Punjab", "lat": 31.5204, "lon": 74.3587, "base_temp": 25.0, "base_humidity": 55.0, "base_rain_prob": 0.12},
    {"id": "STA-ISB-03", "name": "Islamabad Margalla Foothills Radar", "city": "Islamabad", "province": "Islamabad Capital Territory", "lat": 33.6844, "lon": 73.0479, "base_temp": 20.5, "base_humidity": 50.0, "base_rain_prob": 0.18},
    {"id": "STA-PEW-04", "name": "Peshawar Valley Meteorological Station", "city": "Peshawar", "province": "Khyber Pakhtunkhwa", "lat": 34.0151, "lon": 71.5249, "base_temp": 22.8, "base_humidity": 48.0, "base_rain_prob": 0.14},
    {"id": "STA-UET-05", "name": "Quetta Chiltan Highland Observatory", "city": "Quetta", "province": "Balochistan", "lat": 30.1798, "lon": 66.9750, "base_temp": 15.5, "base_humidity": 32.0, "base_rain_prob": 0.09},
    {"id": "STA-MUX-06", "name": "Multan Solar Heat & Agri Monitor", "city": "Multan", "province": "Punjab", "lat": 30.1575, "lon": 71.5249, "base_temp": 27.5, "base_humidity": 45.0, "base_rain_prob": 0.07},
    {"id": "STA-LYP-07", "name": "Faisalabad Industrial Belt Sensor", "city": "Faisalabad", "province": "Punjab", "lat": 31.4504, "lon": 73.1350, "base_temp": 25.2, "base_humidity": 52.0, "base_rain_prob": 0.10},
    {"id": "STA-GWD-08", "name": "Gwadar Deep Sea Maritime Radar", "city": "Gwadar", "province": "Balochistan", "lat": 25.1216, "lon": 62.3254, "base_temp": 27.0, "base_humidity": 72.0, "base_rain_prob": 0.05},
    {"id": "STA-GIL-09", "name": "Gilgit Karakoram Base Station", "city": "Gilgit", "province": "Gilgit-Baltistan", "lat": 35.9221, "lon": 74.3087, "base_temp": 14.0, "base_humidity": 40.0, "base_rain_prob": 0.11},
    {"id": "STA-KDU-10", "name": "Skardu High-Altitude Glacier Post", "city": "Skardu", "province": "Gilgit-Baltistan", "lat": 35.2971, "lon": 75.6333, "base_temp": 9.5, "base_humidity": 45.0, "base_rain_prob": 0.15},
    {"id": "STA-MFD-11", "name": "Muzaffarabad Neelum Basin Station", "city": "Muzaffarabad", "province": "Azad Jammu & Kashmir", "lat": 34.3700, "lon": 73.4711, "base_temp": 19.5, "base_humidity": 62.0, "base_rain_prob": 0.22},
    {"id": "STA-SKZ-12", "name": "Sukkur Indus Barrage Observatory", "city": "Sukkur", "province": "Sindh", "lat": 27.7052, "lon": 68.8574, "base_temp": 29.0, "base_humidity": 46.0, "base_rain_prob": 0.06},
]

class ClimateStreamManager:
    def __init__(self, buffer_size=50):
        self.buffer = deque(maxlen=buffer_size)
        self.is_running = False
        self.interval = 3.0
        self.thread = None
        self.stop_event = threading.Event()
        self.total_packets = 0
        self.start_time = None
        self._lock = threading.Lock()

    def generate_packet(self, station=None):
        """Generates a realistic telemetry sensor reading packet"""
        if not station:
            station = random.choice(STATIONS)

        now = datetime.now(timezone.utc)
        date_str = now.strftime("%Y-%m-%d")
        time_str = now.strftime("%H:%M:%S")

        # Fluctuate around realistic city bases
        temp_delta = random.uniform(-2.5, 2.5)
        avg_temp = round(station["base_temp"] + temp_delta, 2)
        min_temp = round(avg_temp - random.uniform(2.0, 5.0), 2)
        max_temp = round(avg_temp + random.uniform(2.0, 5.0), 2)
        
        # Rainfall probability check
        if random.random() < station["base_rain_prob"]:
            rainfall = round(random.exponential(scale=6.0) if hasattr(random, "exponential") else random.uniform(0.5, 25.0), 2)
            humidity = round(min(98.0, station["base_humidity"] + random.uniform(15.0, 30.0)), 1)
        else:
            rainfall = 0.0
            humidity = round(max(20.0, min(95.0, station["base_humidity"] + random.uniform(-10.0, 10.0))), 1)

        pressure = round(random.uniform(1008.0, 1018.0), 1)
        wind_speed = round(random.uniform(5.0, 32.0), 1)
        wind_direction = random.choice(["N", "NE", "E", "SE", "S", "SW", "W", "NW"])
        aqi = random.randint(45, 185)

        packet = {
            "packet_id": f"PKT-{int(time.time() * 1000)}-{random.randint(100, 999)}",
            "station_id": station["id"],
            "station_name": station["name"],
            "location": station["city"],
            "date": date_str,
            "timestamp": now.isoformat(),
            "time_display": time_str,
            "avg_temp_c": avg_temp,
            "min_temp_c": min_temp,
            "max_temp_c": max_temp,
            "rainfall_mm": rainfall,
            "humidity_pct": humidity,
            "pressure_hpa": pressure,
            "wind_speed_kmh": wind_speed,
            "wind_direction": wind_direction,
            "aqi": aqi,
            "source": "LIVE_STREAM_SENSOR"
        }

        # Store in MongoDB climate_readings collection
        try:
            mongo_doc = {
                "date": date_str,
                "location": station["city"],
                "avg_temp_c": avg_temp,
                "min_temp_c": min_temp,
                "max_temp_c": max_temp,
                "rainfall_mm": rainfall,
                "humidity_pct": humidity,
                "pressure_hpa": pressure,
                "wind_speed_kmh": wind_speed,
                "source": "LIVE_STREAM_SENSOR",
                "ingested_at": now.isoformat()
            }
            readings_col.insert_one(mongo_doc)
        except Exception as e:
            pass

        # Evaluate reading for real-time alerts
        try:
            from alerts import evaluate_reading
            evaluate_reading(packet)
        except Exception:
            pass

        with self._lock:
            self.buffer.append(packet)
            self.total_packets += 1

        return packet

    def _worker(self):
        """Worker thread loop emitting packets at configured interval"""
        while not self.stop_event.is_set():
            self.generate_packet()
            self.stop_event.wait(self.interval)

    def start(self, interval=3.0):
        if self.is_running:
            return
        self.interval = max(0.5, float(interval))
        self.is_running = True
        self.start_time = time.time()
        self.stop_event.clear()
        self.thread = threading.Thread(target=self._worker, daemon=True)
        self.thread.start()

    def stop(self):
        if not self.is_running:
            return
        self.is_running = False
        self.stop_event.set()
        if self.thread and self.thread.is_alive():
            self.thread.join(timeout=1.0)
        self.thread = None

    def get_status(self):
        with self._lock:
            latest = self.buffer[-1] if self.buffer else None
            uptime_sec = round(time.time() - self.start_time, 1) if (self.is_running and self.start_time) else 0
            throughput = round((self.total_packets / uptime_sec) * 60, 1) if uptime_sec > 0 else 0
            return {
                "is_running": self.is_running,
                "interval_sec": self.interval,
                "total_packets": self.total_packets,
                "uptime_sec": uptime_sec,
                "throughput_per_min": throughput,
                "active_stations": STATIONS,
                "buffer_count": len(self.buffer),
                "latest_packet": latest
            }

    def get_feed(self, limit=30):
        with self._lock:
            packets = list(self.buffer)
            return packets[-limit:]

stream_manager = ClimateStreamManager()


# ── Blueprint Routes ───────────────────────────────────────────────────────────

@stream_bp.route("/status", methods=["GET"])
def get_stream_status():
    """Returns telemetry of the climate streaming engine"""
    return jsonify(stream_manager.get_status())


@stream_bp.route("/start", methods=["POST"])
def start_stream():
    """Starts the real-time background streaming generator"""
    data = request.get_json(silent=True) or {}
    interval = data.get("interval", 3.0)
    stream_manager.start(interval=interval)
    return jsonify({"message": "Stream started", "status": stream_manager.get_status()})


@stream_bp.route("/stop", methods=["POST"])
def stop_stream():
    """Pauses the real-time streaming generator"""
    stream_manager.stop()
    return jsonify({"message": "Stream stopped", "status": stream_manager.get_status()})


@stream_bp.route("/emit", methods=["POST"])
def emit_single():
    """Injects a single reading immediately for testing"""
    packet = stream_manager.generate_packet()
    return jsonify({"message": "Packet emitted", "packet": packet})


@stream_bp.route("/feed", methods=["GET"])
def get_stream_feed():
    """Returns recent live packets buffered in memory"""
    limit = int(request.args.get("limit", 30))
    return jsonify({
        "status": stream_manager.get_status(),
        "feed": stream_manager.get_feed(limit)
    })


@stream_bp.route("/events")
def stream_events():
    """Server-Sent Events (SSE) stream for continuous browser consumption"""
    def event_stream():
        while True:
            packet = stream_manager.generate_packet()
            import json
            yield f"data: {json.dumps(packet)}\n\n"
            time.sleep(stream_manager.interval)

    return Response(event_stream(), mimetype="text/event-stream")
