---
title: 本地git设置
published: 2026-07-01
category: 工具与环境配置
---

# 查询git全局配置

```shell
git config --global -l
```



# 设置GitHub加速端口

因为平时提交和拉取老是超时，所以需要进行代理，将访问GitHub链接的设置到本地的代理端口即可
```shell
git config --global http.https://github.com.proxy http://127.0.0.1:7890
```

