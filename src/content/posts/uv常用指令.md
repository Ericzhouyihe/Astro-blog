---
title: uv常用指令
published: 2026-08-11
description: 'uv常用指令'
category: 工具与环境配置
---
# 全局安装
Windows环境下, 打开PowerShell并用管理员身份运行, 使用指令安装uv, 即可全局使用, 所有的conda环境都能用uv
```shell
# 临时允许执行脚本（仅当前窗口）
Set-ExecutionPolicy Bypass -Scope Process -Force
```
需要安装到c盘外需要指定路径, 安装完要修改默认路径, 不然后续安装东西还是在c盘
```shell
# 安装到 D:\app\uv，缓存放到 D:\data\uv-cache
mkdir D:\APP\uv\bin
mkdir D:\APP\uv\cache
powershell -ExecutionPolicy ByPass -c {
  $env:UV_INSTALL_DIR = "D:\APP\uv\bin";
  $env:UV_CACHE_DIR = "D:\APP\uv\bin\cache";
  irm https://astral.sh/uv/install.ps1 | iex
}
```

# 设置各种路径
`最好自己提前手动创建对应的文件夹`
```shell
mkdir D:\APP\uv\bin
mkdir D:\APP\uv\python
mkdir D:\APP\uv\tools
mkdir D:\APP\uv\cache
# Python解释器存放位置
setx UV_PYTHON_INSTALL_DIR "D:\APP\uv\python"
# 全局脚手架工具
setx UV_TOOL_DIR "D:\APP\uv\tools"
# 包缓存目录
setx UV_CACHE_DIR "D:\APP\uv\cache"
# uv程序本体
setx UV_INSTALL_DIR "D:\APP\uv\bin"
```
设置好后关闭所有终端, 重新打开, 使用下面的指令检查是否设置成功
```shell
# Python存放目录
uv python dir
# 全局脚手架目录（fastapi‑cli）
uv tool dir
# 依赖包缓存目录
uv cache dir
# uv本体exe位置
where uv
```

# 卸载uv (官方指令)
```shell
uv self uninstall
```

或者直接手动把uv相关的文件删掉

# 查看版本

```shell
uv --version
```


# 虚拟环境
## 创建虚拟环境
```shell
uv venv .venv --python 3.12
```

# 依赖包

## 安装依赖

安装一个（举例）
```shell
uv add fastapi
```
安装多个
```shell
uv add fastapi uvicorn httpx
```

## 删除依赖

```shell
uv remove uvicorn
```

## 清除缓存

```shell
uv cache clean
```

## 查看依赖列表

依赖树, 会展示依赖链路

```shell
uv tree
```

扁平的展示所有的依赖包

```shell
uv pip list
```

## 启动项目服务

```shell
uv run uvicorn main:app --reload
```

## 复原项目环境（克隆项目后用）

uv 项目依靠两份文件管理环境

- `pyproject.toml`：写明你需要哪些依赖包
- `uv.lock`（锁文件）：**锁定所有包精确版本、子依赖版本**，连依赖的依赖版本全部固定

使用指令固定信息

```shell
uv lock
```

当使用Git同步好远程的uv项目时，拉取下来这两个文件之后，可以直接用该指令进行复原环境

```shell
uv sync
```

```shell
# 生成lock（会同时解析两套extra）
uv lock

# 安装GPU环境（默认 .venv）
uv sync --extra gpu

# 安装CPU环境（默认 .venv）
uv sync --extra cpu
```

### requirements.txt

导出依赖清单到 requirements.txt:

1. 导出【生产依赖，不带 dev 包，不带 hash，干净 requirements.txt】（最常用）

```shell
uv export --no-dev --format requirements-txt -o requirements.txt
```

2. 导出锁文件（用于精确复现你本机环境，带哈希）

```shell
uv export --format requirements-txt -o requirements-lock.txt
```

3. uv pip导出

```shell
uv pip freeze > requirements.txt
```

从 requirements.txt 批量安装依赖

```shell
uv add -r requirements.txt
```

```shell
uv pip install -r requirements.txt
```

## 激活环境（Windows‑powershell）

```shell
.venv\Scripts\Activate.ps1
```
激活之后直接使用pip可以查看依赖信息
```shell
pip list
```

## 查看 Python 存放路径

```shell
uv python dir
```

## 查看本机全部识别到的 Python(uv,conda等下载的都会识别到)

```shell
uv python list
```

只查看 uv 已经下载安装完毕的版本

```shell
uv python list --only-installed
```

## 启动python

```shell
uv run pytho
```

```python
import torch
print(torch.__version__)
print(torch.version.cuda)
print(torch.cuda.is_available())
```

# uv创建项目

## 在当前文件夹初始化python项目
```shell
# 1.新建文件夹，进入项目目录
mkdir my_demo
cd my_demo

# 2.初始化项目，生成pyproject.toml
uv init

# 3.安装第三方包，自动更新uv.lock锁文件
uv add requests

# 4.一键搭建完整虚拟环境
uv sync
```

# 运行代码
```shell
uv run python main.py
```

如果是激活了虚拟环境，直接用Python命令可以运行

```shell
python main.py
```

