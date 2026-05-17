const DEFAULT_CODEX_MODEL = 'gpt-5.2'
const PLACEHOLDER_SERVER_URL = 'https://your-codexforall.example.com'
const PLACEHOLDER_API_KEY = 'YOUR_CODEXFORALL_API_KEY'
const CODEX_PROVIDER = 'codexforall'

type ScriptPlatform = 'windows' | 'linux'

interface DownloadCodexScriptOptions {
  apiKey?: string
  serverAddress?: string
  label?: string
  model?: string
}

function getServerAddress(): string {
  try {
    const raw = localStorage.getItem('status')
    if (raw) {
      const status = JSON.parse(raw)
      if (status.server_address) return status.server_address
    }
  } catch {
    /* empty */
  }
  return window.location.origin
}

function normalizeApiKey(value?: string): string {
  if (!value) return PLACEHOLDER_API_KEY
  return value.startsWith('sk-') ? value : `sk-${value}`
}

function normalizeServerAddress(value?: string): string {
  const base = value || getServerAddress() || PLACEHOLDER_SERVER_URL
  return base.replace(/\/+$/, '')
}

function sanitizeLabel(value?: string): string {
  if (!value) return 'template'
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return normalized || 'template'
}

function buildCodexConfigBlock(serverAddress: string, model: string): string {
  return `# BEGIN CODEXFORALL MANAGED
model = "${model}"
model_provider = "${CODEX_PROVIDER}"

[model_providers.${CODEX_PROVIDER}]
name = "${CODEX_PROVIDER}"
base_url = "${serverAddress}/v1"
wire_api = "responses"
requires_openai_auth = true
# END CODEXFORALL MANAGED`
}

function buildWindowsScript(
  serverAddress: string,
  apiKey: string,
  model: string
) {
  const codexConfigBlock = buildCodexConfigBlock(serverAddress, model)
  return `@echo off
setlocal DisableDelayedExpansion

set "CODEXFORALL_SERVER_URL=${serverAddress}"
set "CODEXFORALL_API_BASE=%CODEXFORALL_SERVER_URL%/v1"
set "CODEXFORALL_API_KEY=${apiKey}"
set "CODEXFORALL_MODEL=${model}"
set "CODEXFORALL_CONFIG_DIR=%USERPROFILE%\\.codex"
set "CODEXFORALL_CONFIG_FILE=%CODEXFORALL_CONFIG_DIR%\\config.toml"

echo Configuring Codex CLI for codexforall...
echo.

if not exist "%CODEXFORALL_CONFIG_DIR%" mkdir "%CODEXFORALL_CONFIG_DIR%"

powershell -NoProfile -ExecutionPolicy Bypass -Command "$configPath = Join-Path $env:USERPROFILE '.codex\\config.toml'; $managedBlock = @'
${codexConfigBlock}
'@; $existing = ''; if (Test-Path $configPath) { $existing = Get-Content -Raw $configPath }; $pattern = '(?ms)^# BEGIN CODEXFORALL MANAGED\\r?\\n.*?^# END CODEXFORALL MANAGED\\r?\\n?'; $cleaned = [regex]::Replace($existing, $pattern, '').TrimEnd(); if ($cleaned.Length -gt 0) { $cleaned += [Environment]::NewLine + [Environment]::NewLine }; $encoding = New-Object System.Text.UTF8Encoding($false); [System.IO.File]::WriteAllText($configPath, $cleaned + $managedBlock + [Environment]::NewLine, $encoding)"
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
`
}

function buildLinuxScript(serverAddress: string, apiKey: string, model: string) {
  const codexConfigBlock = buildCodexConfigBlock(serverAddress, model)
  return `#!/usr/bin/env bash
set -euo pipefail

SERVER_URL="${serverAddress}"
API_BASE="\${SERVER_URL%/}/v1"
API_KEY="${apiKey}"
MODEL="${model}"

TARGET_DIR="\${HOME}/.config/codexforall"
TARGET_FILE="\${TARGET_DIR}/codex-env.sh"
CODEX_DIR="\${HOME}/.codex"
CODEX_CONFIG_FILE="\${CODEX_DIR}/config.toml"
TMP_CONFIG_FILE="\${CODEX_DIR}/config.toml.tmp"
PROFILE_FILE="\${HOME}/.bashrc"
SOURCE_LINE='[ -f "$HOME/.config/codexforall/codex-env.sh" ] && source "$HOME/.config/codexforall/codex-env.sh"'

if [[ "\${SHELL:-}" == */zsh ]]; then
  PROFILE_FILE="\${HOME}/.zshrc"
fi

mkdir -p "\${TARGET_DIR}"
mkdir -p "\${CODEX_DIR}"

cat > "\${TARGET_FILE}" <<EOF
export OPENAI_BASE_URL="\${API_BASE}"
export OPENAI_API_BASE="\${API_BASE}"
export OPENAI_API_KEY="\${API_KEY}"
export OPENAI_MODEL="\${MODEL}"
EOF

if [[ -f "\${CODEX_CONFIG_FILE}" ]]; then
  sed '/^# BEGIN CODEXFORALL MANAGED$/,/^# END CODEXFORALL MANAGED$/d' "\${CODEX_CONFIG_FILE}" > "\${TMP_CONFIG_FILE}"
else
  : > "\${TMP_CONFIG_FILE}"
fi

if [[ -s "\${TMP_CONFIG_FILE}" ]]; then
  printf '\\n' >> "\${TMP_CONFIG_FILE}"
fi

cat >> "\${TMP_CONFIG_FILE}" <<'EOF'
${codexConfigBlock}
EOF

mv "\${TMP_CONFIG_FILE}" "\${CODEX_CONFIG_FILE}"

chmod 600 "\${TARGET_FILE}"
chmod 600 "\${CODEX_CONFIG_FILE}"
touch "\${PROFILE_FILE}"

if ! grep -qxF "\${SOURCE_LINE}" "\${PROFILE_FILE}"; then
  printf '\\n%s\\n' "\${SOURCE_LINE}" >> "\${PROFILE_FILE}"
fi

printf 'Configured Codex CLI for codexforall.\\n'
printf 'Environment file: %s\\n' "\${TARGET_FILE}"
printf 'Codex config file: %s\\n' "\${CODEX_CONFIG_FILE}"
printf 'Shell profile: %s\\n' "\${PROFILE_FILE}"
printf 'Run: source "%s"\\n' "\${PROFILE_FILE}"
printf 'Then start Codex with: codex\\n'

if ! command -v codex >/dev/null 2>&1; then
  printf 'Codex CLI not found. Install it with: npm install -g @openai/codex\\n'
fi
`
}

function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

export function downloadCodexSetupScript(
  platform: ScriptPlatform,
  options: DownloadCodexScriptOptions = {}
) {
  if (!options.apiKey) {
    throw new Error('A real API key is required to generate a Codex setup script.')
  }
  const serverAddress = normalizeServerAddress(options.serverAddress)
  const apiKey = normalizeApiKey(options.apiKey)
  const model = options.model || DEFAULT_CODEX_MODEL
  const keyLabel = sanitizeLabel(options.label)

  const filename =
    platform === 'windows'
      ? `setup-codex-windows-${keyLabel}.bat`
      : `setup-codex-linux-${keyLabel}.sh`

  const content =
    platform === 'windows'
      ? buildWindowsScript(serverAddress, apiKey, model)
      : buildLinuxScript(serverAddress, apiKey, model)

  downloadTextFile(filename, content)
}
