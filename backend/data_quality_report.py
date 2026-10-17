
from collections import Counter
from pymongo import MongoClient
from pymongo.errors import PyMongoError

FIELDS = [
    "avg_temp_c",
    "min_temp_c",
    "max_temp_c",
    "rainfall_mm",
    "humidity_pct",
]

client = MongoClient(
    "mongodb://localhost:27017",
    serverSelectionTimeoutMS=3000,
)

try:
    client.admin.command("ping")
    readings = client["earthscape_climate"]["climate_readings"]

    print("\n=== EARTHSCAPE DATA QUALITY REPORT ===")

    for source in ["NASA POWER", "sample_test_dataset"]:
        records = list(readings.find({"source": source}, {"_id": 0}))

        if not records:
            print(f"\n{source}: no records found")
            continue

        print(f"\nSource: {source}")
        print(f"Total records: {len(records)}")

        for field in FIELDS:
            missing = sum(
                record.get(field) is None
                or record.get(field) == ""
                for record in records
            )

            percentage = missing / len(records) * 100

            print(
                f"  {field}: {missing} missing "
                f"({percentage:.2f}%)"
            )

        locations = Counter(
            record.get("location", "Unknown")
            for record in records
        )
        print("Locations:", dict(locations))

    print("\nReport complete. No records were changed.")

except PyMongoError as error:
    print(f"MongoDB error: {error}")

finally:
    client.close()
