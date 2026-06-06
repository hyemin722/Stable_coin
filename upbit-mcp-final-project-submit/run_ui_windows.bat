@echo off
chcp 65001 > nul
cd /d %~dp0

echo ========================================
echo Upbit MCP Web UI 실행
echo 주소: http://127.0.0.1:8765
echo 종료: Ctrl + C
echo ========================================

if exist .venv\Scripts\python.exe (
    .venv\Scripts\python.exe web_app.py
) else (
    py web_app.py
)

pause
