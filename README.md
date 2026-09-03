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
- 管理功能目前为本机演示，保存在当前浏览器的 localStorage。没有真实账号登录、多人共享数据库，暂不适合作为正式客户数据系统。
- 原场景中的书籍、新闻、视频投屏等联网扩展依赖额外服务；本次未部署作者的 Vercel API 或本地调试代理。保留核心房间、交互与素材署名。

## 后续部署

按需求使用 TeamCity 连接 GitHub 仓库，完成构建后将 dist 部署到服务器。服务器数据库、登录和正式 CI/CD 待后续步骤接入，目前没有已部署的生产地址。

## 源码与许可

3D 项目：https://github.com/klmtseng/cyberpunk-room

基于下载时的 main 分支，原说明见 README.upstream.md。代码保留 klmtseng 的 MIT 许可，场景素材许可与来源见 THIRD_PARTY_ASSETS.md 和场景内的“授權”面板。

自定义入口位于 src/entry.ts、src/entry.css；客户管理位于 manage.html、src/manage.ts、src/manage.css。原灯牌版已备份在此仓库外。
