# 🌍 EarthScape Climate Intelligence Platform

> **Enterprise-Grade Big Data, Machine Learning & Real-Time Climate Analytics Platform**  
> Built for environmental monitoring, historical trends analysis, predictive modeling, MapReduce big data processing, and live incident alerting using NASA POWER daily climate data.

---

## 📋 Table of Contents
1. [Platform Overview](#-platform-overview)
2. [Key Modules & Capabilities](#-key-modules--capabilities)
3. [Prerequisites](#-prerequisites)
4. [Step-by-Step Setup Guide](#-step-by-step-setup-guide)
   - [Step 1: Clone or Copy the Repository](#step-1-clone-or-copy-the-repository)
   - [Step 2: Start MongoDB](#step-2-start-mongodb)
   - [Step 3: Setup & Launch the Backend (Python/Flask)](#step-3-setup--launch-the-backend-pythonflask)
   - [Step 4: Setup & Launch the Frontend (React/Vite)](#step-4-setup--launch-the-frontend-reactvite)
5. [Default User Credentials (RBAC)](#-default-user-credentials-rbac)
6. [Project Directory Structure](#-project-directory-structure)
7. [API Endpoints Reference](#-api-endpoints-reference)
8. [Troubleshooting & FAQs](#-troubleshooting--faqs)

---

## 🌐 Platform Overview

The **EarthScape Climate Intelligence Platform** is a full-stack climate intelligence system integrating:
- **Big Data Storage & Processing**: 1,098 historical NASA POWER climate records across major Pakistani metropolitan centers (Islamabad, Karachi, Lahore, Peshawar) stored in MongoDB, with a custom Python **Hadoop & MapReduce Streaming Simulator** operating over virtual HDFS storage.
- **Machine Learning Engine**: scikit-learn models (`RandomForestRegressor`, `Ridge`, and `IsolationForest`) for next-day temperature prediction, feature importance estimation, and multidimensional climate anomaly detection.
- **Real-Time Streaming**: Server-Sent Events (SSE) broadcasting live synthetic sensor data feeds with configurable emission intervals and simulation controls.
- **Incident Alerting Engine**: Threshold-based incident lifecycle management (Critical Heatwaves, Cloudburst/Floods, Cold Snaps, Air Quality degradation) with live UI notification popovers.
- **Enterprise Features**: Role-Based Access Control (RBAC), multi-dataset CSV/JSON Export Center, real-time System Diagnostics monitor, and a premium dark glassmorphism UI.

```
┌────────────────────────────────────────────────────────────────────────┐
│               EarthScape Climate Intelligence Platform                │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
           ┌─────────────────────────┴────────────────────────┐
           ▼                                                  ▼
┌──────────────────────┐                           ┌─────────────────────┐
│  React + Vite UI     │ ◄──── HTTP REST & SSE ───►│  Flask API Backend  │
│  - Recharts Visuals  │                           │  - Auth & RBAC      │
│  - 9 Workspaces      │                           │  - ML Engine        │
│  - Responsive Glass  │                           │  - Hadoop Simulator │
└──────────────────────┘                           │  - SSE Live Emitter │
                                                   └──────────┬──────────┘
                                                              │
                                                   ┌──────────┴──────────┐
                                                   ▼                     ▼
                                          ┌────────────────┐    ┌─────────────────┐
                                          │ MongoDB        │    │ Local HDFS Sim  │
                                          │ (Readings,     │    │ (Jobs, Mappers, │
                                          │  Users, Alerts)│    │  Reducers)      │
                                          └────────────────┘    └─────────────────┘
```

---

## 🚀 Key Modules & Capabilities

1. **Overview Dashboard**: High-level KPI summary cards, multi-city average temperatures, rainfall distributions, and active alert counters.
2. **Climate Analytics**: Interactive monthly climate trends, rainfall distribution by location, and 3-sigma statistical anomaly detection with dynamic city and date filters.
3. **Machine Learning Studio**: Dual temperature forecasting models (`RandomForestRegressor` and `Ridge`), model evaluation metrics ($R^2$, MAE, RMSE), feature importance ranking, and an interactive "What-If" climate scenario simulator.
4. **Hadoop MapReduce Simulator**: Python streaming MapReduce engine demonstrating Big Data principles (Map -> Shuffle/Sort -> Reduce) over virtual HDFS storage for extreme temperature discovery and monthly rainfall aggregation.
5. **Real-Time Sensor Streaming**: Live telemetry streaming via Server-Sent Events (SSE) simulating automated weather stations with playback controls (play, pause, speed adjustment).
6. **Alerts & Incidents Management**: Multi-threshold rule engine detecting heatwaves, severe downpours, frost advisories, and air quality spikes with acknowledgment and resolution workflows.
7. **Data Export Center**: Multi-dataset exporter supporting CSV and JSON formats with custom date range and city filters.
8. **System Health Monitor**: Real-time diagnostic telemetry tracking component health (MongoDB, Flask API, scikit-learn, Hadoop, Streaming engine), memory usage, and collection statistics.
9. **About Platform**: Architectural diagrams, technology stack overview, and project documentation.

---

## 💻 Prerequisites

Ensure the following tools are installed on the host machine:

| Component | Minimum Version | Recommended Version | Download Link |
|---|---|---|---|
| **Python** | 3.10+ | 3.12 or 3.13 | [python.org/downloads](https://www.python.org/downloads/) |
| **Node.js & npm** | Node 18+ (LTS) | Node 20+ (LTS) | [nodejs.org](https://nodejs.org/) |
| **MongoDB Community** | 6.0+ | 7.0+ | [mongodb.com/try/download/community](https://www.mongodb.com/try/download/community) |
| **Git** *(Optional)* | 2.30+ | Latest | [git-scm.com](https://git-scm.com/) |

> **Tip:** You can optionally install **MongoDB Compass** for a visual interface into your database collections.

---

## 🛠️ Step-by-Step Setup Guide

### Step 1: Clone or Copy the Repository

Extract the project files or clone the repository to the desired location on your PC:
```bash
git clone https://github.com/your-username/EarthScape-Climate-Agency.git
cd EarthScape-Climate-Agency
```

---

### Step 2: Start MongoDB

MongoDB must be running locally on the default port `27017`.

- **Windows**:
  Open **Command Prompt** (Run as Administrator) or **PowerShell**:
  ```cmd
  net start MongoDB
  ```
  *(Alternatively, ensure the `MongoDB Server` service is set to "Running" in `services.msc`)*

- **macOS**:
  ```bash
  brew services start mongodb-community
  ```

- **Linux (Ubuntu/Debian)**:
  ```bash
  sudo systemctl start mongod
  sudo systemctl enable mongod
  ```

---

### Step 3: Setup & Launch the Backend (Python/Flask)

1. Open a terminal in the root directory: `EarthScape-Climate-Agency`

2. **Create and activate a virtual environment**:
   - **Windows (PowerShell)**:
     ```powershell
     python -m venv .venv
     .venv\Scripts\Activate.ps1
     ```
     > *Note for PowerShell users:* If you receive an execution policy error, run:
     > `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`

   - **Windows (Command Prompt / CMD)**:
     ```cmd
     python -m venv .venv
     .venv\Scripts\activate.bat
     ```

   - **macOS / Linux**:
     ```bash
     python3 -m venv .venv
     source .venv/bin/activate
     ```

3. **Install Python dependencies**:
   ```bash
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

4. **Ingest the NASA POWER Climate Data into MongoDB**:
   Populate MongoDB with the 1,098 validated historical climate records:
   ```bash
   python backend/ingest_climate.py
   ```
   *Expected output:*
   ```text
   Read 1098 valid climate rows from data/climate_historical.csv
   Successfully ingested 1098 records into 'earthscape_climate.climate_readings'!
   ```

5. **(Optional) Run Data Quality Audit**:
   Verify dataset integrity, schema conformity, and zero missing values:
   ```bash
   python backend/audit_climate_data.py
   ```

6. **Start the Flask REST API Server**:
   ```bash
   python -m flask --app backend/app.py run --port 5000
   ```
   *The backend will start on **`http://localhost:5000`**.*

---

### Step 4: Setup & Launch the Frontend (React/Vite)

1. Open a **second terminal** window.

2. Navigate to the `frontend` folder:
   ```bash
   cd frontend
   ```

3. **Install Node packages**:
   ```bash
   npm install
   ```

4. **Start the Vite development server**:
   ```bash
   npm run dev
   ```
   *Expected output:*
   ```text
     VITE v8.3.4  ready in 250 ms

     ➜  Local:   http://localhost:5173/
     ➜  Network: use --host to expose
   ```

5. **Open your browser and navigate to**:
   ```
   http://localhost:5173
   ```

---

## 🔐 Default User Credentials (RBAC)

The platform includes two preconfigured accounts demonstrating Role-Based Access Control:

| Role | Email Address | Password | Permissions & Capabilities |
|---|---|---|---|
| **System Administrator** | `admin@earthscape.org` | `admin123!` | Full permissions: MapReduce execution, threshold modification, alert resolution, data exports, system diagnostic control |
| **Environmental Analyst** | `analyst@earthscape.org` | `analyst123!` | Standard access: Viewing all climate analytics, ML predictions, sensor streams, generating CSV/JSON exports |

> To switch users or sign out, click the user profile badge at the bottom of the left sidebar.

---

## 📁 Project Directory Structure

```text
EarthScape-Climate-Agency/
│
├── data/
│   ├── climate_historical.csv       # 1,098 validated historical NASA POWER daily records
│   └── climate_sample.csv           # Initial test records
│
├── backend/
│   ├── app.py                       # Main Flask application, REST endpoints, analytics & export logic
│   ├── auth.py                      # JWT authentication & Role-Based Access Control (RBAC)
│   ├── alerts.py                    # Multi-threshold notification & incident alerting engine
│   ├── streaming.py                 # Real-Time Sensor Stream generator (Server-Sent Events)
│   ├── ml_predict.py                # scikit-learn models (RandomForest, Ridge, IsolationForest)
│   ├── ingest_climate.py            # MongoDB data loader & validator
│   ├── audit_climate_data.py        # Dataset verification and quality audit script
│   ├── requirements.txt             # Backend Python dependencies
│   └── hadoop/
│       ├── __init__.py
│       ├── hdfs_simulator.py        # Virtual HDFS file management & job execution tracker
│       ├── mapper_extreme.py        # Mapper: emits high temperature records
│       ├── reducer_extreme.py       # Reducer: aggregates extreme values by city
│       ├── mapper_monthly.py        # Mapper: emits monthly climate metrics
│       └── reducer_monthly.py       # Reducer: aggregates monthly averages
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx                  # Main React application with all 9 platform workspaces
│   │   ├── App.css                  # Dark glassmorphism styling and design system
│   │   ├── main.jsx                 # React root entry point
│   │   └── index.css                # Base typography & layout styles
│   ├── index.html                   # HTML document template with Inter font
│   ├── package.json                 # React, Vite, Recharts, Lucide-React dependencies
│   └── vite.config.js               # Vite bundler configuration & proxy settings
│
├── hdfs_storage/                    # Virtual storage directory for MapReduce outputs
├── models/                          # Serialized machine learning models cache
├── requirements.txt                 # Root Python requirements file
└── README.md                        # Platform documentation (this file)
```

---

## 📡 API Endpoints Reference

| Endpoint | Method | Role Required | Description |
|---|---|---|---|
| `/api/system/health` | `GET` | *Public* | Platform diagnostics, component statuses, and DB memory metrics |
| `/api/summary` | `GET` | *Public* | High-level KPI climate statistics |
| `/api/readings` | `GET` | *Public* | Filtered climate readings with pagination |
| `/api/analytics/timeseries` | `GET` | *Public* | Multi-city historical temperature & precipitation trends |
| `/api/analytics/anomalies` | `GET` | *Public* | 3-sigma statistical climate anomalies |
| `/api/ml/predict-temperature` | `POST` | *Public* | Next-day temperature forecast using scikit-learn |
| `/api/ml/metrics` | `GET` | *Public* | Model training scores ($R^2$, MAE, RMSE) and feature importance |
| `/api/hadoop/jobs` | `GET` | *Public* | List completed MapReduce jobs and virtual HDFS files |
| `/api/hadoop/run` | `POST` | `admin` | Launch MapReduce jobs (Extreme Temp, Monthly Summary) |
| `/api/stream/readings` | `GET` | *Public* | Server-Sent Events (SSE) live sensor telemetry stream |
| `/api/alerts/active` | `GET` | *Public* | List unacknowledged climate alerts and threshold incidents |
| `/api/alerts/<id>/ack` | `POST` | *Public* | Acknowledge an alert |
| `/api/alerts/<id>/resolve` | `POST` | `admin` | Mark an alert incident as resolved |
| `/api/export` | `GET` | *Public* | Download datasets in CSV or JSON format |
| `/api/auth/login` | `POST` | *Public* | Authenticate user and receive signed JWT session token |

---

## ❓ Troubleshooting & FAQs

### 1. Backend error: `pymongo.errors.ServerSelectionTimeoutError`
- **Cause**: MongoDB is not running or not listening on port 27017.
- **Solution**:
  - Windows: Run `net start MongoDB` in an administrative terminal or start the service in `services.msc`.
  - macOS: Run `brew services restart mongodb-community`.
  - Linux: Run `sudo systemctl restart mongod`.

### 2. Frontend error: `Failed to fetch` or empty charts
- **Cause**: The Flask backend server is not running on port 5000.
- **Solution**: Ensure your backend terminal is running `python -m flask --app backend/app.py run --port 5000`. Test by visiting `http://localhost:5000/api/system/health` in your browser.

### 3. Windows PowerShell: `Execution of scripts is disabled on this system`
- **Cause**: Windows PowerShell security policy restricts script execution by default.
- **Solution**: Run this command once in PowerShell:
  ```powershell
  Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
  ```
  Then reactivate `.venv\Scripts\Activate.ps1`.

### 4. Port 5000 or 5173 is already in use
- **Port 5000**: Specify a different port for Flask:
  ```bash
  python -m flask --app backend/app.py run --port 5001
  ```
- **Port 5173**: Vite automatically switches to 5174 or you can specify `--port`:
  ```bash
  npm run dev -- --port 3000
  ```

### 5. Ingestion warning: `climate_historical.csv not found`
- **Solution**: Verify you are executing commands from the project root (`EarthScape-Climate-Agency/`). The ingestion script expects the data file at `data/climate_historical.csv`.

---

## 📄 License & Credits
- **Project**: EarthScape Climate Agency — Climate Intelligence Platform
- **Data Source**: [NASA POWER Project](https://power.larc.nasa.gov/) (Prediction Of Worldwide Energy Resources)
- **Built With**: Python, Flask, MongoDB, scikit-learn, React 19, Vite, Recharts, Lucide Icons.
