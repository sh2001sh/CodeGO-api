# Main Goal
Improve the wallet information architecture, keep bidirectional quota conversion usable, and clearly state that subscription packages only apply to non-Claude models.

# Current Status
- Refactored `/wallet` around a compact account overview with standard quota, Claude quota, usage, request count, active subscriptions, and quick actions.
- Split wallet tasks into `充值与兑换`, `额度转换`, and `扣费设置` tabs instead of showing all modules at once.
- Split conversion into wallet-quota and package-quota views, and moved conversion records into an on-demand side sheet.
- Added bidirectional wallet conversion at the fixed rate `4 standard = 1 Claude`, including authenticated APIs, migration, transactional balance updates, locking, idempotency, ledger synchronization, and conversion records.
- Added a shared package scope notice stating `套餐仅可用于非 Claude 模型` on `/packages` and in the final purchase confirmation dialog.
- Added supporting Chinese translations for the updated wallet and package purchase UI.
- The user authorized committing and pushing all current changes and publishing the next multi-architecture image as `v2.0.0-rc.33.9-alpha.37`.

# Verification
- Desktop 1440x1000 and mobile 390x844 browser checks passed for `/wallet`, wallet/package conversion tabs, conversion history, `/packages`, and the purchase dialog.
- Browser console checks reported zero errors and zero warnings; no horizontal overflow or incoherent overlap was found.
- Saved refreshed wallet screenshots to `output/playwright/wallet-redesign-desktop.png` and `output/playwright/wallet-redesign-mobile.png` using mocked local account/API data for visual review only.
- Wallet conversion application and HTTP tests passed for both directions, idempotency, insufficient-balance rollback, and exact 4:1 validation.
- Billing, commerce app, migration, and focused commerce HTTP tests passed.
- The complete commerce HTTP package retains a pre-existing order-title cache isolation issue unrelated to this work; its failing test passes in isolation.
- Prettier checks, `npm run typecheck`, `npm run build`, and `git diff --check` passed.

# Next Step
- Commit and push the feature changes, create and push tag `v2.0.0-rc.33.9-alpha.37`, then monitor the Docker publishing workflow to completion.

# Blockers
- None.
