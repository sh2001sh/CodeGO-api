# 主线目标
修复首页 `H1 tag missing`，将首页改为首屏真实可见 `h1`，并提交推送当前所有未提交改动。

# 当前状态
已完成代码修改并通过前端构建：
- `web/default/index.html` 已从隐藏 `sr-only h1` 改为首屏真实可见的 SEO Hero
- `web/default/src/main.tsx` 已改为 React 挂载后移除整个 `seo-shell-hero`
- `model/task_cas_test.go` 新增盲盒订单按 `trade_no` 重入时不重复加额度的回归测试

# 关键上下文
- 本地 `web/default` 构建通过，`dist/index.html` 已确认输出真实可见 `h1`
- 当前待提交文件：
  - `web/default/index.html`
  - `web/default/src/main.tsx`
  - `model/task_cas_test.go`
- 服务器此前不能直接 `git fetch origin`，原因是缺 GitHub 凭据

# 下一步
1. 提交并推送当前未提交改动到 `main`
2. 如需上线，再在服务器侧拉镜像或补齐 GitHub 凭据后同步代码

# 阻塞项
当前无本地代码阻塞；仅服务器侧直接拉 GitHub 仍缺凭据。
