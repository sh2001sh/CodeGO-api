# 主线目标

按需同步上游 `QuantumNous/new-api` 的关键更新到本地 `new-api`，以本地站点现有订阅/计费逻辑为主体，优先补齐计费安全、管理员订阅额度重置、会话 Cookie 安全、注册页重定向与低风险体验优化。

# 当前状态

- 已完成管理员手动重置订阅 quota：
  - 后端新增 `POST /api/subscription/admin/user_subscriptions/:id/reset`
  - 前端用户订阅管理弹窗新增 `Reset quota`
- 已完成计费安全加固：
  - 新增安全配额换算工具 `common/quota_math.go`
  - 任务计费、文本计费、结算流程加入饱和转换与非负保护
  - 图片请求 `n` 参数增加上限校验
  - `max_tokens` 等高风险数值参数已补齐温和校验
- 已完成 `56dbaab1d` 风格会话 Cookie 安全支持：
  - 新增 `SESSION_COOKIE_SECURE`
  - 新增 `SESSION_COOKIE_TRUSTED_URL`
  - 会话 Cookie `Secure` 不再写死为 `false`
- 已完成 `8f31b3059` 风格 `Intl` 语言码兼容：
  - 保持本地 `zh/en/fr/ru/ja/vi` 语言代码方案
  - 新增 `toIntlLocale()`，修复 `Intl` 与 `toLocaleString` 的本地化参数
- 已完成 `3a876d6f3`：
  - 已登录用户访问 `/(auth)/sign-up` 时重定向到 `/dashboard`
- 已完成 OpenAI 与非 OpenAI 流式链路的断连停写补齐：
  - 自定义 SSE / websocket 流在客户端断开后停止向下游写入
  - `cohere / palm / xunfei / zhipu / coze / volcengine / ollama` 已补快速停写与防 goroutine 卡住

# 关键上下文

- 目标仓库：`E:\sh\Coding\cpa_bussiness\new-api`
- 本地仓库不是上游可直接 merge 的祖先链，当前采用手工选择性移植
- 本地 `model/subscription.go` 订阅结构已深度定制，重置逻辑必须同时清理：
  - `AmountUsed`
  - `PeriodUsed`
  - `ModelUsage`
- 这次前端吸收只做低风险兼容优化，没有改写现有主站信息架构
- “断连停写”当前只解决下游继续写的问题，不承诺所有上游供应商都会被同步取消计费

# 验证结果

- `go test ./common -run "TestSaturatingInt64ToInt|TestSaturatingFloat64ToInt|TestValidateRedirectURL"` 通过
- `go test ./dto ./relay/helper` 通过
- `go test ./model -run "TestAdminResetUserSubscriptionQuota|TestUseUserSubscriptionResetOpportunity_ClearsCurrentSubscriptionAndLimitsMonthlyUsage"` 通过
- `npm run typecheck`（`web/default`）通过
- `go test ./relay/channel/cohere ./relay/channel/palm ./relay/channel/xunfei ./relay/channel/zhipu ./relay/channel/coze ./relay/channel/volcengine ./relay/channel/ollama -run "^$"` 通过
- `go test ./relay/helper ./relay/channel/openai ./relay/channel/gemini ./relay/channel/dify ./relay/channel/baidu ./relay/channel/claude ./relay/channel/xai -run "^$"` 通过

# 下一步

- 若继续吸收上游，可下一步评估是否补“断连后尽快取消上游请求/任务”这类更深层优化，但这会更侵入计费与适配器逻辑

# 阻塞项

- 无当前代码阻塞
