---
title: waliapi使用docker搭建
published: 2026-08-31
description: 'waliapi配置指令记录'
category: 工具与环境配置
---

## Docker Compose纯指令部署

```bash
# 1. 创建项目目录并进入
mkdir -p /opt/waliapi
cd /opt/waliapi

# 2. 生成 waliapi.env 密钥文件（自动生成随机令牌）
cat > waliapi.env <<EOF
WALIAPI_ADMIN_TOKEN="$(openssl rand -hex 32)"
WALIAPI_MCP_TOKEN="$(openssl rand -hex 32)"
EOF

# 3. 创建 docker‑compose.yml 配置文件
cat > docker-compose.yml <<'EOF'
services:
  waliapi:
    image: fuzhengwei/waliapi:latest
    container_name: waliapi
    restart: always
    ports:
      - "127.0.0.1:8777:8777"
    volumes:
      - waliapi-data:/data
    env_file:
      - ./waliapi.env

volumes:
  waliapi-data:
EOF

# 4. 删除旧的容器（防止冲突）
docker rm -f waliapi

# 5. 拉取镜像 + 启动
docker compose pull
docker compose up -d

# 6. 查看生成好的密钥
cat waliapi.env

# 7. 健康检测
curl http://127.0.0.1:8777/health
```

### Docker 指令部署

#### 快速启动

使用 Docker Hub 镜像 `fuzhengwei/waliapi` 一键部署：

```
# 生成 .env 密钥文件
cat > waliapi.env <<EOF
WALIAPI_ADMIN_TOKEN="$(openssl rand -hex 32)"
WALIAPI_MCP_TOKEN="$(openssl rand -hex 32)"
EOF

# 拉取镜像
docker pull fuzhengwei/waliapi:latest

# 启动容器 
docker run -d --name waliapi \
  -p 127.0.0.1:8777:8777 \
  -v waliapi-data:/data \
  --env-file ./waliapi.env \
  fuzhengwei/waliapi:latest

# 验证服务
 curl http://127.0.0.1:8777/health
```

国内加速, 当前`-p`配置为允许本机访问, 需要在服务器暴露端口使用`-p 8777:8777`

```
docker run -d --name waliapi \
  -p 127.0.0.1:8777:8777 \
  -v waliapi-data:/data \
  -e WALIAPI_ADMIN_TOKEN \
  -e WALIAPI_MCP_TOKEN \
  registry.cn-hangzhou.aliyuncs.com/xfg-studio/waliapi:0.2.5-amd64
```

查看当前的账号密码信息

```
docker exec waliapi cat /data/waliapi.xiaofuge.cn/INITIAL_PASSWORD
```

