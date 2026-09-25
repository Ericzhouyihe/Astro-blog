---
title: "从 Seq2Seq、Attention 到 Transformer：NLP 架构演进"
published: 2026-09-12
category: 编程技术
tags: [NLP, RNN, Seq2Seq, Attention, Transformer, LLM]
description: "从序列建模的问题出发，梳理 RNN、LSTM、Seq2Seq、Attention 与 Transformer 的演进逻辑，并说明它们与 BERT、GPT、RAG 和 Agent 的关系。"
---
# 从 Seq2Seq、Attention 到 Transformer：NLP 架构演进

从 Seq2Seq 到 Attention，再到 Transformer，这条技术路线可以浓缩为三个问题：

1. **Seq2Seq**：如何把一个序列转换成另一个序列？
2. **Attention**：生成内容时，应该重点关注输入中的哪些位置？
3. **Transformer**：能否摆脱 RNN 逐步计算的限制，让序列中的所有位置直接建立联系？

## 一、整体发展历程

先不看公式，只看模型演进背后的逻辑：

```text
RNN
 │  能够处理序列
 │  但难以捕获长期依赖，而且必须按顺序计算
 ↓
LSTM / GRU
 │  缓解长期记忆问题
 ↓
Seq2Seq
 │  通过 Encoder + Decoder 实现“序列 → 序列”
 ↓
Attention
 │  缓解“用一个向量表示整句话”的信息瓶颈
 │  Decoder 可以动态关注 Encoder 的不同位置
 ↓
Transformer
 │  以 Self-Attention 为核心
 │  不再依赖 RNN 的循环计算，可以高度并行
 ↓
BERT / GPT
 ↓
现代 LLM
 ↓
RAG / Tool Calling / Agent
```

> [!important]
> Attention 并不是在 Transformer 中才出现的。它最初被引入基于 RNN 的 Seq2Seq 模型，用于缓解固定长度向量带来的信息瓶颈。这是理解整段发展历史的关键。

## 二、Seq2Seq：从一个序列到另一个序列

### 2.1 Seq2Seq 要解决什么问题

以机器翻译为例：

```text
英文：I love you
          ↓
中文：我爱你
```

输入和输出都是序列，而且二者长度不一定相同：

```text
输入：I really like this book
输出：我真的很喜欢这本书
```

因此，我们需要一种能够实现 **Sequence to Sequence（序列到序列）** 的模型，这就是 Seq2Seq。

### 2.2 核心结构：Encoder + Decoder

经典 Seq2Seq 由编码器和解码器组成：

```text
I → love → you → Encoder → 上下文信息
                            ↓
                         Decoder
                            ↓
                         我 → 爱 → 你
```

- **Encoder（编码器）**：读取并编码输入序列，可以理解为“阅读理解”。
- **Decoder（解码器）**：根据编码结果逐步生成输出，可以理解为“组织答案”。

### 2.3 为什么早期 Seq2Seq 使用 RNN、LSTM 或 GRU

早期处理序列的主流模型是 RNN 及其变体，因此经典 Seq2Seq 通常采用：

- Encoder：RNN、LSTM 或 GRU；
- Decoder：RNN、LSTM 或 GRU。

```text
I    → love → you
↓       ↓      ↓
LSTM → LSTM → LSTM
                 ↓
            最终状态 C / h
                 ↓
            LSTM → LSTM → LSTM
              ↓      ↓      ↓
              我     爱     你
```

这种架构通常称为 **RNN/LSTM-based Seq2Seq**。

### 2.4 固定长度向量带来的信息瓶颈

最初的 Seq2Seq 要把整个输入序列压缩成一个固定长度的上下文向量，再交给 Decoder：

```text
整个输入序列
     ↓
  Encoder
     ↓
固定长度向量
     ↓
  Decoder
```

这相当于读完一本书后，只能依靠一张简短摘要回答所有问题。对于短序列尚可，但输入越长，越容易丢失信息。

## 三、Attention：动态查找重要信息

### 3.1 Attention 的核心思想

