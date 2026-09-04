> 2026-09-04：已升级为独立展示站与商户 CRM，新增店铺、广告审核、客人注册预约、图片裁剪。当前流程与地址见 [双站业务说明](BUSINESS.md)。下文保留早期部署背景。

# 客户销售管理：后端、账号与数据库

## 使用

入口：https://neon-loft-zyh.duckdns.org/manage.html

3D 房间公开展示；客户管理必须登录。CRM 和 TeamCity 使用独立账号。

- 管理员：查看和管理所有客户及销售记录；创建销售员；分配客户；停用账号；设置新的临时密码。
- 销售员：仅查看、维护自己负责的客户和对应销售记录。
- 账号由管理员创建，不开放匿名注册。临时密码首次登录必须修改；密码修改和管理员重置后旧会话失效。
- 停用销售员不会删除客户或销售历史；管理员可把其客户分配给其他有效账号。客户转移后，其关联销售记录随客户的当前负责人变更访问权限。
- 有销售记录的客户不能直接删除。编辑/删除携带记录版本，防止旧页面覆盖他人的更新；遇到冲突请关闭编辑窗口并刷新。
- 原 localStorage 演示数据不会自动迁入 MySQL。现有页面不再读取或写入该演示存储。

## 架构

同源 `/api/*` → Caddy → 127.0.0.1:3000 → Node.js 24 / Express 5 → MySQL 8.4。

数据库表：users、sessions、customers、sales。所有业务接口在后端验证权限；参数化 SQL、外键、事务和行版本共同保证数据一致性。金额以整数分保存。

密码使用随机盐与 scrypt（N=32768,r=8,p=1），会话使用随机 256 位令牌，数据库仅存令牌 SHA-256，8 小时过期。Cookie 为 HttpOnly、Secure、SameSite=Strict。写接口强制校验 Origin 和 JSON 类型；登录有限速。

## 容器与发布

- `backend/`：API 源码、初始化表结构、依赖锁与 API Dockerfile。
- `docker/crm/compose.yaml`：独立 neon-crm 项目，MySQL 无公网端口，API 只绑定回环地址。MySQL 768 MB、API 256 MB 上限。
- `ci/build.sh`：构建前端与 API 镜像；前端检查后运行隔离的真实 MySQL 集成测试。
- `ci/test-api.sh`：临时私有 Docker 网络、测试数据库及 API，验证认证、权限、CRUD、并发版本、账号停用/重置和 API 重启后持久化；完成后只移除这些测试资源。
- `ci/deploy.sh`：部署锁、部署前 SQL 备份、API 和网站健康检查、失败尝试恢复两者上一镜像。数据库卷不删除。表结构目前仅为首次创建，不做破坏性迁移；未来结构修改必须先设计兼容迁移，镜像回退不等于数据库回退。

MySQL 数据持久卷为 `neon-crm_mysql-data`。数据库密码位于服务器 `/opt/neon-crm/secrets`，不在 Git、构建产物或网页中。由于 Compose 在专用 Agent 中执行，该目录以同路径只读挂载至可信 Agent。

首次管理员通过容器内部 `node server.mjs --bootstrap` 从标准输入接收 JSON 创建，只允许数据库尚无管理员时执行；没有公开的初始化或注册接口。初始凭据由部署者另行交付，登录后修改。

## 备份与恢复

每日 UTC 03:00（北京时间 11:00，最多随机延后 5 分钟），systemd timer 执行 `/opt/neon-crm/backup.sh`，保留约 7 天的压缩 SQL 备份，目录 `/opt/neon-crm/backups` 仅 root 可读。CI 部署前另备份到 Agent 持久状态卷的 backups 目录。

```sh
systemctl status neon-crm-backup.timer
sh /opt/neon-crm/backup.sh
gzip -t /opt/neon-crm/backups/<备份文件>.sql.gz
```

恢复须先暂停发布和 API 写入，确认具体备份后再导入；SQL 恢复会覆盖对应数据，应先备份当前库。建议先在隔离的临时数据库验证：

```sh
gzip -dc <已确认的备份文件>.sql.gz | docker exec -i <目标数据库容器> sh -c 'export MYSQL_PWD=$(cat /run/secrets/db_root_password); exec mysql -uroot neon'
```

目前备份保存在同一服务器，能够处理误操作和发布回退，不能抵御整台服务器或磁盘丢失；长期使用需增加异地备份。

## 验收

1. 管理员首次登录修改密码，再创建两个销售员账号。
2. 给两个账号分别分配客户，验证各自只能看到对应客户。
3. 创建销售、刷新、换浏览器登录，确认服务器持久化。
4. 管理员停用其中一个账号，该账号现有会话应立即失效。
5. GitHub Desktop 提交推送后，在 TeamCity 查看前后端构建、集成测试和部署结果。
