@echo off
chcp 65001 > nul
python -m py_compile clients\test_upbit_client.py servers\upbit_server.py web_app.py
if %errorlevel% equ 0 (
  echo Syntax check passed.
) else (
  echo Syntax check failed.
)
pause
