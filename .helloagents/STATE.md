# Main Goal
Improve Code Go acquisition and local configuration workflows while preserving safe billing and restore behavior.

# Current Status
- First blind-box opening for a paid order can no longer retain a prop reward: when a prop is selected, the first-purchase guarantee converts it to ordinary wallet quota at the configured minimum.
- Codex setup script defaults are now provider `CodeGo` and model `gpt-5.6-luna`.
- Generated Windows and Linux/macOS scripts offer 0 exit, 1 configure CodeGo, and 2 restore original configuration; they preserve the first pre-CodeGo config/auth snapshot instead of overwriting it on later runs.
- API key import dialog now includes a separate CC Switch action. It uses the same one-time payload but opens `ccswitch://`; Code Go Desktop remains `codego://`.
- Desktop token action menu exposes Restore original configuration for tools with saved backups. Existing tool configuration panel restore behavior remains intact.

# Verification
- `go test ./internal/commerce/app -run "TestApplyFirstPurchaseMinimumGuarantee" -count=1` passed.
- `node --experimental-strip-types --test src/features/keys/components/dialogs/cc-switch-dialog-submit.test.ts` passed (7 tests).
- `npm run build` passed in `web/default`.
- `pnpm vitest run tests/components/CodeGoToolConfigPanel.test.tsx tests/components/CodeGoTokenManager.test.tsx` passed (12 tests).
- `git diff --check` passed in both repositories.

# Next Step
- Changes are local and uncommitted. Existing unrelated local modifications in `new-api` and untracked artifacts in `cc-switch-main` remain preserved.

# Blockers
- None.
