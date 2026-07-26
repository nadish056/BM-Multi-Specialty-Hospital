@echo off
title Hospital System Server

echo Starting Hospital Appointment Management System Server...
echo Make sure you have run 'npm install' if this is your first time.
echo.

:: Start the Node server in the same console window so the user sees logs
start /B node server/server.js

:: Wait for 3 seconds to let the server start
timeout /t 3 /nobreak > nul

:: Open Chrome to the local server
echo Opening Chrome...
start chrome http://localhost:5000

echo.
echo Server is running. Press any key to stop the server...
pause > nul

:: When user presses a key, kill the node process (optional, but good for cleanup)
taskkill /F /IM node.exe /T > nul
echo Server stopped.
