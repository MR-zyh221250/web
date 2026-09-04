> 2026-09-04：已升级为独立展示站与商户 CRM，新增店铺、广告审核、客人注册预约、图片裁剪。当前流程与地址见 [双站业务说明](../../docs/BUSINESS.md)。下文保留早期部署背景。

# 免费域名与 HTTPS 反向代理

当前服务器：45.59.102.76（Linux）。

- 3D 网站：https://neon-loft-zyh.duckdns.org/
- 客户管理演示：https://neon-loft-zyh.duckdns.org/manage.html
- TeamCity：https://neon-ci-zyh.duckdns.org/

DuckDNS 提供免费子域名；两个域名的 A 记录均指向服务器 45.59.102.76。地址栏不再包含服务器 IP 或端口，DNS 查询仍可查到服务器 IP。服务器 IP 变化时，在 DuckDNS 更新这两个域名的解析。账号令牌不得提交到 Git。

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
- TeamCity Global Settings 的 Server URL 为 `https://neon-ci-zyh.duckdns.org`。

专用 Tomcat Connector 位于原 XML 的 `<Service name="Catalina">` 内：

```xml
<Connector port="8112" protocol="org.apache.coyote.http11.Http11NioProtocol"
           connectionTimeout="60000" useBodyEncodingForURI="true"
           tcpNoDelay="1" maxHttpHeaderSize="16000"
           maxParameterCount="-1" maxPartCount="-1"
           scheme="https" secure="true" proxyPort="443"
           proxyName="neon-ci-zyh.duckdns.org" />
```

Caddy 保留 Host、Origin 等请求头，支持 WebSocket，并传递 HTTPS 转发信息。TeamCity 保持原账号认证，未启用自由注册。首次用新域名访问需要重新登录，旧域名的登录会话不会自动转移。

不要直接以新 XML 覆盖不同版本 TeamCity 的配置；升级时应以新镜像的原始 XML 为基础合并该 Connector。

## 运维

```sh
docker compose --project-directory /opt/neon-proxy config --quiet
docker compose --project-directory /opt/neon-proxy exec -T caddy caddy validate --config /etc/caddy/Caddyfile
docker compose --project-directory /opt/neon-proxy restart caddy
curl -f https://neon-loft-zyh.duckdns.org/healthz
curl -I https://neon-ci-zyh.duckdns.org/login.html
```

代理独立于网站发布，TeamCity 更新网站容器不会重建证书卷或代理。网站容器重建时仍有短暂中断。

变更前备份位于服务器 `/opt/neon-proxy/backups`。如需整体撤销代理，应协调恢复 TeamCity Compose、Server URL、Agent 的 80 端口环境变量和网站绑定；先停止 Caddy 释放 80，保留所有数据卷，再恢复网站原端口。不要只改 Agent 或网站其中一个。

## 浏览器数据

客户和销售数据已保存在服务器 MySQL；更换域名不迁移或清空数据库。新域名需要重新登录，账号和已有业务记录保持不变。旧 sslip.io 地址会重定向至新域名。

参考：https://www.duckdns.org/spec.jsp 、https://caddyserver.com/docs/quick-starts/https 、https://www.jetbrains.com/help/teamcity/configuring-proxy-server.html

## 更换域名时的同步配置

除 DNS 与本目录 Caddyfile 外，还须同步 CRM Compose 的 PUBLIC_ORIGIN、TeamCity 的 Server URL 和 server.xml 中专用 Connector 的 proxyName。先确认新域名证书可用，再切换登录来源与旧地址跳转。仓库配置通过 GitHub Desktop 提交推送，避免后续流水线恢复旧的登录来源。
