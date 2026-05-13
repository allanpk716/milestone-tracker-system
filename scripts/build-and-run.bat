@echo off
setlocal enabledelayedexpansion
chcp 65001 > nul 2>&1
title Milestone Tracker - 构建与运行

echo ============================================================
echo   Milestone Tracker - 一键构建并运行
echo ============================================================
echo.

:: ── 1. 检查 Node.js ──────────────────────────────────────────
echo [1/6] 检查 Node.js ...
where node > nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未找到 Node.js，请先安装 Node.js 18+ 并确保在 PATH 中。
    echo         下载地址: https://nodejs.org/
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('node -v') do set NODE_VER=%%v
echo         Node.js 版本: %NODE_VER%
echo.

:: ── 2. 安装依赖 ──────────────────────────────────────────────
echo [2/6] 检查依赖 ...
if not exist "node_modules" (
    echo         首次运行，正在安装依赖 ...
    call npm install
    if %errorlevel% neq 0 (
        echo [错误] npm install 失败。
        pause
        exit /b 1
    )
) else (
    echo         依赖已安装，跳过。
)
echo.

:: ── 3. 检查 .env 配置 ────────────────────────────────────────
echo [3/6] 检查配置 ...
if not exist ".env" (
    echo         首次运行，从 .env.example 复制配置文件 ...
    copy .env.example .env > nul
    echo.
    echo   +----------------------------------------------------------+
    echo   ^|  已创建 .env 配置文件，请编辑后重新运行此脚本：           ^|
    echo   ^|                                                          ^|
    echo   ^|  必须修改：                                               ^|
    echo   ^|    ADMIN_PASSWORD=你的管理员密码                          ^|
    echo   ^|    API_KEYS=你的Agent连接密钥                             ^|
    echo   ^|                                                          ^|
    echo   ^|  LLM 功能需要（可选）：                                    ^|
    echo   ^|    LLM_API_KEY=你的LLM密钥                               ^|
    echo   ^|    LLM_BASE_URL=LLM接口地址                               ^|
    echo   ^|    LLM_MODEL=模型名称                                     ^|
    echo   ^|                                                          ^|
    echo   ^|  默认管理员密码: changeme                                 ^|
    echo   ^|  默认端口: 3000                                           ^|
    echo   +----------------------------------------------------------+
    echo.
    echo         按任意键打开 .env 进行编辑（或 Ctrl+C 退出）...
    pause > nul
    notepad .env
)
echo         配置文件已就绪。
echo.

:: ── 4. 构建 ──────────────────────────────────────────────────
echo [4/6] 构建项目 ...
call npm run build
if %errorlevel% neq 0 (
    echo [错误] 构建失败，请检查错误信息。
    pause
    exit /b 1
)
echo         构建成功。
echo.

:: ── 4b. 初始化数据库 ────────────────────────────────────────
echo [5/6] 初始化数据库 ...
if not exist "data" mkdir data
call npx drizzle-kit push
echo         数据库就绪。
echo.

:: ── 5. 启动服务 ──────────────────────────────────────────────
echo [6/6] 启动服务 ...
echo.

:: 读取 .env 中的 PORT（默认 3000）
set SERVER_PORT=3000
for /f "usebackq tokens=1,* delims==" %%a in (".env") do (
    set "line=%%a"
    if not "!line:~0,1!"=="#" (
        if /i "%%a"=="PORT" if not "%%b"=="" set "SERVER_PORT=%%b"
    )
)

echo ============================================================
echo   服务已启动！
echo.
echo   访问地址: http://localhost:!SERVER_PORT!
echo   管理员登录: 使用 .env 中 ADMIN_PASSWORD 的密码
echo.
echo   按 Ctrl+C 停止服务
echo ============================================================
echo.

:: 加载 .env 并启动 node 服务
node -e "require('dotenv').config(); import('./build/index.js')"
