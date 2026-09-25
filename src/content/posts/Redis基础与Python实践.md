---
title: Redis 基础与 Python 实践
published: 2026-09-23
tags:
  - Redis
  - Python
  - ConnectionPool
  - Pipeline
  - 缓存
category: Python 与 AI 应用开发
description: 介绍 Redis 的常用数据类型、Python 连接方式、连接池、JSON 存储、Pipeline 批处理及项目配置。
---
## 1. Redis简介

Redis 是一个基于内存的 Key-Value 数据库。

特点：

- 数据存储在内存，速度快
- 支持多种数据结构
- 常用于：
  - 缓存
  - 临时数据
  - 排行榜
  - 会话保存
  - 消息队列
## 2. Python连接Redis

### 2.1 直接创建 Redis 对象

```python
from redis import Redis

redis = Redis(host="localhost", port=6379, password="", db=0)
```
特点：

- 写法简单
- 适合学习、小项目、测试

### 2.2 Redis.from_url()

项目中更常见。

配置：

```env
REDIS_URL=redis://localhost:6379/0
```

代码：

```python
from redis import Redis

redis = Redis.from_url("redis://localhost:6379/0")
```

### 2.3 ConnectionPool（连接池）

作用：

管理 Redis 连接，避免频繁创建连接。

结构：

```
应用程序
  |
ConnectionPool
  |
连接1
连接2
连接3
 |
Redis服务器
```

代码：

```python
from redis import ConnectionPool, Redis

# pool = ConnectionPool(host="localhost", port=6379, db=0, max_connections=20)
pool = ConnectionPool.from_url("redis://localhost:6379/0", max_connections=20)

redis = Redis(connection_pool=pool)
```

## 3. ConnectionPool 常用参数

|参数|作用|
|---|---|
|host|Redis地址|
|port|Redis端口|
|db|Redis数据库编号|
|password|Redis密码|
|max_connections|最大连接数|
|socket_connect_timeout|连接超时时间|
|socket_timeout|读写超时时间|
|decode_responses|自动转换字符串|
## 4. Redis数据类型

理解这些类型时，可以对照 [Python 的标准数据类型](./p04-标准数据类型-索引-切片.md)：Hash 类似字典，List 是有序序列，Set 用来保存不重复的成员。不过，这只是帮助理解的类比，Redis 中的数据保存在服务端，需要通过相应命令读写，并不是直接操作本地 Python 对象。

### 4.1 String

结构：

```
key -> value
```

写：

```python
redis.set("name", "Tom")
```

读：

```python
redis.get("name")
```

### 4.2 Hash

类似 Python 字典。

结构：

```
key
 |
 field:value
```

写：

```python
redis.hset("user", mapping={"name": "Tom", "age": "18"})
```

读取：

```python
redis.hgetall("user")
```

### 4.3 List

特点：

- 有顺序
- 可以重复

添加：

```python
redis.rpush("list", "a")
```

读取：

```python
redis.lrange("list", 0, -1)
```

### 4.4 Set

特点：

- 无序
- 自动去重

添加：

```python
redis.sadd("tags", "python")
```

读取：

```python
redis.smembers("tags")
```

### 4.5 Sorted Set(ZSet)

带分数排序。

添加：

```python
redis.zadd("rank", {"Tom": 100})
```

读取：

```python
redis.zrange("rank", 0, -1, withscores=True)
```

## 5. Redis JSON存储

Redis不能直接保存Python对象。

需要转换：

```python
import json

data = {"name": "Tom"}

redis.set("user", json.dumps(data))
```

读取：

```python
json.loads(redis.get("user"))
```

## 6. Redis Pipeline

### 6.1 Pipeline作用

Pipeline：

> 将多个Redis命令一次发送，减少网络通信次数。

普通方式：

```python
redis.set("a", 1)
redis.set("b", 2)
redis.set("c", 3)
```

产生：

```
3次网络请求
```

Pipeline：

```python
pipe = redis.pipeline()

pipe.set("a", 1)
pipe.set("b", 2)
pipe.set("c", 3)

pipe.execute()
```

产生：

```
1次网络请求
```

### 6.2 Pipeline执行特点

pipeline中的命令不会立即执行：

```python
pipe.set("name", "Tom")
```

需要：

```python
pipe.execute()
```

才提交。

### 6.3 Pipeline返回值

```python
pipe = redis.pipeline()

pipe.set("a", 1)
pipe.get("a")

result = pipe.execute()
```

返回：

```python
[True, b"1"]
```

### 6.4 Pipeline和事务

普通：

```python
redis.pipeline()
```

作用：

- 批量发送
- 减少网络请求

事务：

```python
redis.pipeline(transaction=True)
```

作用：

- 保证多个命令一起执行
    

## 7. 项目推荐配置

`.env`

```env
REDIS_URL=redis://redis:6379/0
```

代码：

```python
from redis import ConnectionPool, Redis

pool = ConnectionPool.from_url(
    REDIS_URL,
    max_connections=20,
    socket_connect_timeout=3,
    socket_timeout=5,
    decode_responses=True
)

redis = Redis(connection_pool=pool)
```

## 8. 常用方法总结

|功能|方法|
|---|---|
|设置值|set|
|获取值|get|
|删除|delete|
|判断存在|exists|
|设置过期|expire|
|查看过期时间|ttl|
|Hash写入|hset|
|Hash读取|hget/hgetall|
|列表添加|lpush/rpush|
|列表读取|lrange|
|集合添加|sadd|
|集合读取|smembers|
|排序添加|zadd|
|排序读取|zrange|
|批量执行|pipeline|

## 9. 项目中Redis定位

如果把 Redis 放进 [FastAPI + SQLAlchemy](./FastAPI_SQLAlchemy.md) 这样的后端项目，可以让 SQLAlchemy 负责业务数据的持久化，Redis 负责热点数据缓存和临时状态。对于还需要语义检索的 AI 应用，则可以再引入向量数据库，形成下面的分工：

```
MySQL
 |
保存真实数据

Redis
 |
缓存、临时状态、排行榜

Milvus
 |
向量数据

LLM
 |
理解和生成回答
```

其中，Milvus 负责向量相似度检索，与这里 Redis 的缓存职责不同；向量如何用于检索，以及它与业务数据库如何配合，可以接着看[《什么是向量数据库》](./什么是向量数据库.md)。

Redis主要负责：

- 快速读取
- 缓存热点数据
- 保存临时状态

不是替代MySQL作为主数据库。

## 相关阅读

- [Docker 常用工具配置](./Docker-常用工具配置.md)
