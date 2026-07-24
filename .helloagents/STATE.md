# Main Goal
Implement root-only, group-scoped automatic routing pools that minimize channel procurement cost while preserving model-level reliability. Financial reporting must distinguish actual quota origin: subscription, paid recharge, and blind-box rewards.

# Current Status
- Added `RoutePool` and `RoutePoolMember` schema plus migration `20260724_gateway_route_pools`.
- Added pool persistence, root-only `/api/route-pools` CRUD and per-model metric endpoint.
- Automatic selection uses channel procurement cost and model-level health; it ignores legacy priority/weight for an enabled pool and only falls back to legacy routing when no pool is enabled.
- Expired model cooldowns are now recovery probes and require two successful requests before returning to healthy state.
- Added immutable funding lots and FIFO allocations for wallet credits. New top-up/blind-box credits snapshot their source multiplier; legacy balances remain explicitly `legacy_unattributed`.
- Added internal request economics snapshots and root-only `/api/route-finance` policy/daily-report APIs. Procurement figures are not written to user-visible audit metadata.
- Added Root-only `/route-pools` console for pool editing, health metrics, source multipliers, and daily economics.

# Next Step
- Review the new console in production after migration, configure source multipliers, and create one pool per target group.
- Commit and publish only after the user requests a release build.

# Blockers
- None.
