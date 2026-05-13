@echo off
setlocal enabledelayedexpansion
chcp 65001 > nul 2>&1
title Milestone Tracker - 部署

:: ════════════════════════════════════════════════════════════════
::  deploy.bat — 本地构建 → SCP 全量推送 → NSSM 重启 → 健康检查
:: ════════════════════════════════════════════════════════════════
::
::  使用方法:
::    1. 复制 scripts\config\deploy-config.bat.example 为 deploy-config.bat
::    2. 编辑 deploy-config.bat 填入实际服务器配置
::    3. 运行 scripts\deploy.bat
::
::  流程:
::    [1/6] 预检查 — 加载配置、验证 SSH、Node.js
::    [2/6] 构建   — npm run build
::    [3/6] 裁剪   — npm prune --production
::    [4/6] 推送   — SCP build/ + node_modules/ + package.json
::    [5/6] 重启   — NSSM restart（通过 SSH）
::    [6/6] 验证   — 健康检查（带重试）
:: ════════════════════════════════════════════════════════════════

set SCRIPT_DIR=%~dp0
set APP_DIR=%SCRIPT_DIR%..

:: ── 默认值（被 deploy-config.bat 覆盖）───────────────────────
set SSH_ALIAS=
set REMOTE_HOST=
set REMOTE_USER=
set REMOTE_PATH=
set SSH_PORT=22
set SSH_KEY_PATH=
set SERVICE_NAME=MilestoneTracker
set SERVICE_PORT=30002
set NODE_PATH=node
set HEALTH_CHECK_URL=http://172.18.200.47:30002/api/health
set HEALTH_CHECK_RETRIES=3
set HEALTH_CHECK_INTERVAL=2
set AUTO_RESTART=yes
set BACKUP_BEFORE_DEPLOY=yes
set BACKUP_KEEP_COUNT=3

:: ── 辅助函数：输出带时间戳的状态 ─────────────────────────────
:timestamp
for /f "tokens=1-3 delims=:. " %%a in ("%time%") do (
    set TS=%%a:%%b:%%c
)
goto :eof

:: ════════════════════════════════════════════════════════════════
::  [1/6] 预检查
:: ════════════════════════════════════════════════════════════════
echo ============================================================
echo   Milestone Tracker - 部署
echo ============================================================
echo.

echo [1/6] 预检查 ...
echo.

:: 1a. 加载部署配置
echo      加载部署配置 ...
set CONFIG_FILE=%APP_DIR%\deploy-config.bat
set CONFIG_ALT=%SCRIPT_DIR%config\deploy-config.bat

if exist "%CONFIG_FILE%" (
    echo      使用配置: %CONFIG_FILE%
    call "%CONFIG_FILE%"
) else if exist "%CONFIG_ALT%" (
    echo      使用配置: %CONFIG_ALT%
    call "%CONFIG_ALT%"
) else (
    echo [错误] 未找到部署配置文件。
    echo.
    echo         请创建配置文件（二选一）：
    echo           1. copy scripts\config\deploy-config.bat.example deploy-config.bat
    echo           2. copy scripts\config\deploy-config.bat.example scripts\config\deploy-config.bat
    echo.
    echo         然后编辑填入实际服务器地址和凭据。
    exit /b 1
)

:: 1b. 验证必要配置
if "%SSH_ALIAS%"=="" if "%REMOTE_HOST%"=="" (
    echo [错误] SSH_ALIAS 或 REMOTE_HOST 必须配置其中之一。
    echo         请编辑 deploy-config.bat 设置 SSH 别名或远程主机地址。
    exit /b 1
)

if "%REMOTE_PATH%"=="" (
    echo [错误] REMOTE_PATH 未配置。
    echo         请编辑 deploy-config.bat 设置远程部署路径。
    exit /b 1
)

:: 确定 SSH 连接目标
if not "%SSH_ALIAS%"=="" (
    set SSH_TARGET=%SSH_ALIAS%
) else (
    if not "%SSH_KEY_PATH%"=="" (
        set SSH_TARGET=-i "%SSH_KEY_PATH%" -p %SSH_PORT% %REMOTE_USER%@%REMOTE_HOST%
    ) else (
        set SSH_TARGET=-p %SSH_PORT% %REMOTE_USER%@%REMOTE_HOST%
    )
)

:: 确定 SCP 源参数
if not "%SSH_KEY_PATH%"=="" (
    set SCP_OPTS=-i "%SSH_KEY_PATH%" -P %SSH_PORT% -r
) else (
    set SCP_OPTS=-P %SSH_PORT% -r
)

