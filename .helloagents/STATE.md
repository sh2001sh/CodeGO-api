# Main Goal
Publish all current source changes as `v2.0.0-rc.33.9-alpha.34` and complete the multi-architecture image build.

# Current Status
- Root cause confirmed in `internal/commerce/app/subscription_lifecycle_runtime.go`: users without an active managed package returned before preview discounts were applied.
- Purchase preview now computes the package action first and then applies first-purchase or blind-box discounts through one shared finalization path.
- Added app and HTTP regression coverage for a first-time buyer with no active subscription; `/api/packages/public` returns base 100, payable 80, applied true, and multiplier 0.8.
- Commerce app tests, focused HTTP tests, frontend typecheck, production frontend build, and `git diff --check` pass.
- The full commerce HTTP package still exposes a pre-existing plan-cache test isolation failure; its affected order-status test passes alone and together with the new regression test.
- The release also includes the pending user external-ID search update, batch blind-box grant script, tracked runtime artifact deletions, and password helper formatting.
- Local preview logs and Python bytecode are generated runtime artifacts and are excluded from version control.

# Next Step
- Re-run the production frontend build, commit and push all release changes, create tag `v2.0.0-rc.33.9-alpha.34`, and monitor the image workflow to completion.

# Blockers
- None.
