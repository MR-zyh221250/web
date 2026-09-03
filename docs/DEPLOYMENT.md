# Docker + TeamCity 部署说明

## 当前范围

现已接入 Node.js 后端、MySQL 8.4、登录与管理员/销售员权限。客户数据保存到服务器，旧 localStorage 演示数据不会自动迁入数据库。详细说明见 [CRM 使用与运维](CRM.md)。

已部署环境：Ubuntu 24.04，Docker Engine 29.7.2、Compose 5.5.0、TeamCity 2026.2。网站、TeamCity Server、专用 Agent 在同一服务器。Caddy 对外提供 80/443 端口；网站绑定 127.0.0.1:8080，TeamCity 的 127.0.0.1:8111 用于内部访问，127.0.0.1:8112 专用于 HTTPS 反向代理。

2026-09-03：构建 #2 手动触发成功，用时约 31 秒，部署提交 `37578ea26ad744cdfafe6129994020f81dcba90d`，镜像 `neon-loft:build-2-37578ea26ad7`。服务健康、首页/管理页/纹理/署名文件检查通过。main 的 VCS 触发器已配置为每分钟检测；后续构建 #3 已成功部署提交 `c79d2d1a3808`。

TeamCity 项目 ID 为 `NeonLoft`，构建 ID 为 `NeonLoft_Build`。当前 UI 保存构建配置，仓库 `.teamcity` 是可重建的 Kotlin 定义，未开启配置双向同步；`ci/*.sh` 和网站代码在每次构建时从 GitHub 拉取。

TeamCity 容器配置在服务器 `/opt/neon-teamcity/compose.yaml`，该目录 `.env` 固定了实际下载的镜像摘要。数据与 Agent 配置均使用 Docker 持久卷。当前 TeamCity 使用适合个人演示的内置 HSQLDB；正式长期使用应迁移外部数据库。

流水线：GitHub main 提交 → TeamCity 拉取 → 前后端 Docker 构建 → 页面检查及隔离 MySQL 集成测试 → 数据库备份 → Docker Compose 更新后端和网站 → 失败尝试回退。镜像保存在部署宿主机，无需额外镜像仓库。若 Agent 和网站分离到不同机器，必须先改为镜像仓库或镜像传输方案。

## 文件

- `Dockerfile`：Node 24 构建，Nginx 非 root 用户运行，监听容器 8080。
- `compose.yaml`：网站容器，默认宿主机 8080，128 MB 内存上限，只读文件系统，自动重启，日志轮转。
- `docker/nginx.conf`：健康检查 `/healthz`、HTML 重新验证、带内容哈希的 JS/CSS 长缓存、固定名字素材缓存一小时。不存在的文件返回 404。
- `ci/build.sh`：按 TeamCity 构建 ID 和 Git 提交生成镜像标签；验证首页、管理页、署名文件、纹理及 404。
- `ci/deploy.sh`：部署锁、等待健康状态、失败恢复原镜像。首次上线失败则停止失败容器。
- `.teamcity/settings.kts` 与 `.teamcity/pom.xml`：TeamCity 2026.2 Kotlin DSL 与依赖，两个顺序步骤，main 分支触发，同一构建配置最多一个并发任务。

## 服务器准备

连接后先检查操作系统、磁盘、实际内存、占用端口、Docker/Compose 与现有服务。需要 Docker Engine 和支持 `up --wait` 的 Compose v2。不要覆盖已有网站或更改其他 Compose 项目。

部署 Agent 需要 Git、Docker CLI、Compose v2，以及目标 Docker daemon 的访问权限。如使用 TeamCity 官方 Agent 容器，可挂载宿主机 Docker socket。该权限等同于管理宿主机，应使用此项目专用的可信 Agent，不运行无关仓库代码。

Agent 的环境变量必须配置为：

| 参数 | 值 / 说明 |
| --- | --- |
| `NEON_DEPLOY_TARGET` | `neon-loft-production`，用于筛选专用 Agent |
| `NEON_HTTP_PORT` | 当前为 `8080`，由 Caddy 转发 |
| `NEON_BIND_ADDRESS` | 当前为 `127.0.0.1`，供本机反向代理访问 |
| `NEON_DEPLOY_STATE_DIR` | Agent 内可写且持久化的目录，例如 `/data/neon-loft-deploy`；容器化 Agent 时需挂载持久卷 |

TeamCity 中应显示对应的 `env.*` Agent 参数。脚本通过这些环境变量运行。`env.NEON_BUILD_ID` 由构建配置自动设置。不要将密码、SSH 私钥或访问令牌提交到 Git。

