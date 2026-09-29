---
title: "LangGraph Pregel 运行机制与历史状态"
published: 2026-09-29
tags: [LangGraph, Pregel, Checkpoint, 状态管理]
category: Python 与 AI 应用开发
description: "理解 LangGraph 如何通过 Pregel 的超步调度节点、用 Channel 传递状态，以及如何通过 Checkpointer 查询执行历史。"
---
# LangGraph Pregel 运行机制与历史状态

如果还不熟悉节点、边和状态，可以先阅读 [LangGraph 入门](./LangGraph-入门.md)。本文接着回答两个问题：**图如何运行？运行过的状态如何查看？**

## 一、编译后：节点如何运行

调用 `builder.compile()` 后，`StateGraph` 会变成基于 **Pregel** 的可执行图。理解它只需抓住两个角色：

- **Actor（执行节点）**：对应 `PregelNode`，读取输入并运行节点逻辑。
- **Channel（通信通道）**：保存数据、接收节点更新，并把变化传给订阅它的节点。状态字段的合并规则也在这里发挥作用。

可以把它记成：**Actor 做事，Channel 传递和合并结果。**节点并非沿着边只运行一次；当它订阅的 Channel 再次更新时，就可能再次被调度。这也是 LangGraph 能支持循环和多轮状态传播的关键。

### SuperStep：一次调度循环

Pregel 以 **SuperStep（超步）**推进，每轮包含三个阶段：

1. **Plan**：根据输入或上一轮更新的 Channel，选出本轮要运行的节点。
2. **Execute**：执行这些节点；同一轮中可运行的节点可以并行执行。
3. **Update**：统一写入本轮结果，更新 Channel，再决定是否进入下一轮。

同一轮的节点不会立即看到彼此的写入；结果在 Update 阶段统一生效。没有新节点可运行，或达到执行限制时，图就会停止。

例如，假设图的边按下面的方式连接：

```text
START → a ┬→ b → b_2 ─┐
          └→ c ────────┴→ d → END
```

`a` 完成后，`b` 和 `c` 可在同一轮执行。若 `c` 先触发 `d`，而 `b_2` 在后一轮再次触发它，`d` 就可能在一次图调用中运行两次。**具体执行次数取决于边和汇合方式**；如果业务要求等待两条分支全部完成，应显式设置汇合条件，而不是假定普通入边会自动等待。

如果状态字段定义为 `Annotated[list, operator.add]`，多个节点返回的列表会按归并规则追加，而不是简单覆盖。并行写入同一字段时，若结果顺序很重要，不应依赖节点完成先后顺序。

### 查看编译后的结构

调试时可以查看：

```python
graph = builder.compile()

graph.channels               # 图中的 Channel
graph.nodes                  # 编译后的 PregelNode
graph.nodes["a"].triggers    # 哪些 Channel 会触发 a
graph.nodes["a"].writers     # a 会向哪里写入结果
```

这些属性适合帮助理解运行机制；它们属于较底层的实现细节，具体结构可能随 LangGraph 版本变化。

## 二、保存并查询历史状态

只执行图不会自动保存可查询的历史。要使用 `get_state()` 和 `get_state_history()`，需要在编译时配置 **Checkpointer**，并在调用时传入 `thread_id`。

```python
import sqlite3
from langgraph.checkpoint.sqlite import SqliteSaver

connection = sqlite3.connect("checkpointer.db", check_same_thread=False)
checkpointer = SqliteSaver(connection)
graph = builder.compile(checkpointer=checkpointer)

config = {"configurable": {"thread_id": "conversation-1"}}
graph.invoke({"aggregate": []}, config=config)  # 输入需符合实际图的 State 定义

latest = graph.get_state(config)
history = list(graph.get_state_history(config))
```

`thread_id` 是一条会话或工作流线程的标识：同一 ID 的后续调用可以沿用其检查点；不同 ID 的历史相互隔离。上例使用 SQLite，需安装相应的 `langgraph-checkpoint-sqlite` 包。

| 方法 | 返回内容 |
| --- | --- |
| `get_state(config)` | 该线程最新的 `StateSnapshot` |
| `get_state_history(config)` | 该线程的状态快照迭代器，通常按时间倒序排列 |

`StateSnapshot` 中最值得先看的是：

- `values`：检查点保存的状态值，例如 `{"aggregate": ["A", "B"]}`。
- `next`：从该检查点继续执行时，下一轮待运行的节点，例如 `("b_2", "d")`。

还可查看 `config`、`metadata`、`parent_config` 和 `interrupts`，分别了解检查点配置、元数据、父检查点及中断信息。

**注意：检查点对应图执行中的状态边界，不是 Plan、Execute、Update 每个阶段各保存一次。**保存了当前数据和后续任务，LangGraph 才能支持恢复执行、人机介入和历史回溯等能力。

## 一句话记住

`StateGraph` 编译为 Pregel 图后，Actor 通过 Channel 交换状态，并按 **Plan → Execute → Update** 的超步运行；配置 Checkpointer 后，可按 `thread_id` 用 `get_state()` 查看最新状态，用 `get_state_history()` 回看历史。
