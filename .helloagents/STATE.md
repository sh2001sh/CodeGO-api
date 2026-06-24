# 主线目标
将项目收敛为只保留 `default` 前端，并移除 `classic` 前端的运行时代码、构建链路与目录。

# 当前状态
已完成代码收口与验证：
- `main.go`、`router/web-router.go`、`common/*`、`controller/option.go` 已移除 `classic` 运行时分支。
- `web/default` 的系统设置页已去掉主题切换控件，主题固定为 `default`。
- `web/classic/` 目录已删除。
- `web/default` 前端构建已通过。

# 验证结果
- `npm.cmd run build` in `web/default` 通过。
- `go test ./router ./controller ./common ./setting/system_setting` 因 `proxy.golang.org` 依赖下载失败而未完成。
- `go build ./...` 因 `proxy.golang.org` 依赖下载失败而未完成。

# 下一步
1. 提交并推送本轮所有未提交修改。
2. 若后续要继续做 Go 验证，需要先解决本机 Go 依赖下载网络问题或使用可用缓存。

# 阻塞项
当前无代码级阻塞；仅 Go 依赖下载受外网访问影响。
