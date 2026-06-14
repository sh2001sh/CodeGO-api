Main goal: manually port selected upstream QuantumNous/new-api changes into local fork without losing local custom features.

Current work:
- User requested porting recommendation items 1-7 from upstream.
- Local branch is `main`; official upstream is available as `official/main` at `d2576ddc`.
- Working tree has unrelated untracked runtime logs/temp files; do not add them.
- Item 2 has been ported and committed locally as `15358fab` (`Limit anonymous request body size`), preserving local xunhu/blind-box/point-mall/people-plan routes.
- Item 4 has been ported and committed locally as `6822ec86` (`Reuse configured stream scanner buffers`).
- Item 5 has been ported and committed locally as `a9bc7ec9` (`Truncate oversized upstream error logs`).
- Item 3 has been ported and committed locally as `a7f5412a` (`Reduce heap usage for large relay bodies`).
- Item 1 has been ported and committed locally as `8a74f1ff` (`Support OpenAI image streaming and edits`).
- Item 6 has been ported and committed locally as `b5a2ae36` (`Add Claude Opus 4.8 support`).
- Item 7 has been ported and committed locally as `c3ae343b` (`Improve model pricing editor save behavior`), focused on six-decimal steps and committing the open visual pricing draft before save.
- Follow-up compatibility fix committed locally as `90b98d1f` (`Handle OpenAI file content for Claude conversion`) after Claude package tests exposed local OpenAI file conversion behavior.

Selected upstream items:
- 1 `d2576ddc`: OpenAI streaming image relay and image edit for images API.
- 2 `d2f7f9ee`: limit anonymous request body.
- 3 `fddf54cc`: reduce heap residency for large base64 relay requests.
- 4 `32805849`: reuse stream scanner buffer in channel handlers.
- 5 `12880281`: truncate oversized upstream error logs.
- 6 `0c7aceb8`: add Claude opus 4.8 support.
- 7 frontend model pricing editor precision/UX fixes: evaluate and port safe parts.

Key context:
- Do not directly merge/rebase upstream; upstream deletes local custom modules such as people-plan, point-mall, image-workspace, Claude wallet/quota features.
- Preserve local Claude quota billing/logging changes from commit `80fcd9ee`.
- Preserve local workflow cosign fixes and all unrelated custom business features.
- Unrelated modified files remain in working tree and were not committed: `setting/operation_setting/general_setting.go`, `web/classic/src/components/settings/ModelSetting.jsx`, `web/classic/src/pages/Setting/Model/SettingGlobalModel.jsx`, `web/default/src/features/models/components/drawers/model-mutate-drawer.tsx`, `web/default/src/features/system-settings/models/index.tsx`. They only flip `general_setting.ping_interval_enabled` default false->true.

Next step:
- Push the 8 local migration commits to `origin/main` if requested. Do not include unrelated working-tree files.

Blockers:
- No blocker.
