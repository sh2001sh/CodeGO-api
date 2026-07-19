# 主线目标
发布包含套餐首购折扣、取消续费奖励、认证体验、集享计划和日卡限制的 alpha.33 多架构镜像。

# 当前状态
- 功能提交 `530c4786e` 已推送到 `origin/v2-refactor-20260711`。
- 发布标签 `v2.0.0-rc.33.9-alpha.33` 已创建并推送，指向 `530c4786e`。
- GitHub Actions run `29681884574` 已完成，结论为 `success`。
- amd64、arm64 的 control-api、gateway-api、ledger-worker、workflow-worker、db-migrate、ledger-backfill、v2-verify 均构建并推送成功。
- Docker Hub 与 GHCR 的版本化和 latest 多架构 manifest 已创建，Cosign 签名成功。
- Docker Hub 顶层版本与 latest 均包含 amd64、arm64，digest 为 `sha256:aa0b8e7d147f6ea24afe10dc2cc461b418e95d66c12c33208cb8b5b066507c0c`。
- 7 个 Docker Hub 服务版本标签均已通过 API 验收，每个标签包含 2 个架构。
- 发布前 commerce、identity、store 测试与前端类型检查通过；前端生产构建通过。
- HTTP 整包仍存在既有偶发用例失败，该用例单独运行通过。
- GitHub 推送提示默认分支现有 38 个 Dependabot 告警：8 critical、9 high、17 moderate、4 low，未在本次功能发布中处理。
- 本地预览日志、Playwright 历史日志、临时密码工具格式化、运行态验证文件和已删除截图未进入发布提交，也未回退。

# 下一步
- 如需部署生产环境，使用 `v2.0.0-rc.33.9-alpha.33` 对应的各服务镜像执行迁移和滚动更新。

# 阻塞项
- 无。
