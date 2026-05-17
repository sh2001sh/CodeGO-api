@echo off
setlocal

set "CODEXFORALL_SERVER_URL=https://your-codexforall.example.com"
set "CODEXFORALL_API_BASE=%CODEXFORALL_SERVER_URL%/v1"
set "CODEXFORALL_API_KEY=YOUR_CODEXFORALL_API_KEY"
set "CODEXFORALL_MODEL=gpt-5.2-codex"

echo Configuring Codex CLI for codexforall...
echo.

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
echo Reopen your terminal, then run: codex
where codex >nul 2>nul
if errorlevel 1 (
  echo.
  echo Codex CLI was not found in PATH.
  echo Install it with: npm install -g @openai/codex
)

pause
