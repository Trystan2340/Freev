@echo off
cd /d "%~dp0"
python tools\icon_pipeline.py watch
if errorlevel 1 py -3 tools\icon_pipeline.py watch
pause
