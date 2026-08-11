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
mkdir D:\\APP\\uv\\bin
mkdir D:\\APP\\uv\\cache
powershell -ExecutionPolicy ByPass -c {
  $env:UV_INSTALL_DIR = "D:\APP\uv\bin";
  $env:UV_CACHE_DIR = "D:\APP\uv\bin\cache";
  irm https://astral.sh/uv/install.ps1 | iex
}
```

# 设置各种路径
`最好自己提前手动创建对应的文件夹`
```shell
mkdir D:\\APP\\uv\\bin
mkdir D:\\APP\\uv\\python
mkdir D:\\APP\\uv\\tools
mkdir D:\\APP\\uv\\cache
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

# 查看版本
```shell
uv --version
```

# Python版本控制
## 安装想要的版本
```shell
# 安装该大版本最新小版本（例如自动下载3.12.6）
uv python install 3.12
```
```shell
# 安装精准固定版本
uv python install 3.12.4

# 一次性批量安装多个常用版本
uv python install 3.10 3.11 3.12 3.13
```
## 查看 Python 存放路径
```shell
uv python dir
```

## 查看本机全部识别到的 Python(uv的,conda下载的都会识别到)
```shell
uv python list
```
只查看 uv 已经下载安装完毕的版本
```shell
uv python list --only-installed
```


# 虚拟环境
## 创建虚拟环境
```shell
uv venv .venv
```

## 查看依赖
依赖树, 会展示依赖链路
```shell
uv tree
```
扁平的展示所有的依赖包
```shell
uv pip list
```
## 安装依赖（fastapi、接口测试工具）
安装一个
```shell
uv add fastapi
```
安装多个
```shell
uv add fastapi uvicorn httpx
```

## 卸载包
```shell
uv remove uvicorn
```

## 启动项目服务
```shell
uv run uvicorn main:app --reload
```

## 根据锁文件同步完整依赖（别人克隆项目后用）
```shell
uv sync
```

## 导出 requirements.txt
```shell
uv export --format requirements-txt > requirements.txt
```

## 从 requirements.txt 批量安装
```shell
uv add -r requirements.txt
```

## 激活环境（Windows‑powershell）
```shell
.venv\Scripts\Activate.ps1
```
激活之后直接使用pip可以查看依赖
```shell
pip list
```

# uv创建项目
## 在当前文件夹初始化python项目
```shell
uv init
```

# 运行代码
```shell
# 激活环境前
uv run python main.py

# 激活环境后直接
python main.py
```

