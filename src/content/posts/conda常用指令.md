---
title: conda常用指令
published: 2026-07-22
description: 'conda常用指令'
category: 工具与环境配置
---

# 列出当前环境中已安装的包

```shell
conda list
```

# 列出当前存在的所有环境

```shell
conda env list
```

# 为 conda 添加国内镜像源

```shell
conda config --add channels https://mirrors.tuna.tsinghua.edu.cn/anaconda/pkgs/main/
```

# 移除指定的 channel

```shell
conda config --remove channels <channel_name>
```

# 恢复默认源

```shell
conda config --remove-key channels
```

# 查看当前 channels 配置状态

```shell
conda config --show channels
```

# 搜索指定的包

```shell
conda search <package_name>
```

# 创建 Python 虚拟环境

```
conda create -n <your_env_name> python=x.x
```

- 解释：创建 Python 版本为 x.x，名字为 your_env_name 的虚拟环境
- 创建爬虫环境conda create -n crawler Python=3.10

# 激活指定的环境

```shell
conda activate <your_env_name>
```

# 退出当前环境

```shell
conda deactivate
```

# 在当前环境中安装包

```shell
conda install <package_name>=x.x
```

# 在指定环境中安装包

```shell
conda install -n <your_env_name> <package_name>=x.x
```


# 删除当前环境中的某个包

```shell
conda remove <package_name>
```


# 删除指定环境中的某个包

```shell
conda remove -n <your_env_name> <package_name>
```

# 删除指定的虚拟环境

```shell
conda remove -n <your_env_name> --all
```

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