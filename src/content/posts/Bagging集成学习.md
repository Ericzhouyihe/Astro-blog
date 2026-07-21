---
title: Bagging集成学习
published: 2026-06-23
category: 编程技术
tags: [集成学习, Bagging, 决策树, scikit-learn, 机器学习, 随机采样]
---

# Bagging集成学习：用"群众投票"提升模型预测能力

## 概念介绍

### 什么是Bagging？

Bagging（Bootstrap Aggregating）是一种集成学习方法，核心思想很简单：**训练多个模型，让它们集体做决策**。

用一个生活中的例子来理解：假设你想估计一个罐子里有多少颗糖果。如果只问一个人，可能误差很大。但如果你问100个人，把他们的答案取平均值，结果往往会更接近真实值。这就是Bagging的精髓——**三个臭皮匠，赛过诸葛亮**。

### 解决什么问题？

单个模型（特别是决策树）容易出现两个问题：
- **过拟合**：对训练数据记得太死，换一批数据就不行了
- **不稳定**：训练数据稍有变化，结果就大幅波动

Bagging通过"集体智慧"来降低方差，让预测结果更加稳定可靠。

## 原理讲解

Bagging的工作流程可以拆解为三步：

### 第一步：有放回抽样（Bootstrap）

从原始数据集中**有放回地**随机抽取样本，生成多个子数据集。每个子数据集和原始数据集大小相同，但内容不完全一样——有些样本会被重复抽到，有些则不会出现。

> 类比：一个班30个同学，你闭着眼从花名册里随机点名30次（点过的可以再点），这样每次得到的"小组"成员会有差异。

### 第二步：独立训练多个弱学习器

用每个子数据集分别训练一个模型（通常是决策树）。这些模型彼此独立，互不影响。

### 第三步：聚合预测结果

- **回归任务**：取所有模型预测值的**平均值**
- **分类任务**：取所有模型预测类别的**多数投票**

## 公式推导

### Bootstrap抽样

从包含 $N$ 个样本的数据集 $D$ 中，有放回地抽取 $N$ 个样本，形成子集 $D_i$：

$$D_i = \{(x_1^{(i)}, y_1^{(i)}), (x_2^{(i)}, y_2^{(i)}), \ldots, (x_N^{(i)}, y_N^{(i)})\}$$

其中某些样本可能重复出现。

### 回归聚合

训练 $T$ 个基学习器 $h_1, h_2, \ldots, h_T$，最终预测为所有学习器的平均：

$$H(x) = \frac{1}{T}\sum_{t=1}^{T}h_t(x)$$

- $H(x)$：Bagging的最终预测值
- $T$：基学习器的数量（如200棵树）
- $h_t(x)$：第 $t$ 个基学习器的预测值

### 分类聚合

对于分类问题，采用投票机制：

$$H(x) = \text{sign}\left(\sum_{t=1}^{T}h_t(x)\right)$$

- $\text{sign}$：符号函数，正数输出+1，负数输出-1
- 票数多的类别获胜

### 方差降低的数学解释

假设每个基学习器的方差为 $\sigma^2$，且各学习器之间相互独立，则聚合后的方差为：

$$\text{Var}(H) = \frac{\sigma^2}{T}$$

这解释了为什么模型越多，预测越稳定。

## 代码逻辑

### Bagging回归实现

#### 1. 准备数据

```python
import pandas as pd
import numpy as np
from sklearn.tree import DecisionTreeRegressor
from sklearn.metrics import r2_score

# 构造一组简单的线性趋势数据
df = pd.DataFrame([[1, 10.56],
                   [2, 27],
                   [3, 39.1],
                   [4, 40.4],
                   [5, 58],
                   [6, 60.5],
                   [7, 79],
                   [8, 87],
                   [9, 90],
                   [10, 95]],
                  columns=['X', 'Y'])
x = df.iloc[:, :-1]  # 特征
y = df.iloc[:, -1]   # 标签
```

#### 2. 训练多个弱学习器

