"""
EarthScape Climate Agency — Hadoop MapReduce Execution Engine
=============================================================
Orchestrates Hadoop MapReduce jobs:
  1. Monthly Climate Aggregation Job (mapper_monthly.py + reducer_monthly.py)
  2. Extreme Weather Pattern Job     (mapper_extremes.py + reducer_extremes.py)

Emulates the Hadoop MapReduce YARN execution framework:
- Job ID generation: job_TIMESTAMP_NNNN
- Map phase telemetry & progress tracking
- Shuffle & Sort phase with key partitioning
- Reduce phase aggregation
- Commit of part-00000 to simulated HDFS output path
- Storage of Hadoop Counters (bytes read/written, records mapped/reduced)
"""

import os
import sys
import time
import json
import subprocess
from datetime import datetime
from pathlib import Path
from .hdfs_simulator import HDFSSimulator, HDFS_ROOT

BASE_DIR = Path(__file__).resolve().parent.parent.parent
HADOOP_DIR = BASE_DIR / "backend" / "hadoop"
JOBS_HISTORY_FILE = HDFS_ROOT / "system" / "jobs_history.json"

class HadoopRunner:
    def __init__(self):
        self.hdfs = HDFSSimulator()
        self._ensure_history_file()

    def _ensure_history_file(self):
        JOBS_HISTORY_FILE.parent.mkdir(parents=True, exist_ok=True)
        if not JOBS_HISTORY_FILE.exists():
            with open(JOBS_HISTORY_FILE, "w", encoding="utf-8") as f:
                json.dump([], f)

    def get_job_history(self):
        try:
            with open(JOBS_HISTORY_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return []

    def _save_job_history(self, job_meta):
        history = self.get_job_history()
        history.insert(0, job_meta)
        # Keep last 20 jobs
        history = history[:20]
        with open(JOBS_HISTORY_FILE, "w", encoding="utf-8") as f:
            json.dump(history, f, indent=2)

    def run_mapreduce_job(self, job_type="monthly", city_filter="ALL"):
        """
        Executes a Hadoop Streaming MapReduce pipeline:
        STDIN -> Mapper -> Sort (Shuffle) -> Reducer -> STDOUT -> HDFS part-00000
        """
        job_id = f"job_{int(time.time() * 1000)}_00{len(self.get_job_history()) + 1}"
        start_total = time.time()

        # Determine scripts & paths
        if job_type == "extremes":
            job_name = "Climate Extremes & Outlier Aggregation"
            mapper_script = HADOOP_DIR / "mapper_extremes.py"
            reducer_script = HADOOP_DIR / "reducer_extremes.py"
            hdfs_output_dir = self.hdfs.root / "user" / "hadoop" / "climate" / "output" / "climate_extremes"
        else:
            job_type = "monthly"
            job_name = "Monthly Climate Metrics Aggregation"
            mapper_script = HADOOP_DIR / "mapper_monthly.py"
            reducer_script = HADOOP_DIR / "reducer_monthly.py"
            hdfs_output_dir = self.hdfs.root / "user" / "hadoop" / "climate" / "output" / "monthly_summary"

        hdfs_output_dir.mkdir(parents=True, exist_ok=True)
        part_file = hdfs_output_dir / "part-00000"
        success_file = hdfs_output_dir / "_SUCCESS"

        # Determine Input: either raw or partitioned by city
        if city_filter != "ALL" and city_filter in ["Karachi", "Lahore", "Islamabad"]:
            input_file = self.hdfs.root / "user" / "hadoop" / "climate" / "partitioned" / city_filter / "data.csv"
            input_hdfs_path = f"/user/hadoop/climate/partitioned/{city_filter}/data.csv"
        else:
            input_file = self.hdfs.root / "user" / "hadoop" / "climate" / "raw" / "climate_historical.csv"
            input_hdfs_path = "/user/hadoop/climate/raw/climate_historical.csv"

        if not input_file.exists():
            self.hdfs.initialize_hdfs_data()

        with open(input_file, "r", encoding="utf-8") as f:
            raw_input_lines = f.readlines()

        bytes_read = sum(len(line.encode("utf-8")) for line in raw_input_lines)
        map_input_records = max(0, len(raw_input_lines) - 1) # excluding header

        # --- Phase 1: MAP ---
        map_start = time.time()
        py_exec = sys.executable
        
        map_process = subprocess.Popen(
            [py_exec, str(mapper_script)],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        map_out, map_err = map_process.communicate(input="".join(raw_input_lines))
        map_ms = round((time.time() - map_start) * 1000, 2)
        
        map_lines = [l for l in map_out.splitlines() if l.strip()]
        map_output_records = len(map_lines)

        # --- Phase 2: SHUFFLE & SORT ---
        shuffle_start = time.time()
        # In Hadoop, intermediate keys are sorted lexicographically
        sorted_map_lines = sorted(map_lines)
        shuffle_ms = round((time.time() - shuffle_start) * 1000, 2)

        # --- Phase 3: REDUCE ---
        reduce_start = time.time()
        reduce_process = subprocess.Popen(
            [py_exec, str(reducer_script)],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        reduce_out, reduce_err = reduce_process.communicate(input="\n".join(sorted_map_lines) + "\n")
        reduce_ms = round((time.time() - reduce_start) * 1000, 2)

        reduce_lines = [l for l in reduce_out.splitlines() if l.strip()]
        reduce_output_records = len(reduce_lines)

        total_ms = round((time.time() - start_total) * 1000, 2)

        # Write part-00000 and _SUCCESS in HDFS
        with open(part_file, "w", encoding="utf-8") as fpart:
            fpart.write(reduce_out)
        with open(success_file, "w", encoding="utf-8") as fsucc:
            fsucc.write("")

        bytes_written = len(reduce_out.encode("utf-8"))

        job_meta = {
            "job_id": job_id,
            "job_name": job_name,
            "job_type": job_type,
            "city_filter": city_filter,
            "status": "SUCCEEDED",
            "submitted_at": datetime.utcnow().isoformat() + "Z",
            "input_path": input_hdfs_path,
            "output_path": f"/user/hadoop/climate/output/{hdfs_output_dir.name}/part-00000",
            "execution_phases": {
                "map_phase_ms": map_ms,
                "shuffle_sort_ms": shuffle_ms,
                "reduce_phase_ms": reduce_ms,
                "total_duration_ms": total_ms
            },
            "counters": {
                "FILE_BYTES_READ": bytes_read,
                "FILE_BYTES_WRITTEN": bytes_written,
                "MAP_INPUT_RECORDS": map_input_records,
                "MAP_OUTPUT_RECORDS": map_output_records,
                "REDUCE_INPUT_RECORDS": map_output_records,
                "REDUCE_OUTPUT_RECORDS": reduce_output_records,
                "MAP_SLOTS_USED": 3,
                "REDUCE_SLOTS_USED": 1,
                "DATANODES_INVOLVED": 3
            }
        }

        self._save_job_history(job_meta)
        return {
            "job": job_meta,
            "results": self.parse_results(job_type, reduce_out)
        }

    def parse_results(self, job_type, raw_text=None):
        """Parses the part-00000 tab-separated file into clean JSON objects"""
        if raw_text is None:
            if job_type == "extremes":
                target = self.hdfs.root / "user" / "hadoop" / "climate" / "output" / "climate_extremes" / "part-00000"
            else:
                target = self.hdfs.root / "user" / "hadoop" / "climate" / "output" / "monthly_summary" / "part-00000"
            if not target.exists():
                return []
            with open(target, "r", encoding="utf-8") as f:
                raw_text = f.read()

        results = []
        for line in raw_text.splitlines():
            line = line.strip()
            if not line:
                continue
            parts = line.split("\t")
            if job_type == "extremes":
                # {city}\t{max_recorded_temp}\t{min_recorded_temp}\t{max_rainfall}\t{heatwave_days}\t{cold_snap_days}\t{heavy_rain_days}\t{total_days}
                if len(parts) >= 8:
                    results.append({
                        "city": parts[0],
                        "max_temp": float(parts[1]),
                        "min_temp": float(parts[2]),
                        "max_rainfall": float(parts[3]),
                        "heatwave_days": int(parts[4]),
                        "cold_snap_days": int(parts[5]),
                        "heavy_rain_days": int(parts[6]),
                        "total_days": int(parts[7])
                    })
            else:
                # {location}\t{month}\t{avg_temp}\t{total_rainfall}\t{rainy_days}\t{avg_humidity}\t{count}
                if len(parts) >= 7:
                    results.append({
                        "city": parts[0],
                        "month": parts[1],
                        "avg_temp": float(parts[2]),
                        "total_rainfall": float(parts[3]),
                        "rainy_days": int(parts[4]),
                        "avg_humidity": float(parts[5]),
                        "record_count": int(parts[6])
                    })
        return results

    def get_source_code(self, script_name):
        """Returns the source code of mapper or reducer for the in-app code viewer"""
        valid_scripts = {
            "mapper_monthly": HADOOP_DIR / "mapper_monthly.py",
            "reducer_monthly": HADOOP_DIR / "reducer_monthly.py",
            "mapper_extremes": HADOOP_DIR / "mapper_extremes.py",
            "reducer_extremes": HADOOP_DIR / "reducer_extremes.py",
            "hdfs_simulator": HADOOP_DIR / "hdfs_simulator.py"
        }
        target = valid_scripts.get(script_name)
        if target and target.exists():
            with open(target, "r", encoding="utf-8") as f:
                return f.read()
        return "# Script not found"
