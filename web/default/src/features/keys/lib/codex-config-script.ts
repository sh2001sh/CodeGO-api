import {
  getConfiguredServerAddress,
  normalizePublicServerAddress,
} from '@/lib/server-url'

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

function normalizeApiKey(value?: string): string {
  if (!value) return PLACEHOLDER_API_KEY
  return value.startsWith('sk-') ? value : `sk-${value}`
}

function normalizeServerAddress(value?: string): string {
  return normalizePublicServerAddress(
    value || getConfiguredServerAddress(PLACEHOLDER_SERVER_URL)
  )
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

function buildCodexProviderBlock(serverAddress: string): string {
  return `# BEGIN CODEXFORALL MANAGED PROVIDER
[model_providers.${CODEX_PROVIDER}]
name = "${CODEX_PROVIDER}"
base_url = "${serverAddress}/v1"
wire_api = "responses"
# END CODEXFORALL MANAGED PROVIDER`
}

function buildWindowsScript(
  serverAddress: string,
  apiKey: string,
  model: string
) {
  const apiBase = `${serverAddress}/v1`
  return `@echo off
setlocal enabledelayedexpansion

:: Code Go Codex config script (ASCII only)
echo.
echo Code Go Codex Config Script
echo ===========================
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

) else (
    mkdir "!codexDir!" 2>nul
    if !errorlevel! neq 0 (
        goto :error_mkdir
    )
)

powershell -NoProfile -ExecutionPolicy Bypass -Command "$configPath = Join-Path $env:USERPROFILE '.codex\\config.toml'; $dq = [char]34; $providerBlock = @('# BEGIN CODEXFORALL MANAGED PROVIDER','[model_providers.${CODEX_PROVIDER}]',[string]::Concat('name = ', $dq, '${CODEX_PROVIDER}', $dq),[string]::Concat('base_url = ', $dq, '${apiBase}', $dq),[string]::Concat('wire_api = ', $dq, 'responses', $dq),'# END CODEXFORALL MANAGED PROVIDER') -join [Environment]::NewLine; $existing = ''; if (Test-Path $configPath) { $existing = Get-Content -Raw -Encoding UTF8 $configPath }; $cleaned = $existing.TrimStart([char]0xFEFF); $managedMarker = '# BEGIN CODEXFORALL MANAGED PROVIDER'; $markerIndex = $cleaned.IndexOf($managedMarker, [System.StringComparison]::Ordinal); if ($markerIndex -gt 0) { $prefix = $cleaned.Substring(0, $markerIndex); $suffix = $cleaned.Substring($markerIndex); $prefixLines = @($prefix -split '\\r?\\n' | Where-Object { $_.Trim() -and -not $_.TrimStart().StartsWith('#') }); if ($prefixLines.Count -gt 0) { $allRepeated = $true; foreach ($line in $prefixLines) { if ($suffix.IndexOf($line, [System.StringComparison]::Ordinal) -lt 0) { $allRepeated = $false; break } }; if ($allRepeated) { $cleaned = $suffix.TrimStart() } } }; $patterns = @('(?ms)^# BEGIN CODEXFORALL MANAGED PROVIDER.*?^# END CODEXFORALL MANAGED PROVIDER\\s*','(?ms)^\\[model_providers\\.${CODEX_PROVIDER}\\]\\r?\\n.*?(?=^\\[|\\z)'); foreach ($pattern in $patterns) { $cleaned = [regex]::Replace($cleaned, $pattern, '') }; $cleaned = $cleaned.Trim(); $modelProviderLine = [string]::Concat('model_provider = ', $dq, '${CODEX_PROVIDER}', $dq); $modelLine = [string]::Concat('model = ', $dq, '${model}', $dq); if ([regex]::IsMatch($cleaned, '(?m)^model_provider\\s*=.*$')) { $cleaned = [regex]::Replace($cleaned, '(?m)^model_provider\\s*=.*$', [System.Text.RegularExpressions.MatchEvaluator]{ param($m) $modelProviderLine }) } elseif ($cleaned.Length -gt 0) { $cleaned = $modelProviderLine + [Environment]::NewLine + [Environment]::NewLine + $cleaned } else { $cleaned = $modelProviderLine }; if ([regex]::IsMatch($cleaned, '(?m)^model\\s*=.*$')) { $cleaned = [regex]::Replace($cleaned, '(?m)^model\\s*=.*$', [System.Text.RegularExpressions.MatchEvaluator]{ param($m) $modelLine }) } elseif ($cleaned.Length -gt 0) { $cleaned = $modelLine + [Environment]::NewLine + $cleaned } else { $cleaned = $modelLine }; $parts = @($cleaned.Trim(), $providerBlock.Trim()) | Where-Object { $_ }; $output = $parts -join ([Environment]::NewLine + [Environment]::NewLine); $encoding = New-Object System.Text.UTF8Encoding($false); [System.IO.File]::WriteAllText($configPath, $output + [Environment]::NewLine, $encoding)"

if !errorlevel! neq 0 (
    goto :error_write_config
)

if exist "!codexDir!\\auth.json" del /f /q "!codexDir!\\auth.json" >nul 2>&1

(
echo {
echo   "OPENAI_API_KEY": "!API_KEY!"
echo }
) > "!codexDir!\\auth.json" 2>nul

if !errorlevel! neq 0 (
    goto :error_write_auth
)

attrib +h "!codexDir!\\auth.json" >nul 2>&1

echo.
echo Codex configuration completed successfully.
echo Double-click run is complete. Codex is now configured.
echo.
echo Files:
echo   - config.toml: !codexDir!\\config.toml
echo   - auth.json:  !codexDir!\\auth.json
echo.
echo Press any key to exit...
pause >nul
exit /b 0

:error_no_key
echo ERROR: API Key not set.
echo Press any key to exit...
pause >nul
exit /b 1

:error_mkdir
echo ERROR: Cannot create directory !codexDir!
echo Press any key to exit...
pause >nul
exit /b 1

:error_write_config
echo ERROR: Cannot write config.toml
echo Press any key to exit...
pause >nul
exit /b 1

:error_write_auth
echo ERROR: Cannot rewrite auth.json
echo Press any key to exit...
pause >nul
exit /b 1
`
}

function buildLinuxScript(
  serverAddress: string,
  apiKey: string,
  model: string
) {
  const codexProviderBlock = buildCodexProviderBlock(serverAddress)
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
PROFILE_FILE="\${HOME}/.bashrc"
SOURCE_LINE='[ -f "$HOME/.config/codexforall/codex-env.sh" ] && source "$HOME/.config/codexforall/codex-env.sh"'

if [[ "\${SHELL:-}" == */zsh ]]; then
  PROFILE_FILE="\${HOME}/.zshrc"
fi

mkdir -p "\${TARGET_DIR}"
mkdir -p "\${CODEX_DIR}"

PYTHON_BIN="python3"
if ! command -v "\${PYTHON_BIN}" >/dev/null 2>&1; then
  PYTHON_BIN="python"
fi

if ! command -v "\${PYTHON_BIN}" >/dev/null 2>&1; then
  printf 'python3/python is required to update %s\\n' "\${CODEX_CONFIG_FILE}" >&2
  exit 1
fi

cat > "\${TARGET_FILE}" <<EOF
export OPENAI_BASE_URL="\${API_BASE}"
export OPENAI_API_BASE="\${API_BASE}"
export OPENAI_MODEL="\${MODEL}"
EOF

"\${PYTHON_BIN}" - "\${CODEX_CONFIG_FILE}" <<'PY'
from pathlib import Path
import re
import sys

config_path = Path(sys.argv[1])
provider_name = "${CODEX_PROVIDER}"
model_name = "${model}"
provider_block = """
${codexProviderBlock}
""".strip()

existing = config_path.read_text(encoding="utf-8") if config_path.exists() else ""
existing = existing.lstrip("\ufeff")
cleaned = existing
managed_marker = "# BEGIN CODEXFORALL MANAGED PROVIDER"
marker_index = cleaned.find(managed_marker)
if marker_index > 0:
    prefix = cleaned[:marker_index]
    suffix = cleaned[marker_index:]
    prefix_lines = [
        line.strip()
        for line in prefix.splitlines()
        if line.strip() and not line.lstrip().startswith("#")
    ]
    if prefix_lines and all(line in suffix for line in prefix_lines):
        cleaned = suffix.lstrip()
patterns = [
    r"(?ms)^# BEGIN CODEXFORALL MANAGED PROVIDER.*?^# END CODEXFORALL MANAGED PROVIDER\\s*",
    r"(?ms)^\\[model_providers\\.${CODEX_PROVIDER}\\]\\r?\\n.*?(?=^\\[|\\Z)",
]
for pattern in patterns:
    cleaned = re.sub(pattern, "", cleaned)

cleaned = cleaned.strip()
root_match = re.search(r"(?m)^\\[", cleaned)
if root_match:
    root_section = cleaned[:root_match.start()].strip()
    table_section = cleaned[root_match.start():].strip()
else:
    root_section = cleaned
    table_section = ""

root_lines = [line for line in root_section.splitlines() if line.strip()]

def upsert_root_setting(lines, key, value):
    setting = f'{key} = "{value}"'
    output = []
    replaced = False
    pattern = re.compile(rf"^{re.escape(key)}\\s*=")
    for line in lines:
        if pattern.match(line):
            if not replaced:
                output.append(setting)
                replaced = True
            continue
        output.append(line)
    if not replaced:
        output.append(setting)
    return output

root_lines = upsert_root_setting(root_lines, "model_provider", provider_name)
root_lines = upsert_root_setting(root_lines, "model", model_name)

parts = ["\\n".join(root_lines).strip(), table_section, provider_block]
output = "\\n\\n".join(part for part in parts if part.strip()) + "\\n"
config_path.write_text(output, encoding="utf-8")
PY

chmod 600 "\${TARGET_FILE}"
chmod 600 "\${CODEX_CONFIG_FILE}"

: > "\${CODEX_AUTH_FILE}"
cat > "\${CODEX_AUTH_FILE}" <<EOF
{"OPENAI_API_KEY":"\${API_KEY}"}
EOF
chmod 600 "\${CODEX_AUTH_FILE}"

touch "\${PROFILE_FILE}"

if ! grep -qxF "\${SOURCE_LINE}" "\${PROFILE_FILE}"; then
  printf '\\n%s\\n' "\${SOURCE_LINE}" >> "\${PROFILE_FILE}"
fi

printf 'Codex configuration completed successfully.\\n'
printf 'Config file: %s\\n' "\${CODEX_CONFIG_FILE}"
printf 'Environment file: %s\\n' "\${TARGET_FILE}"
printf 'Auth file: %s\\n' "\${CODEX_AUTH_FILE}"
printf 'Run: source "%s"\\n' "\${PROFILE_FILE}"
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
    throw new Error(
      'A real API key is required to generate a Codex setup script.'
    )
  }
  const serverAddress = normalizeServerAddress(options.serverAddress)
  const apiKey = normalizeApiKey(options.apiKey)
  const model = options.model || DEFAULT_CODEX_MODEL
  const keyLabel = sanitizeLabel(options.label)

  const filename =
    platform === 'windows'
      ? `windows-codex-config-${keyLabel}.bat`
      : `linux-mac-codex-config-${keyLabel}.sh`

  const content =
    platform === 'windows'
      ? buildWindowsScript(serverAddress, apiKey, model)
      : buildLinuxScript(serverAddress, apiKey, model)

  downloadTextFile(filename, content)
}
