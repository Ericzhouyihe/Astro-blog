---
title: LangChain 核心概念：Runnable、LCEL、Chain 与 LangGraph
published: 2026-09-15
tags:
  - LangChain
  - Runnable
  - LCEL
  - LangGraph
  - Agent
category: 编程技术
description: 梳理 LangChain 中 Runnable、LCEL 与 Chain 的关系，介绍串行、并行、分支和兜底等组合方式，并说明固定流程何时应升级为 LangGraph 工作流。
---
LangChain 包含 Prompt、模型、Output Parser、Retriever、Tool 等多种组件。它们职责不同，但都需要解决同一个问题：**如何用统一方式调用并自由组合**。

Runnable、LCEL 与 Chain 正是为此设计的：

```text
组件 → Runnable 统一接口 → LCEL 组合 → Chain 执行流程
```

当流程需要状态、条件分支或循环时，再使用 LangGraph。

## Runnable：统一调用接口

Runnable 是 LangChain 对“可运行组件”的统一抽象。不同组件只要遵循 Runnable 接口，就能使用相似的调用方式：

| 方法 | 用途 |
| --- | --- |
| `invoke()` | 处理单个输入 |
| `batch()` | 批量处理多个输入 |
| `stream()` | 流式返回结果 |
| `ainvoke()` / `abatch()` / `astream()` | 对应的异步版本 |

例如 Prompt、模型和 Output Parser 虽然内部逻辑不同，却都可以通过 `invoke()` 调用：

```python
prompt.invoke(...)
llm.invoke(...)
parser.invoke(...)
```

统一接口的真正价值不是减少几个方法名，而是让组件能够直接组合。关于批量、异步和流式调用，可参考 [LangChain 三种 LLM 调用方式](./langchain-三种-llm-调用方式.md)。

## LCEL：组合 Runnable

LCEL（LangChain Expression Language）使用声明式语法组合 Runnable。最常见的是管道运算符 `|`：

```python
chain = prompt | llm | parser
```

数据会依次流过每个组件：

```text
输入 → PromptTemplate → LLM → OutputParser → 输出
```

这种写法描述的是“数据如何流动”，无需手动接收每一步的结果，再传给下一步。

## Chain：组合后的执行流程

多个 Runnable 组合后形成的完整流程通常称为 Chain。Chain 本身仍然是 Runnable，因此可以直接调用，也可以继续参与组合：

```python
result = chain.invoke({"topic": "LangChain"})

final_chain = chain | another_runnable
```

三者的关系可以概括为：

- **Runnable**：统一“如何调用”。
- **LCEL**：统一“如何组合”。
- **Chain**：组合得到的可执行流程。

## 常见组合方式

### RunnableSequence：串行执行

`prompt | llm | parser` 会生成串行流程，前一个组件的输出自动成为后一个组件的输入：

```text
A → B → C
```

它适合步骤固定、先后关系明确的任务，例如生成提示词、调用模型，再解析输出。有关结果解析，可参考 [LLM 调用结果解析](./LLM调用结果解析.md)。

### RunnableParallel：并行执行

多个互不依赖的任务可以接收同一份输入并行处理：

```python
parallel = {
    "english": english_chain,
    "korean": korean_chain,
}
```

结果会按键名汇总：

```python
{
    "english": "...",
    "korean": "...",
}
```

并行结果还可以继续交给下一个 Runnable：

```python
chain = {
    "paragraph_1": chain_1,
    "paragraph_2": chain_2,
} | summary_chain
```

对应流程是：

```text
       ┌→ chain_1 ─┐
输入 ──┤           ├→ summary_chain → 输出
       └→ chain_2 ─┘
```

### 其他实用 Runnable

| 组件 | 作用 | 典型场景 |
| --- | --- | --- |
| `RunnableLambda` | 将普通 Python 函数包装为 Runnable | 数据清洗、自定义转换 |
| `RunnableBranch` | 根据条件选择不同分支 | 分类路由、按问题类型处理 |
| `RunnablePassthrough` | 原样保留或传递输入 | 同时保留原始数据与处理结果 |
| `RunnableWithFallbacks` | 主流程失败后使用备用方案 | 模型降级、故障兜底 |

这些组件不必死记参数，重点是理解它们分别解决**转换、分支、透传和容错**问题。

## Chain 与 LangGraph 的边界

Chain 更适合提前确定的流程：

```text
Prompt → LLM → Parser
```

Agent 的执行路径通常无法预先完全确定。模型可能反复判断、调用工具并读取结果，还需要保存中间状态：

```text
用户问题 → LLM → 是否调用工具？
                  ├─ 否 → 最终回答
                  └─ 是 → Tool → 更新状态 → 返回 LLM
```

此时 LangGraph 更合适。它使用节点和边描述工作流，并支持：

- 状态管理
- 条件路由
- 循环执行
- 多轮工具调用
- 动态决策

可以简单理解为：

```text
Chain     = 固定或相对线性的执行流程
LangGraph = 可分支、可循环、带状态的工作流
```

两者并非替代关系。LangGraph 的节点内部仍然可以使用 LCEL Chain，Runnable 也依旧是理解 LangChain 组件调用与组合方式的基础。

## 学习重点

学习 Agent 开发时，建议按以下层次掌握：

1. 理解 Runnable 的统一调用接口。
2. 能读懂 `prompt | llm | parser` 这类 LCEL 表达式。
3. 掌握串行与并行组合，了解分支、透传和兜底。
4. 能判断任务适合 Chain，还是需要 LangGraph。

最终只需记住一条主线：

```text
组件 → Runnable → LCEL → Chain → LangGraph → Agent 工作流
```
