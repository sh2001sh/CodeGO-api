# Main Goal
Prevent model-level cooling from adding failed upstream attempts to real-user first-token latency while keeping channel 42 enabled.

# Current Status
- Production evidence shows high FRT requests first wait on cooling channels 42 or 39 before retrying to healthy channels.
- The forced cooling-probe path was removed from channel selection and error handling.
- Cooling, health-based routing, and automatic post-cooldown recovery remain enabled; no channel is disabled.
- Added a regression test proving legacy probe context cannot select a cooling route.
- Focused gateway routing, execution, and runtime tests pass.

# Next Step
- Commit and push the routing fix, await the alpha.36 image, and deploy after isolated migration smoke validation.

# Blockers
- None.
