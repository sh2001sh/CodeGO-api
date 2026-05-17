const DEFAULT_CODEX_MODEL = 'gpt-5.2-codex';
const PLACEHOLDER_SERVER_URL = 'https://your-codexforall.example.com';
const PLACEHOLDER_API_KEY = 'YOUR_CODEXFORALL_API_KEY';

function getServerAddress() {
  try {
    const raw = localStorage.getItem('status');
    if (raw) {
      const status = JSON.parse(raw);
      if (status.server_address) return status.server_address;
    }
  } catch (_) {}
  return window.location.origin;
}

function normalizeApiKey(value) {
  if (!value) return PLACEHOLDER_API_KEY;
  return value.startsWith('sk-') ? value : `sk-${value}`;
}

function normalizeServerAddress(value) {
  const base = value || getServerAddress() || PLACEHOLDER_SERVER_URL;
  return base.replace(/\/+$/, '');
}

function sanitizeLabel(value) {
  if (!value) return 'template';
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return normalized || 'template';
}

function buildWindowsScript(serverAddress, apiKey, model) {
  return `@echo off
setlocal

set "CODEXFORALL_SERVER_URL=${serverAddress}"
set "CODEXFORALL_API_BASE=%CODEXFORALL_SERVER_URL%/v1"
set "CODEXFORALL_API_KEY=${apiKey}"
set "CODEXFORALL_MODEL=${model}"

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
`;
}

function buildLinuxScript(serverAddress, apiKey, model) {
  return `#!/usr/bin/env bash
set -euo pipefail

SERVER_URL="${serverAddress}"
API_BASE="\${SERVER_URL%/}/v1"
API_KEY="${apiKey}"
MODEL="${model}"

TARGET_DIR="\${HOME}/.config/codexforall"
TARGET_FILE="\${TARGET_DIR}/codex-env.sh"
PROFILE_FILE="\${HOME}/.bashrc"
SOURCE_LINE='[ -f "$HOME/.config/codexforall/codex-env.sh" ] && source "$HOME/.config/codexforall/codex-env.sh"'

if [[ "\${SHELL:-}" == */zsh ]]; then
  PROFILE_FILE="\${HOME}/.zshrc"
fi

mkdir -p "\${TARGET_DIR}"

cat > "\${TARGET_FILE}" <<EOF
export OPENAI_BASE_URL="\${API_BASE}"
export OPENAI_API_BASE="\${API_BASE}"
export OPENAI_API_KEY="\${API_KEY}"
export OPENAI_MODEL="\${MODEL}"
EOF

chmod 600 "\${TARGET_FILE}"
touch "\${PROFILE_FILE}"

if ! grep -qxF "\${SOURCE_LINE}" "\${PROFILE_FILE}"; then
  printf '\\n%s\\n' "\${SOURCE_LINE}" >> "\${PROFILE_FILE}"
fi

printf 'Configured Codex CLI for codexforall.\\n'
printf 'Environment file: %s\\n' "\${TARGET_FILE}"
printf 'Shell profile: %s\\n' "\${PROFILE_FILE}"
printf 'Run: source "%s"\\n' "\${PROFILE_FILE}"
printf 'Then start Codex with: codex\\n'

if ! command -v codex >/dev/null 2>&1; then
  printf 'Codex CLI not found. Install it with: npm install -g @openai/codex\\n'
fi
`;
}

function downloadTextFile(filename, content) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function downloadCodexSetupScript(platform, options = {}) {
  const serverAddress = normalizeServerAddress(options.serverAddress);
  const apiKey = normalizeApiKey(options.apiKey);
  const model = options.model || DEFAULT_CODEX_MODEL;
  const keyLabel = sanitizeLabel(options.label);
  const hasRealKey = Boolean(options.apiKey);

  const filename =
    platform === 'windows'
      ? hasRealKey
        ? `setup-codex-windows-${keyLabel}.bat`
        : 'setup-codex-windows.bat'
      : hasRealKey
        ? `setup-codex-linux-${keyLabel}.sh`
        : 'setup-codex-linux.sh';

  const content =
    platform === 'windows'
      ? buildWindowsScript(serverAddress, apiKey, model)
      : buildLinuxScript(serverAddress, apiKey, model);

  downloadTextFile(filename, content);
}
