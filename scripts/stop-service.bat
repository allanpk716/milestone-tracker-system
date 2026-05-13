@echo off
setlocal enabledelayedexpansion
chcp 65001 > nul 2>&1
title Milestone Tracker - 停止服务

:: ════════════════════════════════════════════════════════════════
::  stop-service.bat — 通过 SSH 远程停止 NSSM 服务
:: ════════════════════════════════════════════════════════════════

set SCRIPT_DIR=%~dp0
set APP_DIR=%SCRIPT_DIR%..

:: ── 默认值 ────────────────────────────────────────────────────
set SSH_ALIAS=
set REMOTE_HOST=
set REMOTE_USER=
set SSH_PORT=22
set SSH_KEY_PATH=
set SERVICE_NAME=MilestoneTracker

:: ── 加载部署配置 ──────────────────────────────────────────────
set CONFIG_FILE=%APP_DIR%\deploy-config.bat
set CONFIG_ALT=%SCRIPT_DIR%config\deploy-config.bat

if exist "%CONFIG_FILE%" (
    call "%CONFIG_FILE%"
) else if exist "%CONFIG_ALT%" (
    call "%CONFIG_ALT%"
) else (
    echo [错误] 未找到部署配置文件。
    echo         请从 scripts\config\deploy-config.bat.example 复制并编辑。
    exit /b 1
)

:: ── 确定 SSH 连接目标 ────────────────────────────────────────
if not "%SSH_ALIAS%"=="" (
    set SSH_TARGET=%SSH_ALIAS%
) else (
    if not "%SSH_KEY_PATH%"=="" (
        set SSH_TARGET=-i "%SSH_KEY_PATH%" -p %SSH_PORT% %REMOTE_USER%@%REMOTE_HOST%
    ) else (
        set SSH_TARGET=-p %SSH_PORT% %REMOTE_USER%@%REMOTE_HOST%
    )
)

:: ── 停止服务 ──────────────────────────────────────────────────
echo ============================================================
echo   Milestone Tracker - 停止服务
echo ============================================================
echo.
echo   服务名称: %SERVICE_NAME%
echo   SSH 目标: %SSH_TARGET%
echo.

echo   正在停止服务 ...
ssh %SSH_TARGET% "nssm stop %SERVICE_NAME%"
if %errorlevel% neq 0 (
    echo.
    echo [错误] 服务停止失败。
    echo.
    echo   诊断信息：
    ssh %SSH_TARGET% "nssm status %SERVICE_NAME%" 2>&1
    exit /b 1
)

echo   服务已停止。
echo.
echo ============================================================
echo.
endlocal
