# EarthScape Climate Agency — Project Study & Presentation Guide

This comprehensive reference document contains everything needed to understand, present, and defend the **EarthScape Climate Agency** platform for project presentations, viva examinations, and academic capstone defenses.

---

## 1. Executive Summary & Project Purpose

- **Project Name**: EarthScape Climate Agency — Climate Intelligence Platform
- **Problem Statement**: Climate variability, heatwaves, glacier lake outbursts (GLOF), seasonal smog, and erratic monsoons pose severe civil and economic challenges across Pakistan. Traditional meteorological portals either rely on static tables, lack nationwide geographic coverage, or do not offer forward-looking predictive warnings.
- **Solution**: A full-stack, distributed climate analytics and early-warning intelligence platform combining:
  1. Real-time meteorological telemetry & historical repositories across **25 Pakistani cities**.
  2. Machine Learning time-series regression and unsupervised anomaly detection.
  3. AI-driven predictive hazard forecasting for civil protection.
  4. Distributed Big Data batch processing via **Hadoop MapReduce & HDFS**.
  5. Enterprise-grade Role-Based Access Control (**RBAC**), real-time sensor streaming, and automated incident triage.

---

## 2. Data Lineage: Where Did We Get The Data & Which Years?

### A. Data Sources
1. **NASA POWER API (Prediction Of Worldwide Energy Resources)**:
   - Primary baseline provider for historical meteorological parameters (surface temperature, dew point, relative humidity, precipitation, and wind speeds).
2. **ECMWF / Open-Meteo Historical Archive & Live Weather API** (`https://api.open-meteo.com/v1/forecast` & `https://archive-api.open-meteo.com/v1/archive`):
   - World Meteorological Organization (WMO) standardized real-time observations and numerical weather prediction (NWP) model outputs.
3. **Open-Meteo Atmospheric Air Quality API** (`https://air-quality-api.open-meteo.com/v1/air-quality`):
   - Real-time particulate matter (PM2.5, PM10) and US Air Quality Index (AQI) telemetry.

### B. Geographic Coverage (25 Nationwide Monitoring Stations)
All monitoring stations correspond to exact geographic coordinates (lat/long) across all four provinces, federal capital, and northern territories:
- **Punjab**: Lahore, Faisalabad, Rawalpindi, Multan, Gujranwala, Sialkot, Bahawalpur, Sargodha.
- **Sindh**: Karachi, Hyderabad, Sukkur, Larkana, Nawabshah.
- **Khyber Pakhtunkhwa (KP)**: Peshawar, Abbottabad, Swat, Dera Ismail Khan.
- **Balochistan**: Quetta, Gwadar, Turbat.
- **Gilgit-Baltistan (GB)**: Gilgit, Skardu (alpine / glacial monitoring).
- **Azad Jammu & Kashmir (AJK)**: Muzaffarabad, Mirpur.
- **Islamabad Capital Territory (ICT)**: Islamabad.

### C. Timeframe & Dataset Scale
- **Historical Baseline**: Full year **2024** (daily records for all 25 cities = 9,150+ initial observations).
- **Ongoing / Contemporary Records**: Continuous daily records throughout **2025** and **2026** up to the ongoing date (late October 2026).
- **Total Records in MongoDB**: **16,750+ verified daily meteorological records**.
- **Data Integrity Principle**: **Zero synthetic/mock records**. Records with missing fields are tracked in the data quality engine rather than fabricated.

---

## 3. Machine Learning & Prediction Procedures

The platform utilizes three distinct machine learning and statistical models:

### Model 1: Seasonal Fourier Harmonic Regression (Temperature Forecasting)
- **Problem**: Temperature follows strong periodic seasonal cycles rather than a simple straight line. Simple linear regression fails because seasons are non-linear.
- **Solution**: We transform the day of the year ($d \in [1, 365.25]$) into **Fourier orthogonal harmonic features**:
  $$\sin_1 = \sin\left(\frac{2\pi d}{365.25}\right), \quad \cos_1 = \cos\left(\frac{2\pi d}{365.25}\right) \quad \text{(Annual cycle)}$$
  $$\sin_2 = \sin\left(\frac{4\pi d}{365.25}\right), \quad \cos_2 = \cos\left(\frac{4\pi d}{365.25}\right) \quad \text{(Semi-annual cycle / Monsoon transitions)}$$
