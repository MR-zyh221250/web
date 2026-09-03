# NEON LOFT · 3D 霓虹会客厅

网站首页采用 Neon Loft 3D 房间，右下角可直接进入客户销售管理。点击房间进行漫游，WASD 移动、鼠标转向、E 互动；按 Esc 释放鼠标。

## 本地运行

使用 Node.js 24 LTS：

```sh
npm ci
npm run dev
```

`npm run build` 包含 TypeScript 检查并生成 `dist/`。
生产效果预览：`npm run preview -- --host 127.0.0.1 --port 5182`。

## 当前实现

- `/`：本地加载的 3D 房间、夜城与网站入口。
- `/manage.html`：客户新增、编辑、删除、搜索；销售新增、编辑、删除；客户数、销售笔数和销售额统计。
- 金额按分保存；已有销售的客户不能直接删除。
- 管理功能通过后端接口保存到 MySQL，包含登录、退出、修改密码、管理员创建/停用/重置销售员账号；销售员仅能访问自己负责的客户和关联销售记录。首次登录必须修改临时密码，不开放公开注册。
- 原场景中的书籍、新闻、视频投屏等联网扩展依赖额外服务；本次未部署作者的 Vercel API 或本地调试代理。保留核心房间、交互与素材署名。

## Docker 与 TeamCity 部署

Dockerfile 使用 Node 构建、Nginx 提供页面，包含容器健康检查和静态素材缓存。TeamCity 配置位于 `.teamcity/settings.kts`，执行镜像构建、HTTP 检查和部署，部署失败时尝试回退上一版本。

网站地址：https://loft.45-59-102-76.sslip.io/ 。TeamCity：https://ci.45-59-102-76.sslip.io/ ，使用原有账号登录。两者由独立 Caddy 容器反向代理，HTTPS 证书自动续期。原 IP 的 HTTP 访问自动跳转至网站域名。

构建 #3 已成功部署提交 `c79d2d1a3808`。VCS 触发器每分钟检查 main，网站部署端口已改为宿主机回环地址 8080。具体参数和操作步骤见 [部署说明](docs/DEPLOYMENT.md) 和 [反向代理说明](docker/reverse-proxy/README.md)。客户管理、账号权限、数据备份和容器说明见 [CRM 使用与运维](docs/CRM.md)。

## 源码与许可

3D 项目：https://github.com/klmtseng/cyberpunk-room

基于下载时的 main 分支，原说明见 README.upstream.md。代码保留 klmtseng 的 MIT 许可，场景素材许可与来源见 THIRD_PARTY_ASSETS.md 以及管理页底部“项目说明”（public/project-notes.txt）。

自定义入口位于 src/entry.ts、src/entry.css；客户管理位于 manage.html、src/manage.ts、src/manage.css。原灯牌版已备份在此仓库外。
