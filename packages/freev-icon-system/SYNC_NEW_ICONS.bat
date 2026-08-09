@echo off
cd /d "%~dp0"
python tools\icon_pipeline.py sync --enforce
if errorlevel 1 py -3 tools\icon_pipeline.py sync --enforce
pause
