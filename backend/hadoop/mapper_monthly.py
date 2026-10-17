#!/usr/bin/env python3
"""
Hadoop Streaming Mapper: Monthly Climate Aggregation
=====================================================
Input: CSV rows from STDIN (date,location,avg_temp_c,min_temp_c,max_temp_c,rainfall_mm,humidity_pct,source)
Output: Tab-delimited key-value pairs to STDOUT
  Key:   {location}\t{YYYY-MM}
  Value: {avg_temp}\t{rainfall}\t{humidity}\t1
"""

import sys

def mapper():
    for line in sys.stdin:
        line = line.strip()
        if not line or line.startswith("date,"):
            continue  # Skip empty lines and header
        
        parts = line.split(",")
        if len(parts) < 7:
            continue
            
        try:
            date_str = parts[0].strip()
            location = parts[1].strip()
            avg_temp = float(parts[2].strip())
            rainfall = float(parts[5].strip())
            humidity = float(parts[6].strip())
            
            # Extract Year-Month (e.g. 2024-07)
            month = date_str[:7]
            
            # Emit composite key and values: location\tmonth -> avg_temp\trainfall\thumidity\t1
            print(f"{location}\t{month}\t{avg_temp}\t{rainfall}\t{humidity}\t1")
        except (ValueError, IndexError):
            continue

if __name__ == "__main__":
    mapper()
