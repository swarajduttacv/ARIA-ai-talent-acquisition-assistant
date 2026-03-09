@echo off
title ARIA Recruitment App Launcher
echo ============================================
echo    Starting ARIA Recruitment App...
echo ============================================
echo.

:: Start Backend (FastAPI) in a new window
echo [1/2] Starting Backend (port 8000)...
start "ARIA Backend" cmd /k "cd /d d:\d\pp\ai-talent-acquisition-assistant\backend && d:\d\pp\ai-talent-acquisition-assistant\.venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000"

:: Wait a moment for backend to initialize
timeout /t 3 /nobreak >nul

:: Start Frontend (Vite) in a new window
echo [2/2] Starting Frontend (port 3000)...
start "ARIA Frontend" cmd /k "cd /d d:\d\pp\ai-talent-acquisition-assistant\frontend && npm run dev"

:: Wait a moment then open the browser
timeout /t 4 /nobreak >nul
echo.
echo ============================================
echo    App is starting up!
echo    Opening http://localhost:3000 ...
echo ============================================
start http://localhost:3000

echo.
echo You can close this window. The app runs in
echo the two other terminal windows that opened.
echo To stop the app, close those windows.
pause