if not "%SSH_ALIAS%"=="" (
    set SCP_REMOTE=%SSH_ALIAS%:%REMOTE_PATH%
) else (
    if not "%SSH_KEY_PATH%"=="" (
        set SCP_REMOTE=-i "%SSH_KEY_PATH%" -P %SSH_PORT% %REMOTE_USER%@%REMOTE_HOST%:%REMOTE_PATH%
    ) else (
        set SCP_REMOTE=-P %SSH_PORT% %REMOTE_USER%@%REMOTE_HOST%:%REMOTE_PATH%
    )
)

echo      SSH 目标  : %SSH_TARGET%
echo      远程路径  : %REMOTE_PATH%
echo      健康检查  : %HEALTH_CHECK_URL%
echo.

:: 1c. 检查 Node.js
echo      检查 Node.js ...
where node > nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未找到 Node.js，请先安装 Node.js 18+。
    exit /b 1
)
for /f "tokens=*" %%v in ('node -v') do set NODE_VER=%%v
echo      Node.js: %NODE_VER%
echo.

:: 1d. 检查 SSH 连接
echo      检查 SSH 连接 ...
ssh -o ConnectTimeout=10 -o BatchMode=yes %SSH_TARGET% "echo ok" > nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 无法连接到远程服务器 %SSH_TARGET%。
    echo.
    echo         请检查：
    echo           - SSH 密钥已配置（ssh-keygen / ssh-copy-id）
    echo           - 服务器地址和端口正确
    echo           - 网络连接正常
    exit /b 1
)
echo      SSH 连接正常。
echo.

:: ════════════════════════════════════════════════════════════════
::  [2/6] 构建
:: ════════════════════════════════════════════════════════════════
echo [2/6] 构建项目 ...
echo.
call npm run build
if %errorlevel% neq 0 (
    echo [错误] 构建失败，中止部署。请检查上方错误信息。
    exit /b 1
)
echo      构建成功。
echo.

:: ════════════════════════════════════════════════════════════════
::  [3/6] 裁剪依赖（减少传输体积）
:: ════════════════════════════════════════════════════════════════
echo [3/6] 裁剪生产依赖 ...
echo.
call npm prune --production
if %errorlevel% neq 0 (
    echo [警告] npm prune --production 失败，跳过裁剪，使用完整 node_modules。
    echo         这可能导致传输体积增大。
)
echo      依赖裁剪完成。
echo.

:: ════════════════════════════════════════════════════════════════
::  [4/6] SCP 推送
:: ════════════════════════════════════════════════════════════════
echo [4/6] 推送文件到远程服务器 ...
echo.

:: 4a. 创建远程目录结构
echo      创建远程目录 ...
ssh %SSH_TARGET% "mkdir -p %REMOTE_PATH%\build %REMOTE_PATH%\logs %REMOTE_PATH%\data"
if %errorlevel% neq 0 (
    echo [错误] 创建远程目录失败。
    exit /b 1
)
echo      远程目录就绪。
echo.

:: 4b. 推送 build/ 目录
echo      推送 build/ ...
scp %SCP_OPTS% "%APP_DIR%\build" %SCP_REMOTE%
if %errorlevel% neq 0 (
    echo [警告] build/ 首次推送失败，重试中 ...
    scp %SCP_OPTS% "%APP_DIR%\build" %SCP_REMOTE%
    if %errorlevel% neq 0 (
        echo [错误] build/ 推送失败，中止部署。
        exit /b 1
    )
)
echo      build/ 推送完成。
echo.

:: 4c. 推送 node_modules/ 目录
echo      推送 node_modules/（可能需要较长时间）...
scp %SCP_OPTS% "%APP_DIR%\node_modules" %SCP_REMOTE%
if %errorlevel% neq 0 (
    echo [警告] node_modules/ 首次推送失败，重试中 ...
    scp %SCP_OPTS% "%APP_DIR%\node_modules" %SCP_REMOTE%
    if %errorlevel% neq 0 (
        echo [错误] node_modules/ 推送失败，中止部署。
        exit /b 1
    )
)
echo      node_modules/ 推送完成。
echo.

:: 4d. 推送 package.json
echo      推送 package.json ...
scp %SCP_OPTS% "%APP_DIR%\package.json" %SCP_REMOTE%
if %errorlevel% neq 0 (
    echo [错误] package.json 推送失败，中止部署。
    exit /b 1
)
echo      package.json 推送完成。
echo.

