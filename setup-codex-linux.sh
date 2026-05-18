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
TMP_CONFIG_FILE="${CODEX_DIR}/config.toml.tmp"
PROFILE_FILE="${HOME}/.bashrc"
SOURCE_LINE='[ -f "$HOME/.config/codexforall/codex-env.sh" ] && source "$HOME/.config/codexforall/codex-env.sh"'

if [[ "${SHELL:-}" == */zsh ]]; then
  PROFILE_FILE="${HOME}/.zshrc"
fi

mkdir -p "${TARGET_DIR}"
mkdir -p "${CODEX_DIR}"

cat > "${TARGET_FILE}" <<EOF
export OPENAI_BASE_URL="${API_BASE}"
export OPENAI_API_BASE="${API_BASE}"
export OPENAI_API_KEY="${API_KEY}"
export OPENAI_MODEL="${MODEL}"
EOF

if [[ -f "${CODEX_CONFIG_FILE}" ]]; then
  awk '
    BEGIN { in_managed = 0; in_provider = 0 }
    /^# BEGIN CODEXFORALL MANAGED/ { in_managed = 1; next }
    in_managed && /^# END CODEXFORALL MANAGED/ { in_managed = 0; next }
    in_managed { next }
    $0 ~ /^model[[:space:]]*=/ { next }
    $0 ~ /^model_provider[[:space:]]*=/ { next }
    $0 ~ /^\[model_providers\.codexforall\]$/ { in_provider = 1; next }
    in_provider {
      if ($0 ~ /^\[/) {
        in_provider = 0
        print $0
      }
      next
    }
    { print }
  ' "${CODEX_CONFIG_FILE}" > "${TMP_CONFIG_FILE}"
else
  : > "${TMP_CONFIG_FILE}"
fi

mv "${TMP_CONFIG_FILE}" "${CODEX_CONFIG_FILE}"
cleaned_content="$(cat "${CODEX_CONFIG_FILE}")"

cat > "${TMP_CONFIG_FILE}" <<'EOF'
# BEGIN CODEXFORALL MANAGED ROOT
model = "gpt-5.2"
model_provider = "codexforall"
# END CODEXFORALL MANAGED ROOT
EOF

if [[ -n "${cleaned_content}" ]]; then
  printf '\n%s\n' "${cleaned_content}" >> "${TMP_CONFIG_FILE}"
fi

printf '\n' >> "${TMP_CONFIG_FILE}"

cat >> "${TMP_CONFIG_FILE}" <<'EOF'
# BEGIN CODEXFORALL MANAGED PROVIDER

[model_providers.codexforall]
name = "codexforall"
base_url = "https://your-codexforall.example.com/v1"
wire_api = "responses"
requires_openai_auth = true
# END CODEXFORALL MANAGED PROVIDER
EOF

mv "${TMP_CONFIG_FILE}" "${CODEX_CONFIG_FILE}"

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
