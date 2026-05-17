#!/usr/bin/env bash
set -euo pipefail

SERVER_URL="https://your-codexforall.example.com"
API_BASE="${SERVER_URL%/}/v1"
API_KEY="YOUR_CODEXFORALL_API_KEY"
MODEL="gpt-5.2-codex"

TARGET_DIR="${HOME}/.config/codexforall"
TARGET_FILE="${TARGET_DIR}/codex-env.sh"
PROFILE_FILE="${HOME}/.bashrc"
SOURCE_LINE='[ -f "$HOME/.config/codexforall/codex-env.sh" ] && source "$HOME/.config/codexforall/codex-env.sh"'

if [[ "${SHELL:-}" == */zsh ]]; then
  PROFILE_FILE="${HOME}/.zshrc"
fi

mkdir -p "${TARGET_DIR}"

cat > "${TARGET_FILE}" <<EOF
export OPENAI_BASE_URL="${API_BASE}"
export OPENAI_API_BASE="${API_BASE}"
export OPENAI_API_KEY="${API_KEY}"
export OPENAI_MODEL="${MODEL}"
EOF

chmod 600 "${TARGET_FILE}"
touch "${PROFILE_FILE}"

if ! grep -qxF "${SOURCE_LINE}" "${PROFILE_FILE}"; then
  printf '\n%s\n' "${SOURCE_LINE}" >> "${PROFILE_FILE}"
fi

printf 'Configured Codex CLI for codexforall.\n'
printf 'Environment file: %s\n' "${TARGET_FILE}"
printf 'Shell profile: %s\n' "${PROFILE_FILE}"
printf 'Run: source "%s"\n' "${PROFILE_FILE}"
printf 'Then start Codex with: codex\n'

if ! command -v codex >/dev/null 2>&1; then
  printf 'Codex CLI not found. Install it with: npm install -g @openai/codex\n'
fi
