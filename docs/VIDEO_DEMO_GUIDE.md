# EarthScape Climate Agency — Video Demonstration Guide (Requirement 2.8)

This guide provides a comprehensive, timestamped walkthrough script for recording the **Video Demonstration** required for the EarthScape Climate Agency project evaluation.

---

## 🎬 Video Overview & Recording Checklist

- **Target Duration**: 5 to 7 Minutes
- **Resolution**: 1080p (1920x1080) or higher
- **Audio**: Clear microphone voiceover explaining features as you navigate
- **Recommended Tools**: OBS Studio, Windows Game Bar (`Win + G`), Loom, or Camtasia

---

## ⏱️ Step-by-Step Presentation Script

### Part 1: Introduction & System Architecture (00:00 – 00:45)
* **What to Show on Screen**:
  - Open browser at `http://localhost:5173/` showing the **Climate Overview** dashboard.
* **Talking Points**:
  > *"Welcome to the EarthScape Climate Intelligence Agency platform demonstration. This is an end-to-end big data, artificial intelligence, and meteorological monitoring system designed for climate pattern analysis across Pakistan.
  > The platform is powered by a Flask REST backend, MongoDB NoSQL database, scikit-learn machine learning, simulated Hadoop MapReduce on HDFS, and a high-performance React dashboard."*
* **Actions**:
  - Click on the user profile badge in the lower left corner.
  - Show the **JWT Authentication & RBAC Modal**.
  - Highlight the two user roles: **System Administrator** (`admin@earthscape.org`) with full permissions, and **Data Analyst** (`analyst@earthscape.org`) with read-only privileges.
  - Use the Quick Role Switcher in the topbar to demonstrate role toggling.

---

### Part 2: Pakistan National Climate Geo-Map & Telemetry (00:45 – 01:45)
* **What to Show on Screen**:
  - Click **"Pakistan Geo-Map"** in the sidebar navigation.
* **Talking Points**:
  > *"Here is the interactive Pakistan Synoptic Climate Geo-Map. Unlike systems that only track a handful of locations, EarthScape monitors 25 major cities across all four provinces—Punjab, Sindh, Khyber Pakhtunkhwa, and Balochistan—as well as Islamabad Capital, Gilgit-Baltistan, and Azad Kashmir.
  > The map features pulsing radar beacons positioned by exact geographical coordinates, provincial boundaries, and the Indus River hydrological network."*
* **Actions**:
  - Click the **Region Filter Pills** (e.g. "Punjab", "Sindh", "Balochistan") to show filtered views.
  - Switch the **Overlay Metric** pills between **Temperature**, **Monsoon Rain**, **Air Quality (AQI)**, and **Wind Velocity** to see the map nodes dynamically change color.
  - Click on **Karachi** or **Quetta** or **Gilgit** on the map to open the **Live Telemetry Drawer**.
  - Show the 7-day synoptic temperature sparkline, humidity, rainfall, and AQI hazard badge.
  - Click **"Set as Dashboard City"** to navigate directly to the filtered overview.

---

### Part 3: Big Data Hadoop MapReduce & HDFS (01:45 – 02:30)
* **What to Show on Screen**:
  - Click **"Hadoop MapReduce"** in the sidebar navigation.
* **Talking Points**:
  > *"Under Functional Requirements 1.3 and 1.4, EarthScape integrates Hadoop Distributed File System (HDFS) storage and MapReduce parallel processing.
  > Historical climate data is partitioned by city inside `/user/hadoop/climate/partitioned/{city}/`.
  > We provide two distinct MapReduce pipelines: Monthly Aggregates and Seasonal Extremes."*
* **Actions**:
  - Select the **"Seasonal Extremes"** job.
  - Click the Python code tabs (`mapper_extremes.py` and `reducer_extremes.py`) to show the real distributed computing code viewer.
  - With Admin role active, click **"Run MapReduce Pipeline"**.
  - Watch the live progress spinner execute and display the aggregated output table.
  - Switch role to **Analyst** via the topbar and click Run again to demonstrate **RBAC Security Enforcement** ("Analyst role is read-only. Executing cluster compute jobs requires Administrator privileges").

