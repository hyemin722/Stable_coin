@echo off
chcp 65001 >nul
echo.
echo  ========================================
echo   Blockchain Lab #2 - Node.js 서버 시작
echo  ========================================
echo.
echo   http://localhost:5500 에서 실행됩니다.
echo   종료하려면 이 창을 닫거나 Ctrl+C 를 누르세요.
echo.
start http://localhost:5500
node server.js
