---
title: PyTorch基础api
published: 2026-08-07
category: 编程技术
tags: [PyTorch, 深度学习, Tensor]
summary: "梳理 PyTorch 的核心基本命令，涵盖 Tensor 创建与转换、常见数值运算 API、Parameter 与模块定义，以及 Softmax / Sigmoid 交叉熵损失函数的使用要点。"
---

## 概述

PyTorch 同时具备两类能力：

- **类似 NumPy 的数值运算框架**：核心数据结构是 `ndarray`/`Tensor`，支持创建、加法、乘法、指数、对数、均值、求和等常见运算；
- **类似 sklearn 的模型学习框架**：关注网络的构造（算法结构）、损失函数、优化器。

本文重点关注：**Tensor 的创建、模型的创建、损失函数的创建、优化器的使用**。本次运行环境为 `torch 2.6.0+cpu`。

---

## 一、Tensor 创建

`Tensor` 是 PyTorch 中的基本对象，一般用来表示**不需要进行参数更新**的数据对象。

> **PS（默认约定）**：PyTorch 中随机创建 Tensor 默认浮点型为 `float32`，整型为 `int64`；默认数据所在设备为 CPU。可通过 `dtype` 指定数据类型、`device` 指定运行设备。

### 1. 随机创建 Tensor 对象

```python
x = torch.randn(2, 5)  # 创建 [2,5] 矩阵，元素服从 N(0,1)

print(x)
print(f"Shape形状为: {x.shape}")
print(f"数据的类型: {x.dtype}")
print(f"数据所在设备信息: {x.device}")
print(f"是否属于梯度更新参数: {x.requires_grad}")
```

常用随机/常数创建函数：

| 函数                             | 说明                           |
| -------------------------------- | ------------------------------ |
| `torch.randn(*shape)`            | 标准正态分布 N(0,1)            |
| `torch.randint(low, high, size)` | 指定区间随机整数（默认 int64） |
| `torch.ones(shape, dtype=...)`   | 全 1 矩阵                      |
| `torch.zeros(shape)`             | 全 0 矩阵                      |

每个 Tensor 都有四个核心属性：`shape`、`dtype`、`device`、`requires_grad`。

### 2. 基于已有数据创建 Tensor 对象

#### (a) 基于 Python 类型

```python
x_py = [1, 2, 3, 4, 5, 6]
x = torch.tensor(x_py)          # python 对象转 Tensor
xtolst = x.cpu().tolist()       # Tensor 转 list（仅 CPU 设备）
```

要点：
- 默认自动推断数据类型（浮点 float32，整型 int64），设备默认 CPU；
- **Tensor 与 Python 数据类型不共享内存**，相当于副本，互不影响。

#### (b) 基于 NumPy 类型

```python
x_np = np.asarray([1, 2, 3, 4, 5, 6])
x = torch.tensor(x_np)          # 不共享内存
x = torch.from_numpy(x_np)      # 共享内存
xtonp = x.numpy()               # Tensor 转 NumPy（共享内存，仅 CPU）
```

要点：
- 默认类型与给定 NumPy 类型一致，设备默认 CPU；
- `torch.tensor` 不共享内存，`torch.from_numpy` 共享内存；
- `x.numpy()` 转换时与原 Tensor 共享内存。

---

## 二、Tensor 设备、类型、Shape 转换

```python
x = torch.randn(3, 6)
```

### 1. reshape / view 改变形状

```python
_x = torch.reshape(x, shape=(3, 2, -1))  # 改成 [3, 2, 3]
_x = x.view(2, -1)                       # 改成 [2, 9]
```

> `view` 与 `reshape` 都改变 shape，但 `view` 执行效率更高，**要求 Tensor 在内存中连续**；转置后的数据不连续，不能使用 `view`，此时可用 `reshape`。

### 2. to 转换类型 / 设备

```python
_x = x.to(dtype=torch.float64)                              # 转数据类型
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
_x = x.to(device=device)                                    # 转设备
_x.cpu()                                                    # 快捷转回 CPU
```

