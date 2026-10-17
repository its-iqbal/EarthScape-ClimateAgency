#!/usr/bin/env python3
"""
Hadoop Streaming Mapper: Climate Extremes & Outliers
=====================================================
Input: CSV rows from STDIN (date,location,avg_temp_c,min_temp_c,max_temp_c,rainfall_mm,humidity_pct,source)
Output: Tab-delimited key-value pairs to STDOUT
  Key:   {location}
  Value: {avg_temp}\t{min_temp}\t{max_temp}\t{rainfall}\t{humidity}
"""

import sys

def mapper():
    for line in sys.stdin:
        line = line.strip()
        if not line or line.startswith("date,"):
            continue
            
        parts = line.split(",")
        if len(parts) < 7:
            continue
            
        try:
            location = parts[1].strip()
            avg_temp = float(parts[2].strip())
            min_temp = float(parts[3].strip())
            max_temp = float(parts[4].strip())
            rainfall = float(parts[5].strip())
            humidity = float(parts[6].strip())
            
            print(f"{location}\t{avg_temp}\t{min_temp}\t{max_temp}\t{rainfall}\t{humidity}")
        except (ValueError, IndexError):
            continue

if __name__ == "__main__":
    mapper()