Attention 不再要求 Encoder 把整句话压缩成单一向量，而是保留每个位置的隐藏状态。Decoder 每生成一个词，都可以动态选择当前最相关的输入信息。

```text
Encoder 输出：h₁  h₂  h₃  h₄  h₅  ...
                  ↓
              Attention
                  ↓
               Decoder
```

以翻译 `I love you` 为例：

| Decoder 正在生成 | 可能重点关注的输入词 |
| --- | --- |
| 我 | I |
| 爱 | love |
| 你 | you |

因此，Attention 可以理解为一种**动态查阅机制**：Decoder 每生成一个词，都会询问“此时最应该参考输入中的什么？”

### 3.2 Query、Key 与 Value

Attention 中有三个核心概念：

- **Query（查询）**：我现在想找什么？
- **Key（键）**：每个位置具有什么特征，能否与 Query 匹配？
- **Value（值）**：匹配成功后，真正要取出的信息是什么？

其工作过程可以直观地表示为：

```text
Decoder 当前状态
       ↓
     Query
       ↓
与 Encoder 的 K₁、K₂、K₃、K₄ ... 比较
       ↓
得到注意力权重：0.1、0.7、0.2、0.0 ...
       ↓
对 V₁、V₂、V₃、V₄ ... 加权求和
       ↓
得到当前生成步骤所需的上下文信息
```

Attention 的本质就是：**计算当前应该关注哪些位置，以及各自需要关注多少。**

### 3.3 Attention 解决了什么问题

在原始 Seq2Seq 中，Decoder 只能依赖一个固定长度向量；加入 Attention 后，Decoder 可以在每个生成步骤访问 Encoder 的全部隐藏状态。

```text
原始 Seq2Seq：输入 → 固定长度向量 → Decoder

加入 Attention：输入 → 多个隐藏状态 → 动态选择相关信息 → Decoder
```

因此，Attention 缓解了固定长度表示造成的**信息瓶颈**。

## 四、RNN + Attention 仍然存在的问题

Attention 改善了信息获取方式，但底层的 RNN 仍需要按顺序计算：

```text
x₁ → x₂ → x₃ → x₄ → x₅
```

因为 `h₂` 依赖 `h₁`，`h₃` 又依赖 `h₂`，所以它仍有两个明显限制。

### 4.1 难以并行

后一个状态依赖前一个状态，序列中的所有位置无法同时计算。在长序列和大规模训练场景下，这会明显影响效率。

### 4.2 长距离信息传播路径过长

即使 LSTM 缓解了长期依赖问题，第一个词的信息传递到第一千个词，仍然需要经过一条很长的路径：

```text
第 1 个词 → 第 2 个词 → 第 3 个词 → ... → 第 1000 个词
```

## 五、Transformer：以 Attention 为核心

Transformer 提出了一个关键问题：既然 Attention 能够直接选择相关信息，能否让它成为模型的核心，并彻底摆脱 RNN 的循环结构？

严格来说，Transformer 并不是简单地“删除 RNN，只保留 Attention”，它还包含：

- Self-Attention；
- Multi-Head Attention；
- Feed-Forward Network；
- Positional Encoding / Positional Information；
- Residual Connection；
- Layer Normalization。

但其最核心的变化，是从**以循环计算为核心**转向**以注意力机制为核心**。

### 5.1 Transformer 与 RNN 的区别

RNN 必须按顺序处理：

```text
x₁ → x₂ → x₃ → x₄ → x₅
```

Transformer 可以让每个位置直接与其他位置建立联系：

```text
x₁ ─────┐
x₂ ─────┤
x₃ ─────┼──→ Self-Attention
x₄ ─────┤
x₅ ─────┘
```

例如，在“我喜欢学习人工智能”中，“人工智能”可以直接关注“学习”，无须通过中间状态逐步传递信息。

## 六、Self-Attention 与普通 Attention

### 6.1 Seq2Seq 中的 Attention

传统 Seq2Seq Attention 通常是 **Decoder 关注 Encoder 的输出**：

```text
Decoder 状态 → Attention → Encoder 的所有隐藏状态
```

它解决的是解码过程中“当前应该查看输入的哪个位置”。

