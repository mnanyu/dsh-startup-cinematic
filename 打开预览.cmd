@echo off
chcp 65001 >nul 2>nul
setlocal
cd /d "%~dp0"
echo 正在打开 DEEPSEEK HARNESS — BOOT SEQUENCE ...
start "" "%~dp0index.html"