---

### Part 4: Machine Learning Predictive Analytics (02:30 – 03:15)
* **What to Show on Screen**:
  - Click **"ML Predictions"** in the sidebar navigation.
* **Talking Points**:
  > *"In compliance with Requirement 1.6, our machine learning engine leverages scikit-learn for time-series climate forecasting and unsupervised anomaly detection.
  > Regression models predict temperature trajectories with upper and lower confidence intervals across 7, 14, 30, 60, and 90-day horizons.
  > Concurrently, an Isolation Forest model detects multivariate outliers that deviate from seasonal norms."*
* **Actions**:
  - Select a city from the 25-city palette (e.g., Lahore or Peshawar).
  - Toggle between forecast horizons: **7 Days**, **30 Days**, **90 Days**.
  - Hover over the Recharts chart to show the connection point between historical records and predicted values.
  - Point out model performance metrics: R² Score, MAE, and RMSE.

---

### Part 5: Real-Time Streaming & Emergency Alerts (03:15 – 04:00)
* **What to Show on Screen**:
  - Click **"Live Streaming Feed"** in the sidebar navigation.
* **Talking Points**:
  > *"Requirement 1.5 specifies real-time streaming capabilities. EarthScape features a dedicated telemetry daemon streaming sensor packets from 12 nationwide weather stations.
  > Streamed packets are continuously persisted to MongoDB and analyzed in real-time for safety threshold violations."*
* **Actions**:
  - Click **"Start Live Stream"** or the global ticker pill in the topbar.
  - Watch the rolling waveform chart update in real-time as new sensor packets arrive.
  - Navigate to **"Alerts & Incidents"**.
  - Click **"Simulate Heatwave"** or **"Simulate Flash Flood"** to run an emergency drill.
  - Notice the unread count badge increment on the topbar notification bell.
  - Open the bell dropdown, inspect the notification, click **"Acknowledge"**, and then mark as **"Resolved"**.

---

### Part 6: System Diagnostics & Automated Backups (04:00 – 04:45)
* **What to Show on Screen**:
  - Click **"System Health"** in the sidebar navigation.
* **Talking Points**:
  > *"Non-functional requirements demand 99.9% availability, monitoring, and automated backups (Req 2.3).
  > The System Health dashboard provides real-time diagnostics on server uptime, MongoDB collection volumes, hardware architecture, and component health.
  > The Automated Database Backup ledger allows immediate point-in-time snapshot generation."*
* **Actions**:
  - Point to the Server Uptime and 9,150+ climate records count.
  - Click **"Trigger Immediate Backup"**.
  - Watch the snapshot file appear in the ledger with verified timestamp, file size, and SHA-256 status.

---

### Part 7: Data Export & Support Desk (04:45 – 05:15)
* **What to Show on Screen**:
  - Visit **"Data Export Center"** and then **"Help & Feedback"**.
* **Talking Points**:
  > *"Finally, the Data Export Center enables analysts to filter any of the 25 cities and export verified data in JSON or CSV formats.
  > The Help & Feedback desk provides operators with an inquiry ticketing system and FAQ repository."*
* **Actions**:
  - In Export Center: Select a city (e.g., Faisalabad), click **"Preview JSON"**, then click **"Download CSV"**.
  - In Help & Feedback: Show the ticket submission form and the live ticket log table.
  - Navigate to **"About Platform"** and show the full **Requirements Verification Matrix** with all 1.1 to 2.8 items marked as verified.
* **Closing**:
  > *"This concludes the complete demonstration of the EarthScape Climate Intelligence Agency platform. All functional and non-functional requirements are fully implemented, verified, and operational. Thank you."*

---

## 💡 Quick Tips for High Marks
1. Speak clearly and explain *why* each feature exists (e.g. "HDFS ensures fault tolerance across distributed nodes").
2. Show the RBAC restriction failure as an Analyst—evaluators love seeing access control properly enforced!
3. Demonstrate the interactive Pakistan Geo-Map with different metric overlays (Temperature vs AQI).
