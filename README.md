# NEON LOFT · 霓虹展示站与独立 CRM

非 3D 的中英文霓虹展示网站，支持店铺广告浏览、分类搜索、图文详情、客人注册、预约与留言。平台管理后台与商户工作台使用独立地址和角色权限；客户头像支持在线裁剪上传。

- 展示站：https://neon-loft-zyh.duckdns.org/
- 平台管理后台：https://crm.neon-loft-zyh.duckdns.org/
- 商户工作台：https://merchant.neon-loft-zyh.duckdns.org/
- TeamCity：https://neon-ci-zyh.duckdns.org/

店铺账号由管理员创建，店主自行录入资料开店。广告必须具备中英文内容，审核后发布；支持置顶、主动下架和到期隐藏。客人注册后同步生成 CRM 客户记录。

完整操作、权限、数据迁移及部署说明见 [双站业务说明](docs/BUSINESS.md)。原 CRM 数据和账号保留。

## 本地开发

Node.js 24，运行 `npm ci`、`npm run dev`。开发地址为 http://127.0.0.1:5182/ ，平台管理页为 `/manage.html`，商户页为 `/merchant.html`，API 通过本机 3000 端口连接后端。`npm run build` 生成静态产物；生产环境通过两个独立后台域名访问。

## 发布

通过 GitHub Desktop Commit、Push 到 main，由 TeamCity 构建展示站、管理站、API，完成隔离 MySQL 测试后备份数据库并部署。不要将测试账号、服务器密码或 DNS 令牌提交到 Git。

MySQL 保存业务记录和压缩图片，使用 Docker 持久卷。Caddy 提供 HTTPS 与独立站点路由。历史部署背景见 [部署说明](docs/DEPLOYMENT.md)，当前新增内容以双站业务说明为准。

## 来源

项目最初基于 MIT 许可的 cyberpunk-room，原 3D 源码保留但不再由展示站加载。首页夜景图片来源及许可保留在 site-public/project-notes.txt、THIRD_PARTY_ASSETS.md；原项目说明见 README.upstream.md。
