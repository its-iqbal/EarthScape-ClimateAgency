#!/usr/bin/env python3
"""
Hadoop Streaming Reducer: Monthly Climate Aggregation
======================================================
Input: Sorted tab-delimited key-value pairs from STDIN
  Format: {location}\t{month}\t{avg_temp}\t{rainfall}\t{humidity}\t1
Output: Aggregated metrics to STDOUT
  Format: {location}\t{month}\t{avg_temp:.2f}\t{total_rainfall:.2f}\t{rainy_days}\t{avg_humidity:.2f}\t{count}
"""

import sys

def reducer():
    current_key = None
    sum_temp = 0.0
    sum_rainfall = 0.0
    sum_humidity = 0.0
    rainy_days = 0
    count = 0

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
            
        parts = line.split("\t")
        if len(parts) < 6:
            continue
            
        location = parts[0]
        month = parts[1]
        key = f"{location}\t{month}"
        
        try:
            temp = float(parts[2])
            rainfall = float(parts[3])
            humidity = float(parts[4])
            weight = int(parts[5])
        except ValueError:
            continue

        if current_key and current_key != key:
            # Emit aggregated metrics for previous key
            avg_temp = sum_temp / count if count > 0 else 0.0
            avg_humidity = sum_humidity / count if count > 0 else 0.0
            print(f"{current_key}\t{avg_temp:.2f}\t{sum_rainfall:.2f}\t{rainy_days}\t{avg_humidity:.2f}\t{count}")
            
            # Reset accumulators for new key
            sum_temp = 0.0
            sum_rainfall = 0.0
            sum_humidity = 0.0
            rainy_days = 0
            count = 0

        current_key = key
        sum_temp += temp
        sum_rainfall += rainfall
        sum_humidity += humidity
        if rainfall >= 0.1:
            rainy_days += 1
        count += weight

    # Emit the last key
    if current_key and count > 0:
        avg_temp = sum_temp / count
        avg_humidity = sum_humidity / count
        print(f"{current_key}\t{avg_temp:.2f}\t{sum_rainfall:.2f}\t{rainy_days}\t{avg_humidity:.2f}\t{count}")

if __name__ == "__main__":
    reducer()
