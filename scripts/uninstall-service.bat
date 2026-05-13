@echo off
setlocal enabledelayedexpansion
chcp 65001 > nul 2>&1
title Milestone Tracker - 卸载服务

:: ════════════════════════════════════════════════════════════════
::  uninstall-service.bat — 通过 SSH 远程卸载 NSSM 服务
::  流程：停止服务 → 确认 → 移除服务
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

:: ── 确认卸载 ──────────────────────────────────────────────────
echo ============================================================
echo   Milestone Tracker - 卸载服务
echo ============================================================
echo.
echo   服务名称: %SERVICE_NAME%
echo   SSH 目标: %SSH_TARGET%
echo.
echo   ⚠️  此操作将永久删除服务 '%SERVICE_NAME%'！
echo   服务停止后无法自动恢复，需要重新运行 install-service.bat。
echo.

set /p CONFIRM="确认卸载？(输入 YES 继续): "
if /i not "%CONFIRM%"=="YES" (
    echo   已取消卸载。
    exit /b 0
)
echo.

:: ── 1. 停止服务（忽略错误，服务可能已停止）────────────────────
echo [1/2] 停止服务 ...
ssh %SSH_TARGET% "nssm stop %SERVICE_NAME%" 2>nul
echo   停止命令已发送（忽略错误）。
echo.

:: ── 2. 移除服务 ──────────────────────────────────────────────
echo [2/2] 移除服务 ...
ssh %SSH_TARGET% "nssm remove %SERVICE_NAME% confirm"
if %errorlevel% neq 0 (
    echo.
    echo [错误] 服务移除失败。
    echo.
    echo   可能原因：
    echo     - 服务不存在或已被移除
    echo     - 权限不足
    echo   诊断信息：
    ssh %SSH_TARGET% "nssm status %SERVICE_NAME%" 2>&1
    exit /b 1
)

echo   服务已成功移除。
echo.
echo ============================================================
echo   卸载完成。
echo.
echo   如需重新安装，请运行：scripts\install-service.bat
echo ============================================================
echo.
endlocal
