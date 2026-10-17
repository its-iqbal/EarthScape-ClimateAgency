#!/usr/bin/env python3
"""
Hadoop Streaming Reducer: Climate Extremes & Outliers
======================================================
Input: Sorted tab-delimited key-value pairs from STDIN
  Format: {location}\t{avg_temp}\t{min_temp}\t{max_temp}\t{rainfall}\t{humidity}
Output: City Extremes Summary to STDOUT
  Format: {location}\t{max_recorded_temp:.2f}\t{min_recorded_temp:.2f}\t{max_rainfall:.2f}\t{heatwave_days}\t{cold_snap_days}\t{heavy_rain_days}\t{total_days}
"""

import sys

def reducer():
    current_city = None
    max_temp = -999.0
    min_temp = 999.0
    max_rain = 0.0
    heatwave_days = 0  # max_temp >= 38°C
    cold_snap_days = 0 # min_temp <= 8°C
    heavy_rain_days = 0 # rainfall >= 25mm
    total_days = 0

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
            
        parts = line.split("\t")
        if len(parts) < 6:
            continue
            
        city = parts[0]
        try:
            avg_t = float(parts[1])
            min_t = float(parts[2])
            max_t = float(parts[3])
            rain = float(parts[4])
            hum = float(parts[5])
        except ValueError:
            continue

        if current_city and current_city != city:
            print(f"{current_city}\t{max_temp:.2f}\t{min_temp:.2f}\t{max_rain:.2f}\t{heatwave_days}\t{cold_snap_days}\t{heavy_rain_days}\t{total_days}")
            max_temp = -999.0
            min_temp = 999.0
            max_rain = 0.0
            heatwave_days = 0
            cold_snap_days = 0
            heavy_rain_days = 0
            total_days = 0

        current_city = city
        total_days += 1
        if max_t > max_temp:
            max_temp = max_t
        if min_t < min_temp:
            min_temp = min_t
        if rain > max_rain:
            max_rain = rain
        if max_t >= 38.0:
            heatwave_days += 1
        if min_t <= 8.0:
            cold_snap_days += 1
        if rain >= 25.0:
            heavy_rain_days += 1

    if current_city and total_days > 0:
        print(f"{current_city}\t{max_temp:.2f}\t{min_temp:.2f}\t{max_rain:.2f}\t{heatwave_days}\t{cold_snap_days}\t{heavy_rain_days}\t{total_days}")

if __name__ == "__main__":
    reducer()
