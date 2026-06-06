@echo off
chcp 65001 > nul
if not exist logs mkdir logs
echo [1/2] Run Upbit MCP CLI demo
python clients\test_upbit_client.py > logs\cli_demo_output.txt 2>&1
echo [2/2] Saved log to logs\cli_demo_output.txt
type logs\cli_demo_output.txt
pause
