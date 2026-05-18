const DEFAULT_CODEX_MODEL = 'gpt-5.2';
const PLACEHOLDER_SERVER_URL = 'https://your-codexforall.example.com';
const PLACEHOLDER_API_KEY = 'YOUR_CODEXFORALL_API_KEY';
const CODEX_PROVIDER = 'codexforall';

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
  const raw = (value || getServerAddress() || PLACEHOLDER_SERVER_URL).trim();
  const base = raw.replace(/\/+$/, '').replace(/\/v1$/i, '');

  try {
    const url = new URL(base);
    const isLocalhost = ['localhost', '127.0.0.1', '0.0.0.0'].includes(
      url.hostname
    );

    if (url.protocol === 'http:' && !isLocalhost) {
      url.protocol = 'https:';
    }

    return url.toString().replace(/\/+$/, '');
  } catch (_) {
    return base;
  }
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

function buildCodexRootBlock(model) {
  return `# BEGIN CODEXFORALL MANAGED ROOT
model = "${model}"
model_provider = "${CODEX_PROVIDER}"
# END CODEXFORALL MANAGED ROOT`;
}

function buildCodexProviderBlock(serverAddress) {
  return `# BEGIN CODEXFORALL MANAGED PROVIDER
[model_providers.${CODEX_PROVIDER}]
name = "${CODEX_PROVIDER}"
base_url = "${serverAddress}/v1"
wire_api = "responses"
requires_openai_auth = true
# END CODEXFORALL MANAGED PROVIDER`;
}

function buildWindowsScript(serverAddress, apiKey, model) {
  const apiBase = `${serverAddress}/v1`;
  return `@echo off
setlocal enabledelayedexpansion

:: CodexForAll Windows setup script (ASCII only)
echo.
echo CodexForAll Windows Setup
echo ======================
echo.

set "CODEXFORALL_SERVER_URL=${serverAddress}"
set "API_KEY=${apiKey}"
set "MODEL=${model}"

if "!API_KEY!"=="" goto :error_no_key
if "!API_KEY!"=="__API_KEY__" goto :error_no_key

set "codexDir=%USERPROFILE%\\.codex"
echo Config dir: !codexDir!
echo.

if exist "!codexDir!" (
    for /f "usebackq delims=" %%a in (\`powershell -NoProfile -Command "[DateTime]::Now.ToString('yyyyMMdd_HHmmss')"\`) do set TIMESTAMP=%%a

    if not defined TIMESTAMP (
        echo WARN: Failed to get timestamp, skipping backup.
        set "TIMESTAMP=manual"
    )

    if exist "!codexDir!\\config.toml" (
        copy "!codexDir!\\config.toml" "!codexDir!\\config.toml.backup_!TIMESTAMP!" >nul 2>&1
    )

    if exist "!codexDir!\\auth.json" (
        copy "!codexDir!\\auth.json" "!codexDir!\\auth.json.backup_!TIMESTAMP!" >nul 2>&1
    )
) else (
    mkdir "!codexDir!" 2>nul
    if !errorlevel! neq 0 (
        goto :error_mkdir
    )
)

(
echo model_provider = "${CODEX_PROVIDER}"
echo model = "${model}"
echo model_reasoning_effort = "high"
echo disable_response_storage = false
echo.
echo [model_providers.${CODEX_PROVIDER}]
echo name = "${CODEX_PROVIDER}"
echo base_url = "${apiBase}"
echo wire_api = "responses"
echo requires_openai_auth = true
echo web_search = "live"
) > "!codexDir!\\config.toml" 2>nul

if !errorlevel! neq 0 (
    goto :error_write_config
)

(
echo {
echo   "OPENAI_API_KEY": "!API_KEY!"
echo }
) > "!codexDir!\\auth.json" 2>nul

if !errorlevel! neq 0 (
    goto :error_write_auth
)

attrib +h "!codexDir!\\auth.json" >nul 2>&1

echo Completed. Files:
echo   - config.toml: !codexDir!\\config.toml
echo   - auth.json:  !codexDir!\\auth.json

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
`;
}

function buildLinuxScript(serverAddress, apiKey, model) {
  const codexRootBlock = buildCodexRootBlock(model);
  const codexProviderBlock = buildCodexProviderBlock(serverAddress);
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
CODEX_AUTH_FILE="\${CODEX_DIR}/auth.json"
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
  awk '
    BEGIN { in_managed = 0; in_provider = 0 }
    /^# BEGIN CODEXFORALL MANAGED/ { in_managed = 1; next }
    in_managed && /^# END CODEXFORALL MANAGED/ { in_managed = 0; next }
    in_managed { next }
    /^model[[:space:]]*=/ { next }
    /^model_provider[[:space:]]*=/ { next }
    /^\\[model_providers\\.${CODEX_PROVIDER}\\]$/ { in_provider = 1; next }
    in_provider {
      if (/^\\[/) {
        in_provider = 0
        print \$0
      }
      next
    }
    { print }
  ' "\${CODEX_CONFIG_FILE}" > "\${TMP_CONFIG_FILE}"
else
  : > "\${TMP_CONFIG_FILE}"
fi

mv "\${TMP_CONFIG_FILE}" "\${CODEX_CONFIG_FILE}"
cleaned_content="$(cat "\${CODEX_CONFIG_FILE}")"

cat > "\${TMP_CONFIG_FILE}" <<'EOF'
${codexRootBlock}
EOF

if [[ -n "\${cleaned_content}" ]]; then
  printf '\\n%s\\n' "\${cleaned_content}" >> "\${TMP_CONFIG_FILE}"
fi

printf '\\n' >> "\${TMP_CONFIG_FILE}"

cat >> "\${TMP_CONFIG_FILE}" <<'EOF'
${codexProviderBlock}
EOF

mv "\${TMP_CONFIG_FILE}" "\${CODEX_CONFIG_FILE}"

chmod 600 "\${TARGET_FILE}"
chmod 600 "\${CODEX_CONFIG_FILE}"
printf '{"OPENAI_API_KEY":"%s"}\n' "\${API_KEY}" > "\${CODEX_AUTH_FILE}"
chmod 600 "\${CODEX_AUTH_FILE}"
touch "\${PROFILE_FILE}"

if ! grep -qxF "\${SOURCE_LINE}" "\${PROFILE_FILE}"; then
  printf '\\n%s\\n' "\${SOURCE_LINE}" >> "\${PROFILE_FILE}"
fi

printf 'Configured Codex CLI for codexforall.\\n'
printf 'Environment file: %s\\n' "\${TARGET_FILE}"
printf 'Codex config file: %s\\n' "\${CODEX_CONFIG_FILE}"
printf 'Codex auth file: %s\\n' "\${CODEX_AUTH_FILE}"
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
  if (!options.apiKey) {
    throw new Error('A real API key is required to generate a Codex setup script.');
  }
  const serverAddress = normalizeServerAddress(options.serverAddress);
  const apiKey = normalizeApiKey(options.apiKey);
  const model = options.model || DEFAULT_CODEX_MODEL;
  const keyLabel = sanitizeLabel(options.label);

  const filename =
    platform === 'windows'
      ? `setup-codex-windows-${keyLabel}.bat`
      : `setup-codex-linux-${keyLabel}.sh`;

  const content =
    platform === 'windows'
      ? buildWindowsScript(serverAddress, apiKey, model)
      : buildLinuxScript(serverAddress, apiKey, model);

  downloadTextFile(filename, content);
}
