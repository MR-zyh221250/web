# 免费域名与 HTTPS 反向代理

当前服务器：45.59.102.76（Linux）。

- 3D 网站：https://loft.45-59-102-76.sslip.io/
- 客户管理演示：https://loft.45-59-102-76.sslip.io/manage.html
- TeamCity：https://ci.45-59-102-76.sslip.io/

sslip.io 将域名中的 IPv4 地址解析到服务器，无需账号或 DNS 令牌。它是第三方免费服务，域名中包含服务器 IP；换 IP 时需更换域名和代理配置。

## 已部署结构

代理配置放在服务器 `/opt/neon-proxy`，作为独立 Compose 项目运行；本目录保存其可审阅副本。

浏览器 → Caddy（80/443，TLS）→ 网站（127.0.0.1:8080）或 TeamCity（127.0.0.1:8112）。

Caddy 容器使用 Linux host 网络，因此配置里的 127.0.0.1 指宿主机。Caddy 管理接口关闭，证书和 ACME 账号放在持久卷，自动续期；不要删除证书卷。镜像在服务器 `.env` 中固定为验证过的摘要：

```dotenv
CADDY_IMAGE=caddy@sha256:5f5c8640aae01df9654968d946d8f1a56c497f1dd5c5cda4cf95ab7c14d58648
```

网站原来的 HTTP IP 地址重定向至 HTTPS 域名。网站容器仍为只读、128 MB 限制，Caddy 限制为 256 MB。

## TeamCity 配置

`/opt/neon-teamcity/compose.yaml` 已调整：

- Agent 环境变量 `NEON_HTTP_PORT=8080`、`NEON_BIND_ADDRESS=127.0.0.1`，后续流水线部署沿用此端口。
- Server 原来的 8111 仍仅绑定宿主机回环地址，供 SSH 隧道和内部访问使用。
- 增加 `127.0.0.1:8112:8112` 供 Caddy 专用。
- 挂载 `./server.xml:/opt/teamcity/conf/server.xml:ro`。
- TeamCity Global Settings 的 Server URL 为 `https://ci.45-59-102-76.sslip.io`。

专用 Tomcat Connector 位于原 XML 的 `<Service name="Catalina">` 内：

```xml
<Connector port="8112" protocol="org.apache.coyote.http11.Http11NioProtocol"
           connectionTimeout="60000" useBodyEncodingForURI="true"
           tcpNoDelay="1" maxHttpHeaderSize="16000"
           maxParameterCount="-1" maxPartCount="-1"
           scheme="https" secure="true" proxyPort="443"
           proxyName="ci.45-59-102-76.sslip.io" />
```

Caddy 保留 Host、Origin 等请求头，支持 WebSocket，并传递 HTTPS 转发信息。TeamCity 保持原账号认证，未启用自由注册。首次用新域名访问需要重新登录，旧域名的登录会话不会自动转移。

不要直接以新 XML 覆盖不同版本 TeamCity 的配置；升级时应以新镜像的原始 XML 为基础合并该 Connector。

## 运维

```sh
docker compose --project-directory /opt/neon-proxy config --quiet
docker compose --project-directory /opt/neon-proxy exec -T caddy caddy validate --config /etc/caddy/Caddyfile
docker compose --project-directory /opt/neon-proxy restart caddy
curl -f https://loft.45-59-102-76.sslip.io/healthz
curl -I https://ci.45-59-102-76.sslip.io/login.html
```

代理独立于网站发布，TeamCity 更新网站容器不会重建证书卷或代理。网站容器重建时仍有短暂中断。

变更前备份位于服务器 `/opt/neon-proxy/backups`。如需整体撤销代理，应协调恢复 TeamCity Compose、Server URL、Agent 的 80 端口环境变量和网站绑定；先停止 Caddy 释放 80，保留所有数据卷，再恢复网站原端口。不要只改 Agent 或网站其中一个。

## 浏览器数据

客户演示数据使用 localStorage。HTTP IP 与 HTTPS 域名属于不同来源，原先在 IP 地址下创建的客户数据不会自动显示在新域名下。后续接入后台数据库再实现共享存储。

参考：https://sslip.io/ 、https://caddyserver.com/docs/quick-starts/https 、https://www.jetbrains.com/help/teamcity/configuring-proxy-server.html
