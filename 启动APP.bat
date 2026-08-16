@echo off
chcp 65001 >nul
cd /d %~dp0
echo ==========================================
echo  文博链 RelicChain · 本地一键启动
echo  浏览器将自动打开：http://localhost:8080/区块链平台.html
echo  手机访问：与电脑连同一 WiFi，浏览器打开 http://电脑IP:8080/区块链平台.html
echo  （查看电脑IP：在地址栏输入 http://localhost:8080 后用 ipconfig 查询）
echo ==========================================
start "" http://localhost:8080/区块链平台.html
where python >nul 2>nul
if %errorlevel%==0 (
  python -m http.server 8080
) else (
  echo [提示] 未检测到 Python。请安装 Python 后重试，或用命令： npx serve
  pause
)
