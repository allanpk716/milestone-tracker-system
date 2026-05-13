@echo off
setlocal enabledelayedexpansion
chcp 65001 > nul 2>&1
title Milestone Tracker - 服务安装

:: ════════════════════════════════════════════════════════════════
::  install-service.bat — 使用 NSSM 注册 Milestone Tracker
::  为 Windows 服务，配置自启动、崩溃重启和日志轮转。
::  必须以管理员身份运行。
:: ════════════════════════════════════════════════════════════════

echo ============================================================
echo   Milestone Tracker - Windows 服务安装
echo ============================================================
echo.

:: ── 默认值 ────────────────────────────────────────────────────
set SERVICE_NAME=MilestoneTracker
set SERVICE_PORT=30002
set NODE_PATH=node
set APP_DIR=

:: ── 1. 检查管理员权限 ─────────────────────────────────────────
echo [1/7] 检查管理员权限 ...
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 此脚本必须以管理员身份运行。
    echo         请右键点击此文件，选择"以管理员身份运行"。
    pause
    exit /b 1
)
echo         管理员权限确认。
echo.

:: ── 2. 检查 NSSM ─────────────────────────────────────────────
echo [2/7] 检查 NSSM ...
where nssm >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未找到 NSSM，请先安装 NSSM 并添加到 PATH。
    echo         下载地址: https://nssm.cc/download
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('nssm --version 2^>^&1 ^| findstr /r "[0-9]"') do set NSSM_VER=%%v
echo         NSSM 版本: %NSSM_VER%
echo.

:: ── 3. 解析应用目录 ──────────────────────────────────────────
echo [3/7] 解析应用目录 ...
:: APP_DIR = scripts/ 的上级目录（项目根目录）
set "APP_DIR=%~dp0.."
:: 去除末尾反斜杠
if "%APP_DIR:~-1%"=="\" set "APP_DIR=%APP_DIR:~0,-1%"
echo         应用目录: %APP_DIR%
echo.

:: ── 4. 验证构建产物 ──────────────────────────────────────────
echo [4/7] 验证构建产物 ...
if not exist "%APP_DIR%\build\index.js" (
    echo [错误] 未找到构建产物: %APP_DIR%\build\index.js
    echo         请先运行 build-and-run.bat 或 npm run build 进行构建。
    pause
    exit /b 1
)
echo         build\index.js 存在。
echo.

:: ── 5. 读取配置 ─────────────────────────────────────────────
echo [5/7] 读取部署配置 ...
set CONFIG_FILE=%APP_DIR%\deploy-config.bat
set CONFIG_ALT=%~dp0config\deploy-config.bat

if exist "%CONFIG_FILE%" (
    echo         使用配置文件: %CONFIG_FILE%
    call "%CONFIG_FILE%"
) else if exist "%CONFIG_ALT%" (
    echo         使用配置文件: %CONFIG_ALT%
    call "%CONFIG_ALT%"
) else (
    echo         未找到 deploy-config.bat，使用默认值。
    echo         可从 scripts\config\deploy-config.bat.example 复制并编辑。
)

:: 应用配置（deploy-config.bat 中可能已设置 SERVICE_NAME / SERVICE_PORT / NODE_PATH）
if "%SERVICE_NAME%"=="" set SERVICE_NAME=MilestoneTracker
if "%SERVICE_PORT%"=="" set SERVICE_PORT=30002
if "%NODE_PATH%"=="" set NODE_PATH=node
echo         服务名称: %SERVICE_NAME%
echo         服务端口: %SERVICE_PORT%
echo         Node路径: %NODE_PATH%
echo.

:: ── 6. 安装并配置服务 ────────────────────────────────────────
echo [6/7] 安装服务 '%SERVICE_NAME%' ...
nssm install %SERVICE_NAME% "%NODE_PATH%" "%APP_DIR%\build\index.js"
if %errorlevel% neq 0 (
    echo [错误] 服务安装失败，可能服务已存在。
    echo         请先运行 nssm remove %SERVICE_NAME% 确认后重试。
    pause
    exit /b 1
)
echo         服务安装成功。

