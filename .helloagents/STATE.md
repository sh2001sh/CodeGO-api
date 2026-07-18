# 主线目标
为 `shu26.cfd` 增加后台可配置的首购充值活动，以及支持 GitHub 投稿、审核和额度奖励的社区资源中心。

# 当前状态
- 用户已授权通过版本标签触发 GitHub Actions 自动构建镜像；目标标签为 `v2.0.0-rc.33.9-alpha.31`。
- 功能提交 `103e838cf` 已推送到 `origin/v2-refactor-20260711`。
- 首购活动已完成：管理员可配置启用状态、折扣比例、开始时间和结束时间。
- “首购”定义为用户首次成功的钱包充值；所有充值渠道统一应用折扣，并在事务内占用资格，避免并发创建多个优惠订单。
- 充值订单已保存原价、折扣和活动快照字段，钱包页面会展示当前优惠及有效时间。
- 社区资源已完成：侧边栏新增入口，用户可浏览、搜索、筛选和下载 GitHub 仓库或仓库子目录资源。
- 普通用户可投稿 GitHub 链接并进入审核队列；管理员投稿直接发布，管理员可通过或驳回普通投稿。
- 投稿可附带同仓库内感谢 `shu26.cfd` 的 GitHub 链接；管理员审核通过时可发放后台配置的额度奖励。
- 奖励复用现有 BonusQuota 账本，并按仓库建立幂等键，避免重复奖励。
- 中文界面、响应式、暗色模式、空状态、加载与错误反馈均已覆盖。
- 工作树原有日志删除、临时文件和无关改动均保留，未进行回退。

# 验证证据
- 相关 Go 包测试通过，含首购并发资格、GitHub 链接归一化、迁移和路由测试。
- TypeScript `tsc -b` 通过。
- 新增社区资源前端代码定向 ESLint 通过。
- Rsbuild 生产构建通过。
- Playwright 桌面、390px 移动端投稿面板和暗色模式验证通过，浏览器控制台无错误。
- 截图：`output/playwright/community-resources-desktop.png`、`community-resources-mobile-submit.png`、`community-resources-dark.png`。
- `git diff --check` 通过。

# 下一步
- 推送 `v2.0.0-rc.33.9-alpha.31` 标签并监控 `Publish Docker image (Multi-arch)`，确认 amd64、arm64、manifest 与签名完成；生产部署仍不在本次授权范围内。

# 阻塞项
- 全量 `go test ./...` 在整套运行时仍会触发既有 `TestGetSubscriptionOrderStatusReturnsOrderPayload` 失败；该测试单独运行通过，本次相关包测试全部通过。
