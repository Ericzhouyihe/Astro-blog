---
title: uv安装配置
published: 2026-08-07
description: 'uv安装'
category: 工具与环境配置
---

# 在虚拟环境中安装uv

如果之前有用pip install过, 可以删除pip安装的uv, 然后安装全局uv
```shell
pip uninstall uv
```

清除uv的缓存
```shell
uv cache clean
```

Windows环境下, 打开PowerShell并用管理员身份运行, 使用指令安装uv, 即可全局使用, 所有的conda环境都能用uv
```shell
# 临时允许执行脚本（仅当前窗口）
Set-ExecutionPolicy Bypass -Scope Process -Force
```
```shell
# 安装到 D:\app\uv，缓存放到 D:\data\uv-cache
powershell -ExecutionPolicy ByPass -c {
  $env:UV_INSTALL_DIR = "D:\\app\\uv";
  $env:UV_CACHE_DIR = "D:\\data\\uv-cache";
  irm https://astral.sh/uv/install.ps1 | iex
}
```
修改默认的uv缓存位置
```shell
irm https://astral.sh/uv/install.ps1 | iex
```

卸载uv (官方指令)
```shell
uv self uninstall
```