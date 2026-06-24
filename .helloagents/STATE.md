# 主线目标
修复老盲盒临时额度迁移在服务启动阶段触发的空指针崩溃，确保数据库迁移先于 Redis 初始化时也能正常启动。

# 当前状态
已完成代码修复：
- `common/redis.go` 新增 `RedisReady()`，所有 Redis 公共读写入口在 `RDB == nil` 时不再解引用空指针。
- `model/user_cache.go`、`model/token_cache.go`、`model/utils.go` 改为按 Redis 实际就绪状态判断，而不是只看 `RedisEnabled`。
- `model/task_cas_test.go` 新增回归测试，覆盖“Redis 开关为真但客户端未初始化”时执行 `MigrateBlindBoxLegacyCredits()` 不会 panic。

# 验证结果
- `gofmt -w` 已完成。
- `go test "./model" -run "^TestMigrateBlindBoxLegacyCredits_SkipsCacheInvalidationWhenRedisClientNotReady$" -count=1 -v` 未完成验证，原因是当前环境访问 `proxy.golang.org` 超时，依赖下载失败，不是已知编译报错。

# 关键上下文
- 崩溃链路为：`MigrateBlindBoxLegacyCredits()` -> `invalidateUserCache()` -> `common.RedisDelKey()`，启动时 `RedisEnabled == true` 但 `common.RDB == nil`。
- 当前仓库是 `E:\sh\Coding\cpa_bussiness\new-api`。
- 工作树仍有大量无关缓存和状态文件，当前只修改了与本次崩溃修复直接相关的 5 个源码文件。

# 下一步
如需继续，优先提交这 5 个修复文件并推送；若要本地补验证，需要先解决 Go 依赖下载网络问题或切换可用 GOPROXY。

# 阻塞项
- 当前环境无法稳定访问 `https://proxy.golang.org`，导致 Go 定向测试无法完成。
