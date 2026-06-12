# 虎皮椒支付回调与 Nginx 反向代理配置

本文档用于说明在使用虎皮椒（Xunhu）支付时，`ServerAddress`、`CustomCallbackAddress` 与 Nginx HTTPS 跳转之间的关系，以及推荐的反向代理配置方式。

## 适用场景

当你同时满足以下条件时，建议按本文档配置：

- 站点对外域名启用了 HTTPS
- 80 端口会将普通 HTTP 请求跳转到 HTTPS
- 使用了虎皮椒支付的异步回调

## 问题现象

常见表现如下：

- 用户已付款
- 页面 return 已跳回站点
- 订单状态仍是 `pending`
- 应用日志看不到对应的 `/api/*/xunhu/notify` 成功处理记录

这通常不是业务代码异常，而是回调请求在反向代理层被拦截或重定向。

## 原因说明

虎皮椒回调地址来自以下配置：

1. 优先读取 `CustomCallbackAddress`
2. 若未设置，则回退到 `ServerAddress`

如果回调地址生成为 `http://your-domain.com/api/.../xunhu/notify`，但 Nginx 对 80 端口统一执行：

```nginx
return 301 https://$host$request_uri;
```

那么虎皮椒发起的 `POST` 异步通知可能会：

- 不跟随 301
- 或在重定向后丢失原始 `POST` 请求语义

最终表现为支付平台显示已回调，但后端实际没有收到可用的异步通知。

## 推荐配置

### 1. 使用 HTTPS 作为支付回调基址

在系统设置中优先设置：

- `CustomCallbackAddress = https://your-domain.com`

如果未单独设置 `CustomCallbackAddress`，至少应保证：

- `ServerAddress = https://your-domain.com`

推荐优先使用 `CustomCallbackAddress`，这样支付回调与站点主地址可以独立调整。

### 2. 为旧的 HTTP 回调地址保留兼容入口

即使你已经把回调基址改成 HTTPS，历史订单可能仍然使用旧的 HTTP notify URL。  
因此，建议 Nginx 在 80 端口为以下路径保留直通，不做 301：

- `/api/user/xunhu/notify`
- `/api/subscription/xunhu/notify`
- `/api/blind-box/xunhu/notify`

其他普通页面和接口仍可继续统一跳转 HTTPS。

## 推荐 Nginx 配置示例

下面示例假设后端服务监听 `127.0.0.1:3000`。

```nginx
server {
    client_max_body_size 100M;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    listen 443 ssl;
    ssl_certificate /path/to/fullchain.pem;
    ssl_certificate_key /path/to/privkey.pem;
}

server {
    client_max_body_size 100M;
    listen 80;
    server_name your-domain.com;

    location = /api/user/xunhu/notify {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location = /api/subscription/xunhu/notify {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location = /api/blind-box/xunhu/notify {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}
```

## 配置检查清单

部署完成后，建议至少检查以下项目：

- `CustomCallbackAddress` 是否为 `https://...`
- 新建支付订单后，传给虎皮椒的 notify URL 是否为 HTTPS
- 对历史 HTTP notify URL 发起测试请求时，是否仍能直接命中后端而不是返回 `301`
- 首页等普通 HTTP 请求是否仍会跳转 HTTPS

## 故障排查建议

如果再次出现“支付成功但订单未完成”，建议按这个顺序排查：

1. 查看数据库中的 `CustomCallbackAddress` 与 `ServerAddress`
2. 查看 Nginx access log，确认虎皮椒回调请求返回的是 `200`、`301` 还是 `4xx/5xx`
3. 查看应用日志，确认是否真正进入 `/api/*/xunhu/notify`
4. 再检查验签、订单状态与支付网关匹配逻辑

如果 Nginx access log 中已经看到虎皮椒源 IP 的 `POST /api/*/xunhu/notify` 返回 `301`，通常可以直接判定为反向代理配置问题。
