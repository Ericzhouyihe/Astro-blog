---
title: "LangChain 三种 LLM 调用方式"
published: 2026-09-15
tags:
  - LangChain
  - LLM
  - Python
  - 异步编程
  - 流式输出
  - 批量调用
category: Python 与 AI 应用开发
description: 对比 LangChain 中 ainvoke、stream 与 batch 三种 LLM 调用方式，说明它们在异步并发、流式输出和批量处理场景中的作用、用法与区别。
---
LangChain 中常见的 LLM 调用方式有三种：

|方式|作用|核心特点|
|---|---|---|
|`ainvoke()`|异步调用|不阻塞，可并发|
|`stream()`|流式调用|边生成边返回|
|`batch()`|批量调用|一次处理多个输入|

---

## 1. ainvoke() —— 异步调用

`ainvoke()` 用于**异步调用 LLM**。

```python
import asyncio

async def main():
    task1 = asyncio.create_task(
        llm.ainvoke("什么是 LangChain")
    )

    task2 = asyncio.create_task(
        llm.ainvoke("什么是 Agent")
    )

    result1 = await task1
    result2 = await task2

    print(result1.content)
    print(result2.content)

asyncio.run(main())
```

这里：

```python
async def
```

定义异步函数。

```python
await
```

等待异步任务完成。

```python
asyncio.create_task()
```

创建任务，让多个任务可以并发执行。

例如：

```text
                Agent
                  │
          ┌───────┴───────┐
          ↓               ↓
       LLM A            LLM B
          │               │
       等待网络          等待网络
          │               │
          └───────┬───────┘
                  ↓
                结果
```

> **核心：解决“等待时不要阻塞，可以并发”的问题。**

---

## 2. stream() —— 流式调用

`stream()` 用于**流式获取 LLM 的输出**。

```python
response = llm.stream("什么是 LangChain")

for chunk in response:
    print(chunk.content, end="")
```

普通调用：

```text
请求
 ↓
等待
 ↓
等待
 ↓
完整答案
```

流式调用：

```text
请求
 ↓
chunk 1
 ↓
chunk 2
 ↓
chunk 3
 ↓
chunk 4
 ↓
完整答案
```

例如：

```text
Lang
Chain
是
一个
用于
开发
大模型
应用
的框架
```

每生成一部分，就通过 `chunk` 返回一部分。

因此用户可以看到类似 ChatGPT 的**打字机效果**。

> **核心：解决“不要等完整答案生成完才显示”的问题。**

---

## 3. batch() —— 批量调用

`batch()` 用于**一次处理多个独立输入**。

```python
response = llm.batch([
    "什么是 LangChain？",
    "什么是 Agent？",
    "什么是 RAG？"
])

for result in response:
    print(result.content)
```

可以理解为：

```text
                batch()
                  │
        ┌─────────┼─────────┐
        ↓         ↓         ↓
      问题1      问题2      问题3
        ↓         ↓         ↓
       LLM       LLM       LLM
        ↓         ↓         ↓
      答案1      答案2      答案3
```

多个独立任务可以进行批量处理，底层可以通过线程等方式并行执行。

> **核心：解决“有很多独立问题需要一起处理”的问题。**

---

# 4. 三种方式的区别

不要把三个概念混在一起。

### ainvoke()

关注：

**怎么调用？**

```python
await llm.ainvoke(...)
```

→ **异步调用**

---

### stream()

关注：

**结果怎么返回？**

```python
llm.stream(...)
```

→ **流式返回**

---

### batch()

关注：

**一次处理多少输入？**

```python
llm.batch([
    input1,
    input2,
    input3
])
```

→ **批量处理**

---

# 5. 最简单的记忆方式

```text
ainvoke
  ↓
异步
  ↓
不想阻塞 / 并发


stream
  ↓
流式
  ↓
不想等完整结果 / 实时显示


batch
  ↓
批量
  ↓
一次有很多问题 / 批量处理
```

### 一句话记忆

> **ainvoke：不想傻等 → 异步**
> 
> **stream：不想等全部生成 → 流式**
> 
> **batch：一次有很多问题 → 批量**

---

## 关联阅读

- [FastAPI & SQLAlchemy](./FastAPI_SQLAlchemy.md)：补充理解 Python 协程、事件循环与异步编程基础。
- [ReAct 详解：让 Agent 学会思考](./ReAct-详解.md)：继续了解 Agent 如何组织 LLM 推理与工具调用。
- [提示词工程：与 LLM 沟通的语言](./提示词工程.md)：了解传入 LLM 的提示词如何设计与管理。
- [LangChain 核心概念](./LangChain-核心概念.md)