:: ── 配置服务参数 ─────────────────────────────────────────────
echo         配置服务参数 ...

nssm set %SERVICE_NAME% AppDirectory "%APP_DIR%"
nssm set %SERVICE_NAME% DisplayName "Milestone Tracker - 里程碑跟踪系统"
nssm set %SERVICE_NAME% Description "Milestone Tracker 里程碑跟踪系统服务，提供任务管理和项目规划 API。"
nssm set %SERVICE_NAME% Start SERVICE_AUTO_START

:: ── 崩溃重启策略 ─────────────────────────────────────────────
nssm set %SERVICE_NAME% AppExit Default Restart
nssm set %SERVICE_NAME% AppRestartDelay 5000

:: ── 日志轮转配置 ─────────────────────────────────────────────
set LOG_DIR=%APP_DIR%\logs
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

nssm set %SERVICE_NAME% AppStdout "%LOG_DIR%\milestone-tracker.out.log"
nssm set %SERVICE_NAME% AppStderr "%LOG_DIR%\milestone-tracker.err.log"
nssm set %SERVICE_NAME% AppRotateFiles 1
nssm set %SERVICE_NAME% AppRotateBytes 10485760
nssm set %SERVICE_NAME% AppRotateBacklogCopies 5

echo.

:: ── 7. 设置环境变量 ──────────────────────────────────────────
echo [7/7] 配置环境变量 ...

set ENV_FILE=%APP_DIR%\.env
if exist "%ENV_FILE%" (
    echo         从 .env 读取环境变量 ...
    set APP_ENV=
    for /f "usebackq tokens=1,* delims==" %%a in ("%ENV_FILE%") do (
        set "line=%%a"
        if not "!line:~0,1!"=="#" (
            if not "%%a"=="" (
                set APP_ENV=!APP_ENV!%%a=%%b^
            )
        )
    )

    :: 去除末尾多余的分隔符
    if defined APP_ENV (
        :: 使用 NSSM 设置 AppEnvironmentExtra
        :: 需要将换行分隔的环境变量传递给 nssm
        for /f "tokens=*" %%e in ('echo !APP_ENV!') do (
            echo         设置环境: %%e
        )
        echo !APP_ENV! | nssm set %SERVICE_NAME% AppEnvironmentExtra -
        if %errorlevel% equ 0 (
            echo         环境变量配置成功。
        ) else (
            echo [警告] 环境变量设置失败，请手动运行:
            echo         nssm set %SERVICE_NAME% AppEnvironmentExtra PORT=%SERVICE_PORT% DATABASE_PATH=...
        )
    )
) else (
    echo         未找到 .env 文件，设置默认端口环境变量。
    nssm set %SERVICE_NAME% AppEnvironmentExtra PORT=%SERVICE_PORT%
    echo         已设置 PORT=%SERVICE_PORT%
)
echo.

:: ── 输出配置摘要 ─────────────────────────────────────────────
echo ============================================================
echo   服务安装完成！
echo.
echo   服务名称  : %SERVICE_NAME%
echo   启动类型  : 自动 (SERVICE_AUTO_START)
echo   应用目录  : %APP_DIR%
echo   入口文件  : build\index.js
echo   服务端口  : %SERVICE_PORT%
echo   Node 路径 : %NODE_PATH%
echo   日志目录  : %LOG_DIR%\
echo   stdout    : milestone-tracker.out.log
echo   stderr    : milestone-tracker.err.log
echo   日志轮转  : 10MB / 保留 5 份
echo   崩溃重启  : 5 秒延迟
echo.
echo   启动服务:  nssm start %SERVICE_NAME%
echo   停止服务:  nssm stop %SERVICE_NAME%
echo   查看状态:  nssm status %SERVICE_NAME%
echo   编辑服务:  nssm edit %SERVICE_NAME%
echo ============================================================
echo.
pause
endlocal
