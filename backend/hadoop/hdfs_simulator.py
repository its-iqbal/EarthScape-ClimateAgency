"""
EarthScape Climate Agency — HDFS Simulation Layer
==================================================
Simulates a Hadoop Distributed File System (HDFS) architecture:
- NameNode metadata management (namespaces, blocks, replication)
- 3 simulated DataNodes (datanode-01, datanode-02, datanode-03)
- Partitioned storage: /user/hadoop/climate/raw, /user/hadoop/climate/partitioned/{location}
- Block replication factor = 3, block size = 64 MB
"""

import os
import csv
import json
import hashlib
from datetime import datetime
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
HDFS_ROOT = BASE_DIR / "hdfs_storage"

DATANODES = [
    {"id": "datanode-01", "host": "192.168.1.101:50010", "rack": "/rack-01", "status": "ONLINE", "capacity_gb": 500, "used_gb": 42.8},
    {"id": "datanode-02", "host": "192.168.1.102:50010", "rack": "/rack-01", "status": "ONLINE", "capacity_gb": 500, "used_gb": 41.5},
    {"id": "datanode-03", "host": "192.168.1.103:50010", "rack": "/rack-02", "status": "ONLINE", "capacity_gb": 500, "used_gb": 43.1},
]

class HDFSSimulator:
    def __init__(self, root_path=HDFS_ROOT):
        self.root = Path(root_path)
        self.namenode_host = "namenode-master:9000"
        self.replication_factor = 3
        self.block_size_mb = 64
        self._ensure_hdfs_structure()

    def _ensure_hdfs_structure(self):
        """Creates the HDFS folder hierarchy on local storage"""
        dirs = [
            self.root / "user" / "hadoop" / "climate" / "raw",
            self.root / "user" / "hadoop" / "climate" / "partitioned" / "Karachi",
            self.root / "user" / "hadoop" / "climate" / "partitioned" / "Lahore",
            self.root / "user" / "hadoop" / "climate" / "partitioned" / "Islamabad",
            self.root / "user" / "hadoop" / "climate" / "output" / "monthly_summary",
            self.root / "user" / "hadoop" / "climate" / "output" / "climate_extremes",
            self.root / "system" / "namenode_fsimage",
        ]
        for d in dirs:
            d.mkdir(parents=True, exist_ok=True)

    def initialize_hdfs_data(self, source_csv_path=None):
        """
        Uploads source CSV into HDFS raw area and partitions it across location subdirectories.
        Equivalent to:
          hdfs dfs -mkdir -p /user/hadoop/climate/raw
          hdfs dfs -put data/climate_historical.csv /user/hadoop/climate/raw/
        """
        if source_csv_path is None:
            source_csv_path = BASE_DIR / "data" / "climate_historical.csv"
        
        source_path = Path(source_csv_path)
        if not source_path.exists():
            return {"status": "error", "message": f"Source file {source_csv_path} not found"}

        # 1. Store raw CSV in HDFS raw path
        raw_target = self.root / "user" / "hadoop" / "climate" / "raw" / "climate_historical.csv"
        with open(source_path, "r", encoding="utf-8") as fin:
            content = fin.read()
        with open(raw_target, "w", encoding="utf-8") as fout:
            fout.write(content)

        # 2. Partition by location
        rows_by_city = {}
        reader = csv.DictReader(content.splitlines())
        fieldnames = reader.fieldnames

        for row in reader:
            loc = row.get("location", "Unknown").strip()
            if loc:
                rows_by_city.setdefault(loc, []).append(row)

        partition_stats = {}
        for city, rows in rows_by_city.items():
            city_dir = self.root / "user" / "hadoop" / "climate" / "partitioned" / city
            city_dir.mkdir(parents=True, exist_ok=True)
            part_file = city_dir / "data.csv"
            with open(part_file, "w", encoding="utf-8", newline="") as fout:
                writer = csv.DictWriter(fout, fieldnames=fieldnames)
                writer.writeheader()
                writer.writerows(rows)
            partition_stats[city] = {
                "records": len(rows),
                "hdfs_path": f"/user/hadoop/climate/partitioned/{city}/data.csv",
                "size_bytes": os.path.getsize(part_file)
            }

        # 3. Generate Block Metadata (NameNode fsimage simulation)
        file_hash = hashlib.md5(content.encode("utf-8")).hexdigest()
        blocks = [
            {
                "block_id": "blk_1073741825_1001",
                "pool_id": "BP-782419-127.0.0.1-1729112400000",
                "size_bytes": len(content.encode("utf-8")),
                "replicas": ["datanode-01", "datanode-02", "datanode-03"],
                "md5": file_hash,
                "status": "HEALTHY"
            }
        ]

        metadata = {
            "namenode": self.namenode_host,
            "hdfs_uri": "hdfs://namenode-master:9000/user/hadoop/climate/raw/climate_historical.csv",
            "created_at": datetime.utcnow().isoformat() + "Z",
            "file_size_bytes": len(content.encode("utf-8")),
            "blocks": blocks,
            "partitions": partition_stats,
            "total_records": sum(p["records"] for p in partition_stats.values())
        }

        fsimage_path = self.root / "system" / "namenode_fsimage" / "fsimage.json"
        with open(fsimage_path, "w", encoding="utf-8") as fmeta:
            json.dump(metadata, fmeta, indent=2)

        return metadata

    def get_cluster_status(self):
        """Returns comprehensive HDFS cluster status, datanodes, and file metadata"""
        fsimage_path = self.root / "system" / "namenode_fsimage" / "fsimage.json"
        if not fsimage_path.exists():
            metadata = self.initialize_hdfs_data()
        else:
            with open(fsimage_path, "r", encoding="utf-8") as fmeta:
                metadata = json.load(fmeta)

        total_cap_gb = sum(dn["capacity_gb"] for dn in DATANODES)
        total_used_gb = sum(dn["used_gb"] for dn in DATANODES)

        return {
            "cluster_id": "CID-e5c942-pakistan-climate-cluster",
            "namenode": {
                "host": self.namenode_host,
                "state": "ACTIVE",
                "version": "Hadoop 3.3.6 (Simulated Engine)",
                "uptime": "14 days, 6 hours",
                "block_size_mb": self.block_size_mb,
                "replication_factor": self.replication_factor,
            },
            "storage": {
                "total_capacity_gb": total_cap_gb,
                "used_capacity_gb": round(total_used_gb, 2),
                "remaining_capacity_gb": round(total_cap_gb - total_used_gb, 2),
                "used_percent": round((total_used_gb / total_cap_gb) * 100, 2),
                "health": "HEALTHY",
                "under_replicated_blocks": 0,
                "corrupt_blocks": 0,
            },
            "datanodes": DATANODES,
            "hdfs_tree": {
                "raw": {
                    "path": "/user/hadoop/climate/raw/climate_historical.csv",
                    "records": metadata.get("total_records", 1098),
                    "blocks": metadata.get("blocks", [])
                },
                "partitions": metadata.get("partitions", {}),
                "output": {
                    "monthly_summary": "/user/hadoop/climate/output/monthly_summary",
                    "climate_extremes": "/user/hadoop/climate/output/climate_extremes"
                }
            }
        }
