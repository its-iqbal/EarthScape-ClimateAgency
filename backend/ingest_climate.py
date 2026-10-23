
import csv
from datetime import date
from pathlib import Path

from pymongo import MongoClient

# Find the project folder automatically
PROJECT_DIR = Path(__file__).resolve().parent.parent
CSV_FILE = PROJECT_DIR / "data" / "climate_historical.csv"

# Connect to MongoDB
client = MongoClient(
    "mongodb://localhost:27017",
    serverSelectionTimeoutMS=3000
)

db = client["earthscape_climate"]
readings = db["climate_readings"]

REQUIRED_COLUMNS = {
    "date",
    "location",
    "avg_temp_c",
    "min_temp_c",
    "max_temp_c",
    "rainfall_mm",
    "humidity_pct",
}


def parse_number(value, column_name, row_number):
    """Convert a CSV value to a number, or None if it is empty."""
    if value is None:
        return None

    value = value.strip()

    if value == "":
        return None

    try:
        number = float(value)
    except ValueError:
        raise ValueError(
            f"Invalid number in '{column_name}' on CSV row {row_number}"
        )

    if column_name == "humidity_pct" and not 0 <= number <= 100:
        raise ValueError(
            f"Humidity must be between 0 and 100 on row {row_number}"
        )

    if column_name == "rainfall_mm" and number < 0:
        raise ValueError(
            f"Rainfall cannot be negative on row {row_number}"
        )

    return number


def main():
    if not CSV_FILE.exists():
        print(f"CSV file not found: {CSV_FILE}")
        return

    client.admin.command("ping")

    # Prevent duplicate records for the same date and location
    readings.create_index(
        [("date", 1), ("location", 1)],
        unique=True
    )

    processed = 0
    skipped = 0

    with CSV_FILE.open("r", encoding="utf-8-sig", newline="") as file:
        reader = csv.DictReader(file)

        if not reader.fieldnames:
            print("The CSV file is empty.")
            return

        missing_columns = REQUIRED_COLUMNS - set(reader.fieldnames)

        if missing_columns:
            print("Missing CSV columns:", ", ".join(sorted(missing_columns)))
            return

        for row_number, row in enumerate(reader, start=2):
            try:
                record_date = date.fromisoformat(row["date"].strip())
                location = row["location"].strip()

                if not location:
                    raise ValueError("Location cannot be empty")

                avg_temp = parse_number(
                    row["avg_temp_c"], "avg_temp_c", row_number
                )
                min_temp = parse_number(
                    row["min_temp_c"], "min_temp_c", row_number
                )
                max_temp = parse_number(
                    row["max_temp_c"], "max_temp_c", row_number
                )
                rainfall = parse_number(
                    row["rainfall_mm"], "rainfall_mm", row_number
                )
                humidity = parse_number(
                    row["humidity_pct"], "humidity_pct", row_number
                )

                if (
                    min_temp is not None
                    and max_temp is not None
                    and min_temp > max_temp
                ):
                    raise ValueError(
                        f"Minimum temperature exceeds maximum on row {row_number}"
                    )

                record = {
                    "date": record_date.isoformat(),
                    "location": location,
                    "province": row.get("province", "").strip() or "Pakistan",
                    "lat": float(row["lat"]) if row.get("lat") else None,
                    "lon": float(row["lon"]) if row.get("lon") else None,
                    "avg_temp_c": avg_temp,
                    "min_temp_c": min_temp,
                    "max_temp_c": max_temp,
                    "rainfall_mm": rainfall,
                    "humidity_pct": humidity,
                    "wind_speed_kmh": float(row["wind_speed_kmh"]) if row.get("wind_speed_kmh") else 12.0,
                    "aqi": int(row["aqi"]) if row.get("aqi") else 100,
                    "source": (
                        row.get("source", "").strip()
                        or "NASA POWER"
                    ),
                }

                readings.replace_one(
                    {
                        "date": record["date"],
                        "location": record["location"],
                    },
                    record,
                    upsert=True,
                )

                processed += 1

            except (ValueError, TypeError) as error:
                skipped += 1
                print(f"Skipping CSV row {row_number}: {error}")

    print("\nClimate data ingestion complete!")
    print(f"Records processed: {processed}")
    print(f"Rows skipped: {skipped}")
    print(f"Records currently in MongoDB: {readings.count_documents({})}")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"Error: {error}")
    finally:
        client.close()
