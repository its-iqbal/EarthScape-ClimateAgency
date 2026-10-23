
from math import sqrt
from statistics import mean, pstdev

from pymongo import MongoClient
from pymongo.errors import PyMongoError

MONGO_URI = "mongodb://localhost:27017"
DATABASE = "earthscape_climate"
COLLECTION = "climate_readings"


def numeric_values(records, field):
    """Return valid numeric values without inventing missing data."""
    values = []

    for record in records:
        value = record.get(field)

        if isinstance(value, (int, float)) and not isinstance(value, bool):
            values.append(float(value))

    return values


def pearson_correlation(x_values, y_values):
    """Calculate Pearson correlation for paired observations."""
    if len(x_values) != len(y_values) or len(x_values) < 2:
        return None

    x_mean = mean(x_values)
    y_mean = mean(y_values)

    x_diff = [value - x_mean for value in x_values]
    y_diff = [value - y_mean for value in y_values]

    x_sd = sqrt(sum(value ** 2 for value in x_diff))
    y_sd = sqrt(sum(value ** 2 for value in y_diff))

    if x_sd == 0 or y_sd == 0:
        return None

    numerator = sum(
        x * y for x, y in zip(x_diff, y_diff)
    )

    return numerator / (x_sd * y_sd)


def main():
    client = MongoClient(
        MONGO_URI,
        serverSelectionTimeoutMS=3000,
    )

    try:
        client.admin.command("ping")

        readings = client[DATABASE][COLLECTION]

        # Analyze the historical source separately from test data.
        records = list(
            readings.find(
                {"source": {"$ne": "LIVE_STREAM_SENSOR"}},
                {"_id": 0},
            ).sort([("location", 1), ("date", 1)])
        )

        if not records:
            print("No historical climate records found.")
            return

        print("\n=== EARTHSCAPE CLIMATE ANALYTICS ===")
        print(f"Historical records analyzed: {len(records)}")

        locations = sorted({
            record["location"]
            for record in records
            if record.get("location")
        })

        for location in locations:
            city_records = [
                record for record in records
                if record.get("location") == location
            ]

            temperatures = numeric_values(
                city_records, "avg_temp_c"
            )
            rainfall = numeric_values(
                city_records, "rainfall_mm"
            )
            humidity = numeric_values(
                city_records, "humidity_pct"
            )

            print(f"\n--- {location} ---")
            print(f"Records: {len(city_records)}")

            if temperatures:
                print(
                    "Average temperature: "
                    f"{mean(temperatures):.2f} °C"
                )
                print(
                    "Lowest recorded daily average: "
                    f"{min(temperatures):.2f} °C"
                )
                print(
                    "Highest recorded daily average: "
                    f"{max(temperatures):.2f} °C"
                )

                # A preliminary statistical anomaly flag:
                # more than 3 population standard deviations
                # from the city's 2024 mean.
                if len(temperatures) > 1:
                    center = mean(temperatures)
                    spread = pstdev(temperatures)

                    flagged = [
                        record for record in city_records
                        if isinstance(
                            record.get("avg_temp_c"),
                            (int, float),
                        )
                        and spread > 0
                        and abs(
                            record["avg_temp_c"] - center
                        ) > 3 * spread
                    ]

                    print(
                        "Preliminary temperature anomalies "
                        f"(3-standard-deviation rule): {len(flagged)}"
                    )

                    for record in flagged[:5]:
                        print(
                            f"  {record['date']}: "
                            f"{record['avg_temp_c']:.2f} °C"
                        )

            if rainfall:
                print(
                    "Average daily rainfall: "
                    f"{mean(rainfall):.2f} mm"
                )
                print(
                    "Days with recorded rainfall > 0: "
                    f"{sum(value > 0 for value in rainfall)}"
                )

            if humidity:
                print(
                    "Average humidity: "
                    f"{mean(humidity):.2f}%"
                )

            paired_records = [
                record for record in city_records
                if isinstance(record.get("avg_temp_c"), (int, float))
                and isinstance(record.get("humidity_pct"), (int, float))
            ]

            correlation = pearson_correlation(
                [record["avg_temp_c"] for record in paired_records],
                [record["humidity_pct"] for record in paired_records],
            )

            if correlation is not None:
                print(
                    "Temperature/humidity Pearson correlation: "
                    f"{correlation:.3f}"
                )
            else:
                print(
                    "Temperature/humidity correlation: "
                    "not enough variation or paired data"
                )

        print("\nAnalytics completed. Database was not modified.")

    except PyMongoError as error:
        print(f"MongoDB error: {error}")

    finally:
        client.close()


if __name__ == "__main__":
    main()
