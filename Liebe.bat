@echo off
cd /d "%~dp0"
echo Starting Liebe AI Server...
start "" /b python app.py
timeout /t 3 /nobreak > nul
echo Opening Liebe...
start chrome --app=http://127.0.0.1:5000
exit