- **Algorithm**: **Ridge Regression (L2 Regularization)** from `scikit-learn` fitted on the Fourier features.
- **Validation**: Strict **80/20 chronological split** (train on earlier dates, test on subsequent dates to prevent data leakage).
- **Uncertainty Quantification**: Calculates Mean Absolute Error (MAE), Root Mean Squared Error (RMSE), and $R^2$. Shaded prediction intervals are computed at **95% confidence**:
  $$\text{Prediction Interval} = \hat{y} \pm 1.96 \times \text{RMSE}$$
- **Forecast Horizon**: Projects 7 to 90 days into the future (e.g., forecasting through November and December 2026).

### Model 2: Multi-Feature Isolation Forest (Unsupervised Anomaly Detection)
- **Problem**: A single metric might appear normal in isolation (e.g. 28°C is normal in summer), but when coupled with 95% humidity and heavy rain, it indicates an abnormal convective storm.
- **Algorithm**: `scikit-learn.ensemble.IsolationForest` using 200 isolation trees and a 5% contamination factor.
- **Features Analyzed**: Evaluates 5 dimensions simultaneously:
  1. Average Temperature ($^\circ\text{C}$)
  2. Minimum Temperature ($^\circ\text{C}$)
  3. Maximum Temperature ($^\circ\text{C}$)
  4. Rainfall ($\text{mm}$)
  5. Relative Humidity ($\%$)
- **Output**: Generates a continuous anomaly score where negative values isolate extreme climatic deviations.

### Model 3: AI Predictive Alert Engine (Upcoming Civil Hazard Forecasts)
- **Procedure**: Instead of waiting for a threshold violation to occur in real life, the predictive engine evaluates the model's 30-day forecasted trajectory and confidence bounds:
  1. **Cold Snap & Alpine Frost Advisory**: Triggered if forecasted minimum temperature $\le 5^\circ\text{C}$ or lower confidence bound $\le 1^\circ\text{C}$ (e.g., Skardu dropping to $3.9^\circ\text{C}$ and Gilgit to $5.0^\circ\text{C}$ in November).
  2. **Seasonal Smog & AQI Inversion Alert**: Evaluates autumn atmospheric stagnation in the Punjab plains (Lahore, Faisalabad, Gujranwala, Sialkot) when temperature drops and boundary layer inversion traps PM2.5, forecasting $\text{AQI} \ge 180$.
  3. **Extreme Heatwave Emergency Warning**: Evaluates summer surges where peak temperatures exceed $38^\circ\text{C}$ or upper confidence bound exceeds $40^\circ\text{C}$.

---

## 4. Page-by-Page Feature & Function Walkthrough

### 1. Climate Overview (`/overview`)
- **Purpose**: High-level national executive dashboard for decision-makers.
- **Features**:
  - **KPI Metric Cards**: Displays nationwide Average Temperature, Total Annual Precipitation, Mean Atmospheric Humidity, and 3σ Anomaly Count.
  - **Multi-City Temperature Comparison Chart**: Interactive line chart comparing benchmark cities (Karachi, Lahore, Islamabad, Peshawar, Quetta).
  - **Data Quality & Sensor Availability Gauge**: Transparently tracks complete vs missing data fields (1500/1500 verified points).

### 2. Pakistan Geo-Map (`/map`)
- **Purpose**: Interactive national geographic synoptic map with live station telemetry.
- **Features**:
  - Displays all **25 Pakistani cities** positioned accurately across all provinces, ICT, Gilgit-Baltistan, and AJK.
  - Station pins are color-coded dynamically based on current temperature regimes (Alpine blue, temperate emerald, warm amber, heat red).
  - Clicking any station opens an inspection card with real-time readings, elevation, and regional climate classifications.
  - **Satellite Remote Sensing Channels**: Switch between Thermal Infrared, Water Vapor, and Visible Cloud Cover satellite views.