---

## 三、Tensor 常见数值运算 API

基本操作与 NumPy 类似，主要区别：**多 Tensor 运算时要求 dtype 与 device 必须一致**（部分封装好的特殊 API 除外）。

### 1. 加法与广播

```python
x = torch.randn(2, 3)
y = torch.rand(2, 1)   # 支持广播
print(x + y)
```

### 2. 逐元素乘法（数乘 / Hadamard 积）

```python
x = 1.5                # 标量 × 矩阵
print(x * y)

x = torch.rand(2, 3)   # 同形逐元素乘
y = torch.rand(2, 3)
print(x * y)

x = torch.rand(1, 3)   # 广播逐元素乘
y = torch.rand(2, 3)
print(x * y)
```

### 3. 矩阵乘法

```python
x @ y              # 等价于 torch.matmul(x, y)
```

多维矩阵乘法支持广播机制：**实际只有最后两个维度参与矩阵乘法，其它维度相当于遍历**。

```python
x = torch.randn(2, 3, 2)
y = torch.randn(2, 2, 1)
print(x @ y)
```

### 4. 聚合运算

```python
torch.mean(x, dim=1)   # 按维度 1 求均值
x.sum(dim=2)           # 按维度 2 求和
```

### 5. 其它常用 API

```python
torch.abs(x)                    # 绝对值
torch.argmax(x, dim=-1)         # 最后维度上最大值的索引
torch.topk(x, k=3, dim=-1)      # 前 k 个较大值及其索引
x.T / torch.transpose(x, 0, 1)  # 转置
torch.permute(x, dims=(...))    # 多维转置（对应 np.transpose）
torch.split(x, split_size_or_sections=3, dim=1)  # 按每份大小分割
torch.chunk(x, chunks=3, dim=1)  # 按份数分割
torch.cat([x1, x2], dim=0)       # 沿指定维度合并
```

| API       | 含义                       |
| --------- | -------------------------- |
| `split`   | 按「每份大小」分割对应维度 |
| `chunk`   | 按「份数」分割对应维度     |
| `cat`     | 沿已有维度合并（维度不变） |
| `permute` | 多维轴交换                 |

---

## 四、Parameter 定义

`nn.Parameter` 用于把一个 Tensor 标记为**需要参与梯度更新的参数**。

```python
w_tensor = torch.randn(2, 3)
w_param = nn.Parameter(w_tensor)
print(w_tensor.requires_grad)  # False
print(w_param.requires_grad)   # True
```

要点：
- 除 `requires_grad` 默认变为 `True` 外，其余属性不变；
- 反向传播中会自动对所有 `requires_grad=True` 的对象计算梯度。

### grad_fn 自动追踪

当执行节点上存在需要计算梯度的对象时，PyTorch 默认会自动在该算子上添加 `grad_fn` 来计算梯度：

```python
w = nn.Parameter(torch.randn(2, 3))
x = torch.randn(1, 2)
print(x @ w)   # grad_fn=<MmBackward0>
```

### 跳过梯度计算

```python
with torch.no_grad():       # 上下文内不计算梯度
    print(x @ w)
print((x @ w).detach())    # detach 也能截断梯度
```

### 手动全连接示例

```python
w = nn.Parameter(torch.randn(2, 3))
b = nn.Parameter(torch.tensor([0.2, 0.2, 0.2]))
x = torch.randn(1, 2)
print(x @ w + b)   # grad_fn=<AddBackward0>
```

---

## 五、最基本的模块（nn.Module）

### 1. Linear 全连接层

```python
linear = nn.Linear(in_features=2, out_features=3, bias=True)
linear.to(device=device)

for name, param in linear.named_parameters():
    print(name, param)

r = linear(x)                                  # 前向调用
print(x @ linear.weight.T + linear.bias)       # Linear 的等价手写形式
```

### 2. 常见激活函数

