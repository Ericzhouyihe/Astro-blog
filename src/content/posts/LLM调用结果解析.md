---
title: LLM调用结果解析
published: 2026-09-15
tags:
  - LangChain
  - LLM
  - 结构化输出
  - OutputParser
  - JSONSchema
  - Pydantic
category: 编程技术
description: 介绍 LLM 结构化输出的两种实现方式，对比 Prompt 约束与厂商 Structured Outputs，并梳理 Pydantic、JSON Schema 和 Output Parser 在结果解析流程中的职责。
---
大模型默认返回的是**自然语言**，但在实际生产环境中，我们经常希望它返回程序可以直接处理的**结构化数据**，例如 JSON。

例如：

```text
普通输出：
“张三今年25岁，来自北京。”

结构化输出：
{
    "name": "张三",
    "age": 25,
    "city": "北京"
}
```

这样程序就可以直接读取：

```python
result["name"]
result["age"]
result["city"]
```

因此，[LangChain](./langchain-三种-llm-调用方式.md) 提供了 Output Parser 等能力，用于帮助我们处理模型输出。

## 获取 JSON 结果

让大模型输出 JSON，主要有两种方式：

```text
方式一：Prompt 约束
        ↓
告诉模型“请按照这个 JSON 格式输出”

方式二：厂商提供的结构化输出能力
        ↓
通过 API 参数直接指定 Schema
```

## 通过 Prompt 约束

这种方式的思路很简单：

> **在 Prompt 中告诉模型，我要求你按照指定的 JSON 格式输出。**

关于 Prompt 的结构设计和工程化方法，可以参考 [提示词工程：与 LLM 沟通的语言](./提示词工程.md)。

例如：

```text
请提取人物信息，并严格按照下面的 JSON 格式输出：

{
    "name": "姓名",
    "age": "年龄",
    "city": "城市"
}

不要输出其他内容。
```

模型可能返回：

```json
{
    "name": "张三",
    "age": 25,
    "city": "北京"
}
```

### LangChain 中的做法

通常会结合：

- **Pydantic**：定义数据结构
    
- **JSON Schema**：描述 JSON 的结构
    
- **JSONOutputParser**：解析模型输出
    
- **`get_format_instructions()`**：生成格式约束说明
    

整体流程：

```text
Pydantic
   ↓
定义数据结构
   ↓
JSON Schema
   ↓
JSONOutputParser
   ↓
get_format_instructions()
   ↓
加入 Prompt / System Message
   ↓
LLM
   ↓
JSON
   ↓
Parser 解析
   ↓
程序使用
```

### Prompt 约束的问题

这种方式本质上还是：

> **“请求模型自己遵守规则。”**

因此比较依赖模型的能力。

如果模型能力不足，可能出现：

**① JSON 语法错误**

```text
{
    "name": "张三",
    "age": 25,
    "city": "北京"
```

少了一个 `}`。

**② JSON 结构不符合要求**

要求：

```json
{
    "name": "张三",
    "age": 25,
    "city": "北京"
}
```

模型却返回：

```json
{
    "name": "张三",
    "age": "二十五岁",
    "address": "北京"
}
```

字段或者数据类型可能不符合预期。

所以：

> **Prompt 约束 = 主要依赖模型自己遵守格式。**

## 通过模型厂商能力

相比单纯依赖 Prompt，一些主流大模型厂商在 API 层面提供了**结构化输出（Structured Outputs）**能力。

核心思想：

> **不只是告诉模型“请输出 JSON”，而是直接通过 API 告诉模型：“你的输出必须符合这个 Schema”。**

整体流程：

```text
程序
 ↓
定义 Schema
 ↓
API 参数
 ↓
LLM
 ↓
符合 Schema 的 JSON
```

以 OpenAI 为例，可以通过 Structured Outputs 指定 JSON Schema。

## 两种 JSON 输出方式的区别

|对比|Prompt 约束|厂商结构化输出|
|---|---|---|
|原理|告诉模型遵守格式|API 层指定 Schema|
|依赖|更依赖模型能力|有厂商能力支持|
|JSON 格式正确性|不一定保证|可靠性更高|
|Schema 遵循|可能出现偏差|更严格|
|通用性|较高|依赖具体厂商|
|使用难度|简单|需要使用厂商对应 API 能力|

## Prompt 约束 vs 厂商结构化输出

### Prompt 约束

相当于对模型说：

```text
“你要按照这个格式输出。”
```

模型自己决定是否遵守。

```text
Prompt
   ↓
LLM
   ↓
“我尽量按照要求输出”
```

### 厂商结构化输出

相当于：

```text
“这是你必须遵守的 Schema。”
```

由模型厂商提供专门的 API 能力来约束输出。

```text
Schema
   ↓
API
   ↓
LLM
   ↓
符合 Schema 的结构化结果
```

因此：

> **生产环境中，如果厂商提供可靠的 Structured Outputs，通常优先考虑这种方式。**

## 和 Output Parser 的关系

不要把这几个东西混淆：

```text
Pydantic
   ↓
定义“我想要什么数据”

Structured Output / Prompt
   ↓
约束“LLM 应该怎么输出”

Output Parser
   ↓
处理“LLM 实际返回的结果”
```

可以把它们理解成：

> **Pydantic：定义格式**
> 
> **Prompt / Structured Outputs：约束模型按照格式输出**
> 
> **Output Parser：把输出转换成程序方便使用的数据**
## 最终记忆

大模型输出 JSON 主要有两条路：

```text
                 LLM 输出 JSON
                      │
              ┌───────┴───────┐
              ↓               ↓
        Prompt 约束       厂商结构化输出
              │               │
       “告诉模型怎么输出”   “API直接约束”
              │               │
       依赖模型遵守规则      可靠性更高
```

一句话：

> **Prompt 约束是“告诉模型按格式输出”；厂商结构化输出是“通过 API 能力约束模型必须符合 Schema”。**