:: ════════════════════════════════════════════════════════════════
::  [5/6] 重启服务
:: ════════════════════════════════════════════════════════════════
echo [5/6] 重启远程服务 ...
echo.

if /i "%AUTO_RESTART%"=="yes" (
    echo      通过 NSSM 重启服务 '%SERVICE_NAME%' ...
    ssh %SSH_TARGET% "nssm restart %SERVICE_NAME%"
    if %errorlevel% neq 0 (
        echo [错误] 服务重启失败。
        echo.
        echo      诊断信息：
        ssh %SSH_TARGET% "nssm status %SERVICE_NAME%" 2>&1
        echo.
        echo      最近日志：
        ssh %SSH_TARGET% "if exist %REMOTE_PATH%\logs\milestone-tracker.err.log (type %REMOTE_PATH%\logs\milestone-tracker.err.log | more +0) else (echo 无错误日志)" 2>&1
        exit /b 1
    )
    echo      服务重启命令已发送。
    echo      等待服务启动（2 秒）...
    timeout /t 2 /nobreak > nul
    echo      服务重启完成。
) else (
    echo      AUTO_RESTART=no，跳过自动重启。
    echo      请手动重启服务：ssh %SSH_TARGET% "nssm restart %SERVICE_NAME%"
)
echo.

:: ════════════════════════════════════════════════════════════════
::  [6/6] 健康检查
:: ════════════════════════════════════════════════════════════════
echo [6/6] 健康检查 ...
echo.

set HEALTH_PASSED=0
for /l %%i in (1,1,%HEALTH_CHECK_RETRIES%) do (
    echo      第 %%i/%HEALTH_CHECK_RETRIES% 次检查: %HEALTH_CHECK_URL%
    
    :: 使用 curl 获取健康检查响应
    for /f "usebackq tokens=*" %%r in ('curl -s --connect-timeout 5 --max-time 10 "%HEALTH_CHECK_URL%" 2^>^&1') do (
        set HEALTH_RESPONSE=%%r
    )
    
    :: 检查响应中是否包含 "ok"
    echo %HEALTH_RESPONSE% | findstr /i /c:"\"ok\"" > nul 2>&1
    if !errorlevel! equ 0 (
        set HEALTH_PASSED=1
        echo      响应: %HEALTH_RESPONSE%
        echo.
        goto :health_done
    ) else (
        echo      响应异常: %HEALTH_RESPONSE%
    )
    
    if %%i lss %HEALTH_CHECK_RETRIES% (
        echo      等待 %HEALTH_CHECK_INTERVAL% 秒后重试 ...
        timeout /t %HEALTH_CHECK_INTERVAL% /nobreak > nul
    )
)

:health_done
if %HEALTH_PASSED% equ 0 (
    echo.
    echo [错误] 健康检查失败（已重试 %HEALTH_CHECK_RETRIES% 次）。
    echo.
    echo      诊断信息：
    echo.
    echo      服务状态：
    ssh %SSH_TARGET% "nssm status %SERVICE_NAME%" 2>&1
    echo.
    echo      错误日志（最后 20 行）：
    ssh %SSH_TARGET% "if exist %REMOTE_PATH%\logs\milestone-tracker.err.log (powershell -Command \"Get-Content %REMOTE_PATH%\logs\milestone-tracker.err.log -Tail 20\") else (echo 无错误日志)" 2>&1
    echo.
    echo      标准输出日志（最后 20 行）：
    ssh %SSH_TARGET% "if exist %REMOTE_PATH%\logs\milestone-tracker.out.log (powershell -Command \"Get-Content %REMOTE_PATH%\logs\milestone-tracker.out.log -Tail 20\") else (echo 无输出日志)" 2>&1
    exit /b 1
)
echo.

:: ════════════════════════════════════════════════════════════════
::  部署摘要
:: ════════════════════════════════════════════════════════════════
echo ============================================================
echo   部署完成！
echo.
echo   服务名称  : %SERVICE_NAME%
echo   远程路径  : %REMOTE_PATH%
echo   服务 URL  : %HEALTH_CHECK_URL%
echo   健康状态  : OK
echo   构建时间  : %date% %time%
echo.
echo   管理命令：
echo     查看状态: ssh %SSH_TARGET% "nssm status %SERVICE_NAME%"
echo     查看日志: ssh %SSH_TARGET% "dir %REMOTE_PATH%\logs"
echo     重启服务: ssh %SSH_TARGET% "nssm restart %SERVICE_NAME%"
echo     停止服务: ssh %SSH_TARGET% "nssm stop %SERVICE_NAME%"
echo ============================================================
echo.
endlocal
