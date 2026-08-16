@echo off
chcp 65001 >nul
cd /d %~dp0
if "%~1"=="" (
  echo 用法: 上传GitHub.bat https://github.com/你的用户名/仓库名.git
  echo 提示: 先在 GitHub 网页创建一个"空仓库"（不要勾选 README/License），再运行本脚本
  pause
  exit /b
)
git remote remove origin 2>nul
git remote add origin %~1
git branch -M main
git push -u origin main
if %errorlevel%==0 (
  echo ========================================
  echo  上传成功！打开浏览器查看你的仓库
  echo ========================================
) else (
  echo 上传失败，常见原因:
  echo  1. 认证失败: 需要 Personal Access Token
  echo     GitHub 网页 - Settings - Developer settings - Personal access tokens
  echo     生成后把地址写成 https://用户名:TOKEN@github.com/用户名/仓库名.git
  echo  2. 仓库非空: 创建时不要勾选任何初始化文件
  echo  3. 网络问题: 换网络或稍后重试
)
pause
