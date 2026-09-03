# Docker + TeamCity 部署说明

## 当前范围

先部署现有 3D 入口和客户管理演示页，再完善后台、账号和数据库。当前客户数据仍在访问者浏览器的 localStorage 中，不会因为部署容器就变成共享数据库。

配置预设：一台 Linux 网站服务器，在该服务器上运行专用 TeamCity Agent，使用同一台宿主机的 Docker。TeamCity Server 可以位于别处，也可以在资源允许时安装在同机。实际服务器情况尚待登录确认；本说明不代表已经部署成功。

流水线：GitHub main 提交 → TeamCity 拉取 → Docker 构建 → 临时容器健康及页面检查 → Docker Compose 更新网站 → 失败尝试回退。镜像保存在部署宿主机，无需额外镜像仓库。若 Agent 和网站分离到不同机器，必须先改为镜像仓库或镜像传输方案。

## 文件

- `Dockerfile`：Node 24 构建，Nginx 非 root 用户运行，监听容器 8080。
- `compose.yaml`：网站容器，默认宿主机 8080，128 MB 内存上限，只读文件系统，自动重启，日志轮转。
- `docker/nginx.conf`：健康检查 `/healthz`、HTML 重新验证、带内容哈希的 JS/CSS 长缓存、固定名字素材缓存一小时。不存在的文件返回 404。
- `ci/build.sh`：按 TeamCity 构建 ID 和 Git 提交生成镜像标签；验证首页、管理页、署名文件、纹理及 404。
- `ci/deploy.sh`：部署锁、等待健康状态、失败恢复原镜像。首次上线失败则停止失败容器。
- `.teamcity/settings.kts`：Kotlin DSL，两个顺序步骤，main 分支触发，同一构建配置最多一个并发任务。

## 服务器准备

连接后先检查操作系统、磁盘、实际内存、占用端口、Docker/Compose 与现有服务。需要 Docker Engine 和支持 `up --wait` 的 Compose v2。不要覆盖已有网站或更改其他 Compose 项目。

部署 Agent 需要 Git、Docker CLI、Compose v2，以及目标 Docker daemon 的访问权限。如使用 TeamCity 官方 Agent 容器，可挂载宿主机 Docker socket。该权限等同于管理宿主机，应使用此项目专用的可信 Agent，不运行无关仓库代码。

Agent 的环境变量必须配置为：

| 参数 | 值 / 说明 |
| --- | --- |
| `NEON_DEPLOY_TARGET` | `neon-loft-production`，用于筛选专用 Agent |
| `NEON_HTTP_PORT` | 登录服务器后确认的空闲端口，例如 `8080` |
| `NEON_BIND_ADDRESS` | 可选，默认 `0.0.0.0`；使用本机反向代理时可设 `127.0.0.1` |
| `NEON_DEPLOY_STATE_DIR` | Agent 内可写且持久化的目录，例如 `/data/neon-loft-deploy`；容器化 Agent 时需挂载持久卷 |

TeamCity 中应显示对应的 `env.*` Agent 参数。脚本通过这些环境变量运行。`env.NEON_BUILD_ID` 由构建配置自动设置。不要将密码、SSH 私钥或访问令牌提交到 Git。

6 GB 服务器如需同时运行 TeamCity Server 与 Agent，应限制 JVM 堆和并发数，观察实际内存后再安排数据库。此阶段无需安装 MySQL。

## TeamCity 接入

1. 先部署或确认 TeamCity Server，再连接并授权专用 Agent。
2. 用户通过 GitHub Desktop 提交本次部署文件并推送到 `MR-zyh221250/web` 的 main。
3. 在 TeamCity 从该仓库创建项目，导入 `.teamcity/settings.kts`。当前 DSL 版本为 `2025.11`；按实际 TeamCity 版本验证解析与兼容性。
4. 确认构建仅匹配目标 Linux Agent，工作目录包含完整 Git 检出。确认两个脚本依次执行，第二步仅在第一步成功后运行。
5. 首次手动 Run，检查镜像构建、临时容器检查及部署日志。再通过服务器地址检查 3D 页面、客户页、纹理、缓存响应头和刷新行为。
6. 再推送一次可见的小改动，验证 main 提交确实自动触发构建并更新网站。这一步通过后才算 CI/CD 跑通。

如果当前 TeamCity 不能直接解析 DSL，可按相同参数在 UI 中创建两个 Command Line 步骤：`sh ci/build.sh`、`sh ci/deploy.sh`；VCS root 指向该仓库 main，开启 VCS Trigger、限制并发为 1、添加上述 Agent requirements。不要同时保留两个会自动部署的重复构建配置。

## 本地或服务器手动试运行

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
