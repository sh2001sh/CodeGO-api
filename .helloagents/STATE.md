# Main Goal
Publish the current wallet/package release with safe monthly-plan first-purchase and renewal rules.

# Current Status
- Added bidirectional wallet conversion at `4 standard = 1 Claude`, including transactional ledger updates, locking, idempotency, APIs, migration, history, and wallet UI.
- Refactored `/wallet` into compact account overview plus funding, conversion, and billing-setting tabs.
- Package quota is explicitly limited to non-Claude models on `/packages` and in the purchase dialog.
- First-purchase campaign discounts now apply only to the user's first monthly plan purchase.
- Starter, daily, and weekly plans neither receive nor consume first-purchase campaign eligibility.
- Renewal is blocked until at least 30% of the current package quota has been used (remaining quota at or below 70%).
- Renewal price follows the used percentage with a 30% minimum; renewal restarts the term, restores full quota, and does not carry unused quota forward.
- The package overview and plan card disable renewal/purchase before the threshold and show the reason; disabled plans retain their original displayed price instead of showing zero.
- Preserved concurrent upstream timeout/failure-classification changes, including a configurable response-header timeout and focused tests.
- Feature commit `c5f7ab349` exists locally; the branch has not yet been pushed and release tag `v2.0.0-rc.33.9-alpha.37` has not yet been created.

# Verification
- Commerce app, billing app, migration/store, focused commerce HTTP, gateway execution, sync HTTP provider, and HTTP client tests passed.
- The full commerce HTTP package retains the known order-title cache isolation failure; the affected test passes in isolation.
- Frontend typecheck, production build, targeted Prettier checks, and `git diff --check` passed.
- Desktop and 390px mobile browser checks passed for package rules, disabled renewal state, correct price display, and responsive layout.

# Next Step
- Commit the monthly first-purchase/renewal changes and concurrent timeout changes separately, push the branch, create and push `v2.0.0-rc.33.9-alpha.37`, then monitor Docker publishing to completion.

# Blockers
- None.