### 6.2 Transformer 中的 Self-Attention

Self-Attention 让同一序列内部的元素彼此关注：

```text
我  ↔  喜欢  ↔  学习  ↔  NLP
```

处理“学习”时，模型可以直接综合“我”“喜欢”和“NLP”等位置的信息。

> [!summary]
> Transformer 使用 Attention 让序列中的元素直接建立联系，从而摆脱 RNN 必须逐步传递状态的限制。

## 七、把 Seq2Seq、Attention 与 Transformer 串起来

### 7.1 Seq2Seq

Seq2Seq 回答的是：**一个序列如何转换成另一个序列？**

```text
输入序列 → Encoder → Decoder → 输出序列
```

### 7.2 Attention

Attention 回答的是：**Decoder 生成内容时，应该动态查看输入的哪个位置？**

```text
Encoder 的多个隐藏状态 → Attention → Decoder
```

### 7.3 Transformer

Transformer 进一步回答：**为什么必须依赖 RNN 逐步计算？能否让所有位置通过 Attention 直接建立关系？**

```text
Self-Attention → 建立全局联系 → 高度并行 → Transformer
```

可以把三者记成下面三个递进的问题：

```text
Seq2Seq
“输入如何变成输出？”
        ↓
Attention
“当前应该重点关注哪里？”
        ↓
Transformer
“能否让所有位置直接互相关注？”
```

## 八、从 RNN 到现代 LLM

整个 NLP 模型的发展路线可以概括为：

```text
                    RNN
                     │
             ┌───────┴───────┐
             ↓               ↓
           LSTM             GRU
             │               │
             └───────┬───────┘
                     ↓
                  Seq2Seq
                     │
             Encoder + Decoder
                     ↓
                 Attention
                     │
              动态关注输入信息
                     ↓
                Transformer
                     │
          ┌──────────┴──────────┐
          ↓                     ↓
       Encoder                Decoder
          ↓                     ↓
        BERT                   GPT
                                ↓
                               LLM
                                ↓
                      ┌─────────┼─────────┐
                      ↓         ↓         ↓
                     RAG   Tool Calling  Agent
```

各阶段的作用可以总结为：

| 模型或机制 | 主要作用 |
| --- | --- |
| RNN / LSTM / GRU | 对序列进行建模 |
| Seq2Seq | 将一个序列转换成另一个序列 |
| Attention | 动态查找当前最重要的信息 |
| Transformer | 以 Attention 为核心处理整个序列 |
| LLM | 在 Transformer 基础上，通过大规模数据与参数训练得到语言能力 |

## 九、面向 Agent 开发的学习重点

如果目标是进行 Agent 应用开发，可以按以下优先级安排学习深度：

| 主题 | 建议优先级 |
| --- | --- |
| RNN | ⭐⭐ |
| LSTM | ⭐⭐ |
| GRU | ⭐ |
| Seq2Seq | ⭐⭐⭐ |
| Attention | ⭐⭐⭐⭐⭐ |
| Transformer | ⭐⭐⭐⭐⭐ |
| LLM | ⭐⭐⭐⭐⭐ |
| RAG | ⭐⭐⭐⭐⭐ |
| Agent | ⭐⭐⭐⭐⭐ |

建议按照下面的因果链进行理解，而不是孤立地记忆概念：

```text
RNN
 ↓
为什么长期依赖困难？
 ↓
LSTM / GRU
 ↓
Seq2Seq
 ↓
为什么一个固定向量不够？
 ↓
Attention
 ↓
Attention 如何计算“关注谁”？
 ↓
Self-Attention
 ↓
为什么可以不再依赖 RNN？
 ↓
Transformer
```

理解这条演进路线后，再学习 Transformer 中的 Q/K/V、Multi-Head Attention、Residual Connection、Layer Normalization 和 Positional Encoding，就不会像是在孤立地背诵结构。它们都是为了解决上一阶段遗留的问题。

## 相关阅读

- [FAQ 相似问题匹配](./FAQ相似问题匹配.md)
- [RNN、LSTM 与 GRU](./RNN-LSTM-GRU-从记忆到门控机制.md)
