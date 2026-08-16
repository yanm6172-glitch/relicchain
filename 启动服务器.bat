@echo off
chcp 65001 >nul
cd /d %~dp0
where node >nul 2>nul
if %errorlevel% neq 0 (
  echo [错误] 未检测到 Node.js。请先安装：https://nodejs.org （LTS 版）
  pause
  exit /b
)
echo ==========================================
echo  文博链 RelicChain · 真实服务端启动中
echo  本机访问: http://localhost:8080
echo  手机访问（同一 WiFi）:
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do echo    http://%%a:8080
echo  数据保存在同目录 data.json（关掉窗口即停止服务）
echo ==========================================
start "" http://localhost:8080/index.html
node server.js
pause
