
from collections import Counter
from pymongo import MongoClient
from pymongo.errors import PyMongoError

client = MongoClient(
    "mongodb://localhost:27017",
    serverSelectionTimeoutMS=3000
)

try:
    db = client["earthscape_climate"]
    readings = db["climate_readings"]

    client.admin.command("ping")
    records = list(readings.find({}, {"_id": 0}))

    print("\n=== EARTHSCAPE DATA QUALITY AUDIT ===")
    print(f"Total records: {len(records)}")

    sources = Counter(
        record.get("source", "MISSING")
        for record in records
    )
    print("\nRecords by source:")
    for source, count in sources.items():
        print(f"  {source}: {count}")

    locations = Counter(
        record.get("location", "MISSING")
        for record in records
    )
    print("\nRecords by location:")
    for location, count in locations.items():
        print(f"  {location}: {count}")

    dates = [
        record["date"]
        for record in records
        if record.get("date")
    ]

    if dates:
        print(f"\nEarliest date: {min(dates)}")
        print(f"Latest date:   {max(dates)}")

    fields = [
        "avg_temp_c",
        "min_temp_c",
        "max_temp_c",
        "rainfall_mm",
        "humidity_pct",
    ]

    print("\nMissing values by field:")
    for field in fields:
        missing = sum(
            record.get(field) is None
            or record.get(field) == ""
            for record in records
        )
        print(f"  {field}: {missing}")

    print("\nAudit completed. No records were changed.")

except PyMongoError as error:
    print(f"MongoDB error: {error}")

finally:
    client.close()
