---
title: Docker常用工具配置
published: 2026-08-11
description: 'Docker常用工具配置'
category: 工具与环境配置
---

# MySQL

```shell
docker run -d `
  --name mysql8 `
  --restart always `
  -p 3306:3306 `
  -v D:\docker\mysql-data:/var/lib/mysql `
  -e MYSQL_ROOT_PASSWORD=Root@123456 `
  -e TZ=Asia/Shanghai `
  mysql:8.0
```