### 3. Monthly Trends (`/trends`)
- **Purpose**: Historical climate cyclical analysis across months of the year.
- **Features**:
  - Filterable by individual city or nationwide aggregate.
  - Dual-axis Composed Chart displaying average temperature curves alongside monthly rainfall bar volumes.
  - Seasonal breakdown table highlighting monsoon peaks (July–August) and winter troughs (December–January).

### 4. Statistical Anomalies (`/anomalies`)
- **Purpose**: Univariate statistical outlier detection using the empirical **3-Sigma ($3\sigma$) Rule**.
- **Features**:
  - Calculates city-specific monthly means ($\mu$) and standard deviations ($\sigma$).
  - Any observation satisfying $|x - \mu| > 3\sigma$ is flagged as a statistical rarity ($< 0.3\%$ probability under Gaussian distribution).
  - Includes interactive Sigma boundary sliders ($2.0\sigma$ to $3.5\sigma$) and historical anomaly table.

### 5. Climate Correlations (`/correlations`)
- **Purpose**: Quantitative analysis of physical relationships between climate variables.
- **Features**:
  - Calculates pairwise **Pearson Correlation Coefficients** ($r \in [-1, +1]$).
  - Displays interactive correlation matrix (e.g. strong negative correlation between temperature and humidity; rainfall and temperature).
  - Interactive scatter plot with linear trend regression line.

### 6. Machine Learning Predictions (`/ml`)
- **Purpose**: Future weather forecasting and multi-variable anomaly isolation.
- **Features**:
  - City toggle and horizon selector ($7, 14, 30, 60, 90\text{ days}$).
  - Forecast chart displaying historical observations and projecting into November/December 2026 with shaded 95% confidence intervals.
  - Model diagnostic scorecards ($R^2$, MAE, RMSE, prediction interval width).
  - **AI Predictive Alert Warnings Panel**: Displays early-warning cards for upcoming forecasted hazards with countdown badges (*"In 7 days"*), limits, confidence scores, and municipal actions.
  - **Isolation Forest Table**: Flags multi-dimensional anomalous days.

### 7. Hadoop MapReduce (`/hadoop`)
- **Purpose**: Big Data distributed batch processing engine for massive climate datasets.
- **Features**:
  - Distributed cluster simulation (NameNode, DataNodes, Resource Manager).
  - HDFS partition inspector showing raw partition blocks (`hdfs://storage/partition_punjab.csv`, etc.).
  - Interactive MapReduce job execution (Monthly Rollup, Max Temperature Extrema, Rainfall Aggregation) displaying real Mapper, Combiner, and Reducer stages.

### 8. Live Streaming Feed (`/stream`)
- **Purpose**: Real-time IoT sensor telemetry ingestion.
- **Features**:
  - Live animated telemetry stream with packet ping indicators.
  - Controls to Pause, Resume, or adjust ingestion frequency ($1\text{s}, 2\text{s}, 5\text{s}$).
  - Computes a 10-packet rolling sliding-window moving average.
  - Instantaneous threshold evaluation triggering live emergency alerts when readings spike.

### 9. Alerts & Incident Response Center (`/alerts`)
- **Purpose**: Municipal early-warning triage and civil protection dispatch.
- **Features**:
  - **Active Incident Response Ledger**: 58 documented threshold violations. Allows operators to triage alerts, mark them **Acknowledged (Ack)**, or **Resolved**.
  - **🤖 AI Upcoming Alert Forecasts**: Shows ML-forecasted risks for the next 7 to 30 days (smog in Punjab, sub-zero cold in Skardu/Gilgit).
  - **Emergency Threshold Simulation**: Interactive buttons to simulate emergency drills (Simulate Heatwave, Simulate Cloudburst, Simulate Frost).
  - **Threshold Configuration Editor**: Allows System Administrators to modify safety limits (e.g. adjust heatwave threshold from $38^\circ\text{C}$ to $40^\circ\text{C}$).

