---
title: "LangGraph 入门：核心概念、主要能力与 LangChain 的区别"
published: 2026-09-24
tags: [LangGraph, LangChain, Agent, 工作流, 状态管理]
category: 编程技术
description: "通过智能客服示例理解 LangGraph 的节点、边和状态，认识持久化、人机协作、循环与流式处理，并厘清它与 LangChain 的分工。"
---
# LangGraph 入门：核心概念、主要能力与 LangChain 的区别

**一句话理解：LangGraph 用图来描述工作流，用状态保存执行过程中的数据，让 Agent 能够按条件分支、循环、暂停和继续。**

假设要做一个餐厅智能客服：用户问营业时间时查询 FAQ，想订位时收集预约信息，真正提交预约前还可能需要人工确认。它不是一次模型调用就能完成的任务，需要明确控制“现在做什么”和“接下来去哪一步”。

## 1. LangGraph 的三个核心概念

可以先记住这个关系：

```text
节点（Node）：做什么
边（Edge）：下一步去哪
状态（State）：执行过程中记住什么
```

### 节点：执行具体任务

节点通常是一个函数，可以调用模型、工具或数据库，也可以执行普通业务逻辑。例如，“识别意图”“查询 FAQ”“提交预约”都可以是节点。**节点不一定要调用 LLM**。

### 边：连接节点并决定流向

固定边表示执行完 A 后总是去 B；条件边根据当前状态选择下一节点。例如：

```text
用户问题 → 识别意图 ── FAQ 意图 → 查询 FAQ → 回答
                    └─ 预约意图 → 处理预约 → 回答
```

图通常从 `START` 开始，到 `END` 结束。条件边也可以指向前面的节点，形成循环；但**循环必须有退出条件**，避免一直运行。

### 状态：在节点之间传递数据

状态是工作流共享的数据结构，比如用户问题、识别出的意图和最终回答。节点读取状态，并返回自己要更新的字段；后续节点再读取更新后的状态。

```text
初始状态：{question: "我想预约座位"}
识别意图后：{question: "我想预约座位", intent: "reservation"}
处理预约后：{..., answer: "请问您想预约哪一天？"}
```

**注意：状态不是“自动保存到数据库”。**如果希望进程结束后还能恢复，需要另外配置持久化机制。

### 一个最小示例

下面不用 LLM，先用关键词模拟意图识别，重点看节点、条件边和状态如何配合：

```python
from typing import TypedDict
from langgraph.graph import START, END, StateGraph


class State(TypedDict):
    question: str
    intent: str
    answer: str


def classify(state: State) -> dict:
    intent = "reservation" if "预约" in state["question"] else "faq"
    return {"intent": intent}


def answer_reservation(state: State) -> dict:
    return {"answer": "请问您想预约哪一天？"}


def answer_faq(state: State) -> dict:
    return {"answer": "这里可以查询常见问题。"}


builder = StateGraph(State)
builder.add_node("classify", classify)
builder.add_node("reservation", answer_reservation)
builder.add_node("faq", answer_faq)

builder.add_edge(START, "classify")
builder.add_conditional_edges(
    "classify",
    lambda state: state["intent"],
    {"reservation": "reservation", "faq": "faq"},
)
builder.add_edge("reservation", END)
builder.add_edge("faq", END)

graph = builder.compile()
result = graph.invoke({"question": "我想预约座位", "intent": "", "answer": ""})
print(result["answer"])  # 请问您想预约哪一天？
```

运行路径是 `START → classify → reservation → END`。真实项目中，可以把关键词判断替换为模型调用，把回答节点替换为 FAQ 检索或预约服务。FAQ 检索本身的设计可参考 [FAQ 相似问题匹配](./FAQ相似问题匹配.md)。

## 2. LangGraph 主要解决什么问题

| 能力 | 解决的问题 | 典型场景 |
| --- | --- | --- |
| 条件分支与循环 | 根据状态决定下一步，必要时反复调用模型或工具 | 意图路由、工具调用 Agent |
| 持久化（Checkpoint） | 保存执行进度，便于后续继续 | 长流程、故障恢复 |
| 人机协作 | 在关键步骤暂停，让人审核或修改状态后继续 | 退款、审批、敏感操作 |
| 流式输出 | 边运行边返回状态更新或模型输出 | 聊天界面、实时进度展示 |
| 长期记忆 | 跨会话读取和保存用户信息 | 个性化推荐 |

### 持久化与记忆，不是一回事

- **短期状态 / 会话记忆**：当前对话的消息、已收集的预约时间等。配置 *checkpointer* 后，可以按会话标识（如 `thread_id`）保存检查点，并在后续调用中继续使用这些状态。
- **长期记忆**：跨会话保留用户偏好等信息，通常需要 *Store* 或其他外部存储，并由应用设计何时写入、何时读取。它不会因为定义了 `State` 就自动出现。

例如，用户这次说“我要订位”，下一轮补充“两个人”，属于会话内状态；几天后仍记得“我喜欢川菜”，则属于跨会话的长期记忆。

**注意：恢复执行不等于撤销或自动重做外部操作。**如果节点会扣款、发消息或写数据库，仍要考虑幂等性和重复执行风险。

### 人工审核与流式输出

退款流程可以设计为：

```text
分析退款请求 → 暂停等待人工审核 → 审核通过 → 执行退款
```

暂停和恢复需要应用正确保存、重新加载执行状态，不能只在图中画出“人工审核”节点。运行时也可以向前端逐步推送节点更新、消息或模型生成内容，让用户看到进度，而不必等整个流程结束。有关模型流式调用，可参考 [LangChain 三种 LLM 调用方式](./langchain-三种-llm-调用方式.md)。

## 3. LangGraph 和 LangChain 的关系

**两者不是非此即彼。**LangChain 侧重提供模型、Prompt、Tool、Retriever 等组件及其组合方式；LangGraph 侧重定义有状态工作流的执行顺序与控制逻辑。一个 LangGraph 节点可以直接调用 LangChain 组件，也可以调用普通 Python 函数或其他服务。

```text
LangGraph：决定执行哪个节点、何时循环或暂停
    ├─ 节点 A：调用 LangChain ChatModel
    ├─ 节点 B：调用 LangChain Retriever
    └─ 节点 C：调用业务数据库或外部 API
```

| 对比维度 | LangChain | LangGraph |
| --- | --- | --- |
| 主要用途 | 构建和组合 LLM 应用组件 | 编排有状态、可分支或循环的工作流 |
| 常用抽象 | Model、Prompt、Tool、Retriever、Runnable 等 | State、Node、Edge、Graph 等 |
| 更适合的场景 | 简单调用、固定步骤的数据处理 | 多步骤 Agent、复杂路由、人工审核、暂停恢复 |

如果只是 `Prompt → Model → Parser` 这样的固定流程，先用 LangChain 的 Runnable / LCEL 即可；如果要根据中间结果决定后续步骤，或者需要循环、持久化与人工介入，再考虑 LangGraph。Runnable 与 LCEL 的用法可参考 [LangChain 核心概念](./LangChain-核心概念.md)。

> **记忆口诀：LangChain 提供可调用的能力；LangGraph 组织这些能力的执行流程。**这只是入门时的简化理解，并不表示两者的功能完全没有交集。