```python
nn.ReLU()      # y = max(0, x)
nn.Sigmoid()   # y = 1 / (1 + e^{-x})
nn.Tanh()      # y = (e^x - e^{-x}) / (e^x + e^{-x})
```

### 3. Sequential 序列模块

```python
seq = nn.Sequential(
    nn.Linear(2, 3),
    nn.ReLU(),
    nn.Linear(3, 1)
)
r = seq(x)
```

> PS：不允许使用普通 Python 的集合列表对象，PyTorch 无法识别，必须用 `nn.Sequential` / `nn.ModuleList` 等封装。

---

## 六、损失函数

### 1. Softmax 交叉熵损失：`nn.CrossEntropyLoss`

适用于**多分类**任务（每个样本属于单一类别）。

```python
loss_fn = nn.CrossEntropyLoss()
score  = torch.randn(4, 5)                 # 4 个样本 × 5 类置信度（未经过 softmax）
target = torch.tensor([1, 3, 0, 0])        # 类别 id，取值范围 [0, 5)
loss = loss_fn(score, target)
```

参数说明：
- `score`：网络输出，是 softmax 之前的 logit；
- `target`：类别索引（int64），取值范围 `[0, 类别数)`。

**与手写 softmax 公式等价**（`reduction='none'`）：

```python
proba = torch.softmax(score, dim=-1)
loss  = -torch.log(proba)[[0,1,2,3], target]
```

> `CrossEntropyLoss` 内部已包含 `LogSoftmax + NLLLoss`，因此输入应是未做 softmax 的 logit。

### 2. Sigmoid 交叉熵损失：`nn.BCEWithLogitsLoss`

适用于**多标签分类**任务（每个样本可同时属于多个类别，标签为 0/1）。

```python
loss_fn = nn.BCEWithLogitsLoss()
score  = torch.randn(4, 5)
target = torch.tensor([
    [1, 1, 0, 0, 0],   # 同时属于类别 0、1
    [0, 0, 0, 1, 0],
    [0, 0, 0, 0, 0],   # 不属于任何类别
    [1, 0, 0, 1, 0]
], dtype=torch.float32)
loss = loss_fn(score, target)
```

**与手写 sigmoid 公式等价**：

```python
proba = torch.sigmoid(score)
# 当 target=1 时损失为 -log(p)；当 target=0 时损失为 -log(1-p)
loss = -(target * torch.log(proba) + (1 - target) * torch.log(1 - proba))
```

> `BCEWithLogitsLoss` 内部已将 sigmoid 与 BCE 合并，数值稳定性更好；输入同样是未经过 sigmoid 的 logit。

### 3. 两种损失的对比

| 损失函数            | 任务类型     | target 形式          | 输入含义           |
| ------------------- | ------------ | -------------------- | ------------------ |
| `CrossEntropyLoss`  | 单标签多分类 | 类别索引 `[1,3,0,0]` | softmax 前的 logit |
| `BCEWithLogitsLoss` | 多标签分类   | 0/1 矩阵             | sigmoid 前的 logit |

---

## 七、要点速记

1. **四大核心属性**：每个 Tensor 都有 `shape` / `dtype` / `device` / `requires_grad`。
2. **类型默认值**：随机浮点 float32，整型 int64，设备默认 CPU。
3. **内存共享**：`torch.from_numpy` / `x.numpy()` 共享内存，`torch.tensor` / `tolist` 不共享。
4. **view vs reshape**：`view` 更快但要求内存连续，转置后用 `reshape`。
5. **多 Tensor 运算**：要求 dtype 与 device 一致。
6. **Parameter**：把普通 Tensor 标记为可训练参数，`requires_grad` 默认 True。
7. **grad_fn**：参与梯度计算的算子会自动挂上 `grad_fn`；用 `torch.no_grad()` 或 `detach()` 跳过。
8. **损失输入**：`CrossEntropyLoss` / `BCEWithLogitsLoss` 的输入都是**未过激活函数的 logit**，损失内部已含激活。
