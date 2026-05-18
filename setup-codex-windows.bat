@echo off
setlocal enabledelayedexpansion

:: CodexForAll Windows setup script (ASCII only)
echo.
echo CodexForAll Windows Setup
echo ======================
echo.

set "CODEXFORALL_SERVER_URL=https://your-codexforall.example.com"
set "API_KEY=YOUR_CODEXFORALL_API_KEY"
set "MODEL=gpt-5.2"

if "!API_KEY!"=="" goto :error_no_key
if "!API_KEY!"=="__API_KEY__" goto :error_no_key

set "codexDir=%USERPROFILE%\.codex"
echo Config dir: !codexDir!
echo.

if exist "!codexDir!" (
    for /f "usebackq delims=" %%a in (`powershell -NoProfile -Command "[DateTime]::Now.ToString('yyyyMMdd_HHmmss')"`) do set TIMESTAMP=%%a

    if not defined TIMESTAMP (
        echo WARN: Failed to get timestamp, skipping backup.
        set "TIMESTAMP=manual"
    )

    if exist "!codexDir!\config.toml" (
        copy "!codexDir!\config.toml" "!codexDir!\config.toml.backup_!TIMESTAMP!" >nul 2>&1
    )

    if exist "!codexDir!\auth.json" (
        copy "!codexDir!\auth.json" "!codexDir!\auth.json.backup_!TIMESTAMP!" >nul 2>&1
    )
) else (
    mkdir "!codexDir!" 2>nul
    if !errorlevel! neq 0 (
        goto :error_mkdir
    )
)

(
echo model_provider = "codexforall"
echo model = "gpt-5.2"
echo model_reasoning_effort = "high"
echo disable_response_storage = false
echo.
echo [model_providers.codexforall]
echo name = "codexforall"
echo base_url = "!CODEXFORALL_SERVER_URL!/v1"
echo wire_api = "responses"
echo requires_openai_auth = true
echo web_search = "live"
) > "!codexDir!\config.toml" 2>nul

if !errorlevel! neq 0 (
    goto :error_write_config
)

(
echo {
echo   "OPENAI_API_KEY": "!API_KEY!"
echo }
) > "!codexDir!\auth.json" 2>nul

if !errorlevel! neq 0 (
    goto :error_write_auth
)

attrib +h "!codexDir!\auth.json" >nul 2>&1

echo Completed. Files:
echo   - config.toml: !codexDir!\config.toml
echo   - auth.json:  !codexDir!\auth.json

exit /b 0

:error_no_key
echo ERROR: API Key not set.
exit /b 1

:error_mkdir
echo ERROR: Cannot create directory !codexDir!
exit /b 1

:error_write_config
echo ERROR: Cannot write config.toml
exit /b 1

:error_write_auth
echo ERROR: Cannot write auth.json
exit /b 1
