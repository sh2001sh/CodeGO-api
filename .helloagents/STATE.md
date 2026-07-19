# Main Goal
Publish the package-price fixes and model-square long-name redesign, then complete the multi-architecture image build.

# Current Status
- Root cause confirmed in `internal/commerce/app/subscription_lifecycle_runtime.go`: users without an active managed package returned before preview discounts were applied.
- Purchase preview now computes the package action first and then applies first-purchase or blind-box discounts through one shared finalization path.
- Added app and HTTP regression coverage for a first-time buyer with no active subscription; `/api/packages/public` returns base 100, payable 80, applied true, and multiplier 0.8.
- Commerce app tests, focused HTTP tests, frontend typecheck, production frontend build, and `git diff --check` pass.
- The full commerce HTTP package still exposes a pre-existing plan-cache test isolation failure; its affected order-status test passes alone and together with the new regression test.
- The release also includes the pending user external-ID search update, batch blind-box grant script, tracked runtime artifact deletions, and password helper formatting.
- Local preview logs and Python bytecode are generated runtime artifacts and are excluded from version control.
- Commit `0892b570f` and tag `v2.0.0-rc.33.9-alpha.34` were published as the intermediate package-price build.
- Model-square cards now reserve the full header width for model identifiers and move actions to a separate footer; long names wrap instead of truncating.
- Model-square table names wrap in a wider column, while narrow viewports can horizontally scroll the remaining pricing columns.
- Playwright verified real production model data on desktop and 390px mobile in card and table modes; `claude-haiku-4-5-20251001` is fully visible.
- Final UI commit `ddf911101` and tag `v2.0.0-rc.33.9-alpha.35` are pushed.
- GitHub Actions run `29688198878` completed successfully: amd64, arm64, all 7 services, Docker Hub/GHCR manifests, latest tags, and Cosign signatures passed.
- Docker Hub verification confirms all 7 versioned service tags contain both `amd64` and `arm64` images.

# Next Step
- Deploy `v2.0.0-rc.33.9-alpha.35` when production rollout is authorized.

# Blockers
- None.
