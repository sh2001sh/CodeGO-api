#!/usr/bin/env bash
set -euo pipefail

SERVER_URL="https://your-codexforall.example.com"
API_BASE="${SERVER_URL%/}/v1"
API_KEY="YOUR_CODEXFORALL_API_KEY"
MODEL="gpt-5.2"

TARGET_DIR="${HOME}/.config/codexforall"
TARGET_FILE="${TARGET_DIR}/codex-env.sh"
CODEX_DIR="${HOME}/.codex"
CODEX_CONFIG_FILE="${CODEX_DIR}/config.toml"
CODEX_AUTH_FILE="${CODEX_DIR}/auth.json"
PROFILE_FILE="${HOME}/.bashrc"
SOURCE_LINE='[ -f "$HOME/.config/codexforall/codex-env.sh" ] && source "$HOME/.config/codexforall/codex-env.sh"'

if [[ "${SHELL:-}" == */zsh ]]; then
  PROFILE_FILE="${HOME}/.zshrc"
fi

mkdir -p "${TARGET_DIR}"
mkdir -p "${CODEX_DIR}"

PYTHON_BIN="python3"
if ! command -v "${PYTHON_BIN}" >/dev/null 2>&1; then
  PYTHON_BIN="python"
fi

if ! command -v "${PYTHON_BIN}" >/dev/null 2>&1; then
  printf 'python3/python is required to update %s\n' "${CODEX_CONFIG_FILE}" >&2
  exit 1
fi

cat > "${TARGET_FILE}" <<EOF
export OPENAI_BASE_URL="${API_BASE}"
export OPENAI_API_BASE="${API_BASE}"
export OPENAI_API_KEY="${API_KEY}"
export OPENAI_MODEL="${MODEL}"
EOF

"${PYTHON_BIN}" - "${CODEX_CONFIG_FILE}" <<'PY'
from pathlib import Path
import re
import sys

config_path = Path(sys.argv[1])
provider_name = "codexforall"
provider_block = """
# BEGIN CODEXFORALL MANAGED PROVIDER
[model_providers.codexforall]
name = "codexforall"
base_url = "https://your-codexforall.example.com/v1"
wire_api = "responses"
requires_openai_auth = true
# END CODEXFORALL MANAGED PROVIDER
""".strip()

existing = config_path.read_text(encoding="utf-8") if config_path.exists() else ""
existing = existing.lstrip("\ufeff")
cleaned = existing
patterns = [
    r"(?ms)^# BEGIN CODEXFORALL MANAGED PROVIDER.*?^# END CODEXFORALL MANAGED PROVIDER\s*",
    r"(?ms)^\[model_providers\.codexforall\]\r?\n.*?(?=^\[|\Z)",
]
for pattern in patterns:
    cleaned = re.sub(pattern, "", cleaned)

cleaned = cleaned.strip()
model_provider_line = f'model_provider = "{provider_name}"'
if re.search(r"(?m)^model_provider\s*=.*$", cleaned):
    cleaned = re.sub(r"(?m)^model_provider\s*=.*$", model_provider_line, cleaned)
elif cleaned:
    cleaned = model_provider_line + "\n\n" + cleaned
else:
    cleaned = model_provider_line

parts = [provider_block, cleaned.strip()]
output = "\n\n".join(part for part in parts if part.strip()) + "\n"
config_path.write_text(output, encoding="utf-8")
PY

chmod 600 "${TARGET_FILE}"
chmod 600 "${CODEX_CONFIG_FILE}"
printf '{"OPENAI_API_KEY":"%s"}\n' "${API_KEY}" > "${CODEX_AUTH_FILE}"
chmod 600 "${CODEX_AUTH_FILE}"
touch "${PROFILE_FILE}"

if ! grep -qxF "${SOURCE_LINE}" "${PROFILE_FILE}"; then
  printf '\n%s\n' "${SOURCE_LINE}" >> "${PROFILE_FILE}"
fi

printf 'Configured Codex CLI for codexforall.\n'
printf 'Environment file: %s\n' "${TARGET_FILE}"
printf 'Codex config file: %s\n' "${CODEX_CONFIG_FILE}"
printf 'Codex auth file: %s\n' "${CODEX_AUTH_FILE}"
printf 'Shell profile: %s\n' "${PROFILE_FILE}"
printf 'Run: source "%s"\n' "${PROFILE_FILE}"
printf 'Then start Codex with: codex\n'

if ! command -v codex >/dev/null 2>&1; then
  printf 'Codex CLI not found. Install it with: npm install -g @openai/codex\n'
fi
