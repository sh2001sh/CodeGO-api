@echo off
setlocal DisableDelayedExpansion

set "CODEXFORALL_SERVER_URL=https://your-codexforall.example.com"
set "CODEXFORALL_API_BASE=%CODEXFORALL_SERVER_URL%/v1"
set "CODEXFORALL_API_KEY=YOUR_CODEXFORALL_API_KEY"
set "CODEXFORALL_MODEL=gpt-5.2"
set "CODEXFORALL_CONFIG_DIR=%USERPROFILE%\.codex"
set "CODEXFORALL_CONFIG_FILE=%CODEXFORALL_CONFIG_DIR%\config.toml"

echo Configuring Codex CLI for codexforall...
echo.

if not exist "%CODEXFORALL_CONFIG_DIR%" mkdir "%CODEXFORALL_CONFIG_DIR%"

powershell -NoProfile -ExecutionPolicy Bypass -Command "$configPath = Join-Path $env:USERPROFILE '.codex\config.toml'; $managedBlock = @'
# BEGIN CODEXFORALL MANAGED
model = "gpt-5.2"
model_provider = "codexforall"

[model_providers.codexforall]
name = "codexforall"
base_url = "https://your-codexforall.example.com/v1"
wire_api = "responses"
requires_openai_auth = true
# END CODEXFORALL MANAGED
'@; $existing = ''; if (Test-Path $configPath) { $existing = Get-Content -Raw $configPath }; $pattern = '(?ms)^# BEGIN CODEXFORALL MANAGED\r?\n.*?^# END CODEXFORALL MANAGED\r?\n?'; $cleaned = [regex]::Replace($existing, $pattern, '').TrimEnd(); if ($cleaned.Length -gt 0) { $cleaned += [Environment]::NewLine + [Environment]::NewLine }; $encoding = New-Object System.Text.UTF8Encoding($false); [System.IO.File]::WriteAllText($configPath, $cleaned + $managedBlock + [Environment]::NewLine, $encoding)"
if errorlevel 1 (
  echo Failed to update %CODEXFORALL_CONFIG_FILE%.
  exit /b 1
)

setx OPENAI_BASE_URL "%CODEXFORALL_API_BASE%" >nul
setx OPENAI_API_BASE "%CODEXFORALL_API_BASE%" >nul
setx OPENAI_API_KEY "%CODEXFORALL_API_KEY%" >nul
setx OPENAI_MODEL "%CODEXFORALL_MODEL%" >nul

set "OPENAI_BASE_URL=%CODEXFORALL_API_BASE%"
set "OPENAI_API_BASE=%CODEXFORALL_API_BASE%"
set "OPENAI_API_KEY=%CODEXFORALL_API_KEY%"
set "OPENAI_MODEL=%CODEXFORALL_MODEL%"

echo Saved the following environment variables:
echo   OPENAI_BASE_URL=%OPENAI_BASE_URL%
echo   OPENAI_API_BASE=%OPENAI_API_BASE%
echo   OPENAI_API_KEY=%OPENAI_API_KEY%
echo   OPENAI_MODEL=%OPENAI_MODEL%
echo.
echo Updated Codex config file:
echo   %CODEXFORALL_CONFIG_FILE%
echo.
echo Reopen your terminal, then run: codex
where codex >nul 2>nul
if errorlevel 1 (
  echo.
  echo Codex CLI was not found in PATH.
  echo Install it with: npm install -g @openai/codex
)

pause
