---
title: "LangGraph 入门：核心概念、主要能力与 LangChain 的区别"
published: 2026-09-24
tags: [LangGraph, LangChain, Agent, 工作流, 状态管理]
category: Python 与 AI 应用开发
description: "通过智能客服示例理解 LangGraph 的节点、边、状态与状态流转，并认识持久化、人机协作、循环及其与 LangChain 的分工。"
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

多个节点也能从 `START` 同时出发。若后续节点必须等它们全部完成，可以用 `builder.add_edge(["节点A", "节点B"], "汇总节点")` 表示汇合；这比为每条分支分别连一条边更清楚地表达“等待两者”。

### 状态：在节点之间传递数据

状态是工作流共享的数据结构，比如用户问题、识别出的意图和最终回答。节点读取状态，并返回自己要更新的字段；后续节点再读取更新后的状态。

```text
初始状态：{question: "我想预约座位"}
识别意图后：{question: "我想预约座位", intent: "reservation"}
处理预约后：{..., answer: "请问您想预约哪一天？"}
```

**注意：状态不是“自动保存到数据库”。**如果希望进程结束后还能恢复，需要另外配置持久化机制。

### 一个多 State 示例

下面不用 LLM，先用关键词模拟意图识别。示例分别定义图的主要状态、输入状态、节点读取的中间状态和输出状态，方便观察每一步能看到什么：

```python
from typing import TypedDict
from langgraph.graph import START, END, StateGraph


class GraphState(TypedDict):
    question: str
    answer: str


class InputState(TypedDict):
    question: str


class ClassifiedState(TypedDict):
    question: str
    intent: str


class OutputState(TypedDict):
    answer: str


def classify(state: InputState) -> dict:
    intent = "reservation" if "预约" in state["question"] else "faq"
    return {"intent": intent}


def route_by_intent(state: ClassifiedState) -> str:
    return state["intent"]


def answer_reservation(state: ClassifiedState) -> dict:
    return {"answer": f"收到您的请求：{state['question']}。请问您想预约哪一天？"}


def answer_faq(state: ClassifiedState) -> dict:
    return {"answer": f"关于“{state['question']}”，这里可以查询常见问题。"}


builder = StateGraph(
    state_schema=GraphState,
    input_schema=InputState,
    output_schema=OutputState,
)
builder.add_node("classify", classify)
builder.add_node("reservation", answer_reservation)
builder.add_node("faq", answer_faq)

builder.add_edge(START, "classify")
builder.add_conditional_edges(
    "classify",
    route_by_intent,
    {"reservation": "reservation", "faq": "faq"},
)
builder.add_edge("reservation", END)
builder.add_edge("faq", END)

graph = builder.compile()
result = graph.invoke({"question": "我想预约座位"})
print(result)  # {'answer': '收到您的请求：我想预约座位。请问您想预约哪一天？'}
```

运行路径是 `START → classify → reservation → END`。`classify` 只收到 `question`，返回 `intent`；路由函数读取 `intent`，回答节点读取 `question`；调用者最终只收到 `answer`。真实项目中，可以把关键词判断替换为模型调用，把回答节点替换为 FAQ 检索或预约服务。FAQ 检索本身的设计可参考 [FAQ 相似问题匹配](./FAQ相似问题匹配.md)。

## 2. 入门必懂：状态是怎样流转的？

理解状态时，先分清三件事：**`invoke()` 给图的是输入；节点收到的是当前状态中它能读取的部分；节点返回的是要写入状态的更新。**节点不需要每次返回完整状态。以上面的客服图为例，`classify` 返回 `{"intent": "reservation"}`，原有的 `question` 不会因此丢失；后续节点可以同时读取问题和意图。

把一次执行想成这样：

```text
外部输入 → 按输入规则进入图 → 节点读取所需字段
         → 节点返回部分更新 → 图合并到内部状态
         → 按输出规则返回给调用者
```

### 四种 schema 分别管什么

| 名称 | 简单理解 | 在客服例子中 |
| --- | --- | --- |
| 输入 schema（`input_schema`） | 哪些字段允许从 `invoke()` 进入图 | `InputState`：`question` |
| 状态 schema（`state_schema`） | 图的主要状态有哪些字段 | `GraphState`：`question`、`answer` |
| 节点输入 schema | 某个节点能从状态中读到哪些字段 | `ClassifiedState`：`question`、`intent` |
| 输出 schema（`output_schema`） | `invoke()` 最后返回哪些字段 | `OutputState`：`answer` |

这里有个容易忽略的点：`intent` 不在 `GraphState` 中，却在回答节点使用的 `ClassifiedState` 中声明，因此仍能作为图的**内部状态字段**，由 `classify` 写入，再供路由函数和回答节点读取。`invoke({"question": "我想预约座位"})` 只需提供问题，结果只包含 `answer`。**输出少，不代表内部状态也少。**

还有两点容易混淆：

- **返回一个新键，不等于声明一个新状态字段。**例如节点返回 `{"answer": "...", "debug": "..."}`，其中 `answer` 已声明，可以写入；未在图使用的 schema 中声明的 `debug` 不会自动变成内部状态。外部输入中的额外字段也不会因为传给 `invoke()` 就自动进入图。
- **节点能读什么，与它能更新什么不是一回事。**本例的 `classify` 只接收 `InputState`，仍可返回在 `ClassifiedState` 中声明的 `intent`；回答节点接收 `ClassifiedState`，仍可返回在 `GraphState` 中声明的 `answer`。

如果两个并行节点同时更新**同一个字段**，还需要定义 reducer（合并规则）；分别更新不同字段时通常不需要。`TypedDict` 用于描述字段结构，本身并不是严格的运行时校验器。

> **记忆口诀：输入管入口，状态管保存，节点输入管读取，输出管展示；节点返回值只是一次更新。**

## 3. LangGraph 主要解决什么问题

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

暂停和恢复需要应用正确保存、重新加载执行状态，不能只在图中画出“人工审核”节点。运行时也可以向前端逐步推送节点更新、消息或模型生成内容，让用户看到进度，而不必等整个流程结束。有关模型流式调用，可参考 [LangChain 三种 LLM 调用方式](./LangChain-三种-LLM-调用方式.md)。

## 4. LangGraph 和 LangChain 的关系

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

## 相关阅读

- [什么是向量数据库](./什么是向量数据库.md)
- [ReAct 详解](./ReAct-详解.md)
- [LLM 调用结果解析](./LLM调用结果解析.md)
