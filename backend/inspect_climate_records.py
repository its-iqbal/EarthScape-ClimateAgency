
from pprint import pprint
from pymongo import MongoClient
from pymongo.errors import PyMongoError

client = MongoClient(
    "mongodb://localhost:27017",
    serverSelectionTimeoutMS=3000
)

try:
    client.admin.command("ping")

    readings = client["earthscape_climate"]["climate_readings"]

    print("\n=== NASA POWER RECORD ===")
    nasa_record = readings.find_one(
        {"source": "NASA POWER"},
        {"_id": 0},
        sort=[("date", 1)]
    )
    pprint(nasa_record)

    print("\n=== TEST DATA RECORD ===")
    test_record = readings.find_one(
        {"source": "sample_test_dataset"},
        {"_id": 0},
        sort=[("date", 1)]
    )
    pprint(test_record)

except PyMongoError as error:
    print(f"MongoDB error: {error}")

finally:
    client.close()
