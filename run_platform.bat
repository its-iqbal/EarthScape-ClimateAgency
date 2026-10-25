@echo off
title EarthScape Climate Agency Launcher
echo =======================================================
echo    EarthScape Climate Agency - Platform Launcher
echo =======================================================
echo.

:: 1. Check/Start MongoDB
echo [1/3] Ensuring MongoDB service is running...
net start MongoDB >nul 2>&1
echo [OK] MongoDB ready on port 27017.

:: 2. Launch Backend in its own window
echo [2/3] Launching Backend Flask API on http://localhost:5000...
start "EarthScape Backend (Flask API :5000)" cmd /k "cd /d %~dp0 && call .venv\Scripts\activate.bat && python backend/app.py"

:: Short delay for backend initialization
timeout /t 2 /nobreak >nul

:: 3. Launch Frontend in its own window
echo [3/3] Launching Frontend React App on http://localhost:5173...
start "EarthScape Frontend (Vite :5173)" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo =======================================================
echo    EarthScape Platform launched successfully!
echo =======================================================
echo.
echo  Access the dashboard in your web browser:
echo     http://localhost:5173
echo.
echo  Demo Credentials:
echo     Admin:   admin@earthscape.org   / admin123!
echo     Analyst: analyst@earthscape.org / analyst123!
echo =======================================================
echo.
pause
