
import csv
import json
import time
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

PROJECT_DIR = Path(__file__).resolve().parent.parent
OUTPUT_FILE = PROJECT_DIR / "data" / "climate_historical.csv"

# Approximate coordinates for each city
CITIES = {
    "Karachi": {"latitude": 24.8607, "longitude": 67.0011},
    "Lahore": {"latitude": 31.5204, "longitude": 74.3587},
    "Islamabad": {"latitude": 33.6844, "longitude": 73.0479},
}

START_DATE = "20240101"
END_DATE = "20241231"

PARAMETERS = [
    "T2M",
    "T2M_MAX",
    "T2M_MIN",
    "RH2M",
    "PRECTOTCORR",
]

BASE_URL = (
    "https://power.larc.nasa.gov/api/temporal/daily/point"
)

OUTPUT_COLUMNS = [
    "date",
    "location",
    "avg_temp_c",
    "min_temp_c",
    "max_temp_c",
    "rainfall_mm",
    "humidity_pct",
    "source",
]


def download_city(city, coordinates):
    params = {
        "parameters": ",".join(PARAMETERS),
        "community": "SB",
        "longitude": coordinates["longitude"],
        "latitude": coordinates["latitude"],
        "start": START_DATE,
        "end": END_DATE,
        "format": "JSON",
        "time-standard": "UTC",
    }

    url = f"{BASE_URL}?{urlencode(params)}"
    request = Request(
        url,
        headers={"User-Agent": "EarthScapeClimateAgency/1.0"},
    )

    print(f"Downloading historical data for {city}...")

    with urlopen(request, timeout=60) as response:
        payload = json.loads(response.read().decode("utf-8"))

    if "parameter" not in payload.get("properties", {}):
        print("NASA POWER response details:")
        print(json.dumps(payload, indent=2)[:4000])
        raise ValueError(
            f"NASA POWER returned an unexpected response for {city}"
        )

    parameters = payload["properties"]["parameter"]
    temperature = parameters["T2M"]
    maximum = parameters["T2M_MAX"]
    minimum = parameters["T2M_MIN"]
    humidity = parameters["RH2M"]
    rainfall = parameters["PRECTOTCORR"]

    rows = []

    for day in sorted(temperature):
        # NASA POWER can use -999 as a missing-data marker.
        def clean(value):
            if value is None or value == -999:
                return None
            return value

        rows.append({
            "date": (
                f"{day[:4]}-{day[4:6]}-{day[6:8]}"
            ),
            "location": city,
            "avg_temp_c": clean(temperature[day]),
            "min_temp_c": clean(minimum.get(day)),
            "max_temp_c": clean(maximum.get(day)),
            "rainfall_mm": clean(rainfall.get(day)),
            "humidity_pct": clean(humidity.get(day)),
            "source": "NASA POWER",
        })

    return rows


def main():
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    all_rows = []

    for index, (city, coordinates) in enumerate(CITIES.items()):
        if index > 0:
            time.sleep(1)

        all_rows.extend(download_city(city, coordinates))

    with OUTPUT_FILE.open(
        "w", encoding="utf-8", newline=""
    ) as file:
        writer = csv.DictWriter(file, fieldnames=OUTPUT_COLUMNS)
        writer.writeheader()
        writer.writerows(all_rows)

    print("\nDownload complete.")
    print(f"Cities: {len(CITIES)}")
    print(f"Records downloaded: {len(all_rows)}")
    print(f"Output file: {OUTPUT_FILE}")
    print("Source: NASA POWER")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"\nDownload failed: {error}")
        print("Check your internet connection and try again.")
