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

```shell
conda config --remove-key channels
conda config --add channels https://mirrors.tuna.tsinghua.edu.cn/anaconda/pkgs/main
conda config --add channels https://mirrors.tuna.tsinghua.edu.cn/anaconda/pkgs/r
conda config --add channels https://mirrors.tuna.tsinghua.edu.cn/anaconda/pkgs/free
conda config --set show_channel_urls yes
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

```shell
D:\app>conda config --show channels
channels:
  - https://mirrors.tuna.tsinghua.edu.cn/anaconda/pkgs/main/
  - defaults
```

# 搜索指定的包

```shell
conda search <package_name>
```

# 创建 Python 虚拟环境

```
conda create -n <your_env_name> python=x.x
```

```shell
conda create -n agent python=3.12
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