### 10. Data Export Center (`/export`)
- **Purpose**: Interoperable research data extraction.
- **Features**:
  - Supports CSV and JSON formats.
  - Filter by city or export nationwide datasets (Climate Readings, Anomalies, Incident Ledger).
  - Interactive paginated table preview with 1-click download.

### 11. System Health (`/health`)
- **Purpose**: Infrastructure monitoring and disaster recovery.
- **Features**:
  - Real-time MongoDB connection status, ping latency, memory consumption, and disk status.
  - **Database Snapshot Creator**: Allows System Administrators to trigger automated JSON snapshots with record counts and timestamps.
  - Snapshot audit table showing historical backup archives.

### 12. About Platform (`/about`)
- **Purpose**: Technical documentation and system architecture breakdown.
- **Features**:
  - Outlines multi-tiered architecture (Ingestion -> Storage -> Compute -> API -> Presentation).
  - Full data lineage specifications and academic citations.

### 13. Help & Feedback (`/feedback`)
- **Purpose**: Stakeholder support desk.
- **Features**:
  - Ticket submission system generating formal tracking IDs (`TKT-ES-XXXX`).
  - FAQ guide covering terminology, units, and system operations.

---

## 5. Security & Role-Based Access Control (RBAC)

The platform enforces Role-Based Access Control using cryptographic JSON Web Tokens (JWT):

| Role | Person | Permissions | Restricted Actions |
|---|---|---|---|
| **System Administrator** | `Dr. Aisha Khan` | Full Access: Modify threshold rules, trigger disaster simulations, create system backup snapshots, resolve alerts. | None. |
| **Data Analyst** | `Bilal Ahmed` | Read-Only Access: View dashboards, run ML models, export data, filter analytics. | Cannot modify threshold rules or generate database snapshots (triggers RBAC warning modal). |

---

## 6. Key Presentation Talking Points & Examiner Q&A

### Q1: "Why did you use Fourier harmonics instead of simple linear regression or an LSTM?"
> *"Climate data has strong annual and seasonal cyclicality. A standard linear regression tries to fit a straight line, which is meteorologically invalid. While an LSTM or deep neural network is powerful, for daily temperature series of 1-3 years, deep learning tends to overfit and acts as an uninterpretable black box. Fourier harmonic decomposition captures the exact physical 365.25-day solar cycle and monsoon transition harmonics with closed-form mathematical guarantees, fast training, high interpretability, and robust 95% confidence intervals."*

### Q2: "Where does the 2026 data come from if NASA POWER only had 2024?"
> *"We built an automated live API client that integrates directly with official Open-Meteo and WMO APIs. It synchronizes live 2026 observations and air quality telemetry for all 25 Pakistani cities using their precise latitudes and longitudes, growing our verified database to over 16,750 continuous daily records with zero hardcoding."*

### Q3: "What is the difference between your 3σ anomalies and Isolation Forest anomalies?"
> *"The 3-Sigma rule is a parametric, univariate statistical check: it evaluates one variable (e.g. temperature) against its historical monthly normal. Isolation Forest is an unsupervised, non-parametric multi-dimensional machine learning model: it evaluates all 5 variables simultaneously (temperature, humidity, precipitation, max, min) to uncover complex multi-variable climate events that appear normal in single dimensions."*

### Q4: "How does the MapReduce implementation work?"
> *"We utilized the Python `mrjob` framework to simulate Hadoop MapReduce operations over HDFS-partitioned data. The Mapper breaks down raw partitioned climate chunks by city and month, the Combiner performs in-memory local pre-aggregation to save network bandwidth, the Partitioner sorts by key, and the Reducer computes final monthly averages, extrema, and rainfall volume rollups."*