6 GB 服务器如需同时运行 TeamCity Server 与 Agent，应限制 JVM 堆和并发数，观察实际内存后再安排数据库。目前 MySQL 独立容器限制为 768 MB，API 限制为 256 MB。

## TeamCity 接入

1. 先部署或确认 TeamCity Server，再连接并授权专用 Agent。
2. 用户通过 GitHub Desktop 提交本次部署文件并推送到 `MR-zyh221250/web` 的 main。
3. 重建项目时可导入 `.teamcity/settings.kts`，同时保留 `.teamcity/pom.xml` 提供依赖。DSL 版本为 `2026.2`。现有项目已通过 UI 配置，不要再次导入为另一个自动部署项目。
4. 确认构建仅匹配目标 Linux Agent，工作目录包含完整 Git 检出。确认两个脚本依次执行，第二步仅在第一步成功后运行。
5. 首次手动 Run，检查镜像构建、临时容器检查及部署日志。再通过服务器地址检查 3D 页面、客户页、纹理、缓存响应头和刷新行为。
6. 再推送一次可见的小改动，验证 main 提交确实自动触发构建并更新网站。这一步通过后才算 CI/CD 跑通。

如果当前 TeamCity 不能直接解析 DSL，可按相同参数在 UI 中创建两个 Command Line 步骤：`sh ci/build.sh`、`sh ci/deploy.sh`；VCS root 指向该仓库 main，开启 VCS Trigger、限制并发为 1、添加上述 Agent requirements。不要同时保留两个会自动部署的重复构建配置。

## 本地或服务器手动试运行

### 通过域名访问

3D 网站：https://neon-loft-zyh.duckdns.org/ 。TeamCity：https://neon-ci-zyh.duckdns.org/ ，使用已创建的账号登录，无需 SSH 隧道。客户管理演示地址为网站域名下的 `/manage.html`。

配置、备份与维护见 [反向代理说明](../docker/reverse-proxy/README.md)。证书自动续期。切换到 HTTPS 域名后，原 HTTP IP 下的浏览器 localStorage 数据不会自动迁移。

### SSH 隧道备用访问 TeamCity

在 Windows 新开一个终端执行，并在提示时输入服务器密码：

```sh
ssh -N -o ServerAliveInterval=30 -L 127.0.0.1:18111:127.0.0.1:8111 root@45.59.102.76
```

保持终端连接，再访问 `http://127.0.0.1:18111/`。如果本机 18111 已由现有隧道监听，直接使用该页面即可。公网网站为 `https://neon-loft-zyh.duckdns.org/`，原 IP 地址自动跳转。网站与 TeamCity 的公网 HTTPS 访问均不依赖本机隧道或电脑保持开机。

本机验证 Kotlin 定义时需要 JDK 21、Maven 和上述隧道：在 `.teamcity` 目录运行 `mvn teamcity-configs:generate`。在服务器上运行则追加 `-Dteamcity.server.url=http://127.0.0.1:8111`。依赖仓库地址可通过该参数覆盖。

### 手动运行网站容器

以下是 Linux shell 示例，端口和镜像标签可按实际情况修改：

```sh
docker build -t neon-loft:manual .
export NEON_IMAGE=neon-loft:manual
export NEON_HTTP_PORT=8080
docker compose -p neon-loft config --quiet
docker compose -p neon-loft up -d --wait
curl -f http://127.0.0.1:8080/healthz
curl -I http://127.0.0.1:8080/manage.html
```

单容器更新会短暂中断连接，本方案不是零停机发布。回退主要恢复镜像，不处理未来数据库迁移；接入数据库后需要另行设计备份和兼容策略。健康检查通过仅表示核心页面可访问，不能代替 3D 浏览器实测。

不要自动全局清理 Docker 资源。历史镜像应在确认稳定、保留最近成功版本后按本项目标签清理。

## 缓存和授权说明

刷新仍会重新初始化 3D 场景；缓存减少素材传输，不会省去 GPU 场景创建。HTML 每次重新验证；发布后同名模型/纹理可能在一小时缓存期内仍显示旧版，需立即更新时改素材文件名。素材署名随镜像发布于 `/project-notes.txt`。

基础镜像使用 Node 主版本及 Nginx stable 标签，构建时拉取更新；生产验收后可将 Dockerfile 的镜像参数固定到验证过的摘要，以提高重建一致性。