```python
M = []           # 存储所有弱学习器
n_trees = 200    # 构造200棵决策树

for i in range(n_trees):
    # 有放回抽样，frac=1.0表示抽取与原数据集相同数量的样本
    tmp = df.sample(frac=1.0, replace=True)
    X = tmp.iloc[:, :-1]
    Y = tmp.iloc[:, -1]
    # 用深度为1的决策树（决策树桩）作为弱学习器
    model = DecisionTreeRegressor(max_depth=1)
    model.fit(X, Y)
    M.append(model)
```

关键点解读：

- `sample(frac=1.0, replace=True)`：有放回抽样，每次抽取的数据集会有差异
- `max_depth=1`：限制树深度为1，确保每棵树都是"弱学习器"
- 不设置随机种子：保证每次抽样结果不同，增加多样性

#### 3. 聚合预测



```python
res = np.zeros(df.shape[0])  # 初始化预测累加器
for j in M:
    res += j.predict(x)      # 累加每棵树的预测
y_hat = res / n_trees        # 取平均值作为最终预测
print('R2:', r2_score(y, y_hat))
```

### Bagging分类实现



```python
from sklearn.tree import DecisionTreeClassifier
from sklearn.metrics import f1_score, accuracy_score

# 分类数据：标签为+1或-1
df = pd.DataFrame([[0, 1], [1, 1], [2, 1], [3, -1], [4, -1],
                   [5, -1], [6, 1], [7, 1], [8, 1], [9, -1]])

n_tree = 19  # 奇数个分类器，避免投票平局
models = []

for i in range(n_tree):
    df2 = df.sample(frac=1.0, replace=True)
    X = df2.iloc[:, :-1]
    Y = df2.iloc[:, -1]
    # splitter="random" 增加随机性
    dec = DecisionTreeClassifier(max_depth=1, splitter="random", max_features=1)
    dec.fit(X, Y)
    models.append(dec)

# 投票聚合
total = np.zeros(df.shape[0])
for i in range(n_tree):
    total += np.array(models[i].predict(x))
y_hat = np.sign(total)  # 符号函数决定最终类别
print(accuracy_score(y, y_hat))
```

关键点：分类器数量选奇数（19），可以避免投票平局的尴尬。

## 图表解读

### 回归结果对比

| 模型                | R² 得分 | 说明                     |
| ------------------- | ------- | ------------------------ |
| 单棵决策树（深度1） | 0.762   | 只能做一次分割，拟合粗糙 |
| Bagging（200棵树）  | 0.880   | 多棵树平均，拟合更精细   |

单棵决策树只能输出两个值（29.265和78.25），相当于把数据一刀切成两半。而Bagging通过200棵不同的树的平均，输出了更平滑、更接近真实值的预测。

### 分类结果对比

| 模型              | 准确率 | F1 分数 |
| ----------------- | ------ | ------- |
| 单棵决策树        | 0.70   | 0.667   |
| Bagging（19棵树） | 0.70   | 0.800   |

虽然准确率相同，但Bagging的F1分数明显提升（0.667→0.800），说明它在正负类的识别上更加均衡。

## 应用场景

Bagging在实际业务中非常常见：

- **随机森林**：Bagging + 随机特征选择的经典实现，广泛用于风控评分、客户分类
- **金融预测**：股票走势、信用评分等场景，单模型波动大，Bagging能有效降低方差
- **医疗诊断**：多个模型综合判断，降低误诊风险
- **异常检测**：通过多个子模型的不一致性来识别异常样本

## 总结

1. **Bagging的核心逻辑**：通过有放回抽样生成多个不同的训练集，训练多个弱学习器，最终通过平均（回归）或投票（分类）得到更稳定的预测结果
2. **关键超参数**：基学习器数量（越多越稳定但越慢）、基学习器复杂度（通常用浅层决策树）
3. **适用场景**：当单个模型方差大、不稳定时，Bagging能显著提升泛化能力，是随机森林的理论基础