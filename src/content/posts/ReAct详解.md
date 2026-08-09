---
title: "ReAct 详解：让 Agent 学会思考"
published: 2026-08-09
category: 编程技术
tags: [ReAct, Agent, ReWOO, LLM Compiler, Reflexion, 推理模式]
description: "讲解 ReAct 推理范式——Thought/Action/Observation 闭环，以及 ReWOO、LLM Compiler、Reflexion 等进阶模式，对比串行与并行执行、外部观察与自我反思的差异。"
---

> 🔗 从上一章延续的问题
> 第3章的天气 Agent 能查天气、能规划行程，但它**不会思考为什么要查**——用户问"明天适合跑步吗"，它直接调 get_weather，却没有先推理"适合跑步需要看天气+空气质量"。这导致了两个问题：① 可能漏掉该调的工具，② 可能调了不必要的工具浪费 token。ReAct 就是为了解决这两个问题而诞生的——让 Agent 在**行动前先思考，观察后再反思**。

> 🎯 本章先掌握 3 件事
> 这一章内容很多，但如果你是第一次接触 ReAct，只要先搞懂三件事就够了：**为什么要先想再做、Thought / Action / Observation 如何形成闭环、它和上一章工具调用有什么关系**。
>
> 你可以先读 ReAct 的核心循环部分，把它吃透；之后的 ReWOO、LLM Compiler、Reflexion 和生产级主循环更适合作为进阶阅读，不需要一次全吞下去。

## 从一个问题开始

假设用户问 Agent：**"2024年诺贝尔物理学奖得主是谁？他们的研究领域是什么？"**

一个没有规划能力的 Agent 可能直接让 LLM 回答——但 LLM 的知识截止到训练日期，可能不知道 2024 年的诺奖。它需要搜索。但什么时候搜？搜什么？搜完之后做什么？

这就是 **ReAct** 要解决的问题。

> **ReAct = Reasoning + Acting**
> 让 LLM 交替进行"推理（Thought）"和"行动（Action）"，通过"观察（Observation）"获取反馈，循环直到得出最终答案。

## ReAct 的诞生背景

在 ReAct 之前，Agent 面临两难：

| | 只推理（Reasoning-only） | 只行动（Acting-only） |
| --- | --- | --- |
| 工作方式 | LLM 用 CoT 一步步推理 | LLM 直接调用工具 |
| 优点 | ✓ 推理能力强 | ✓ 能获取外部信息 |
| 缺点 | ✗ 无法获取外部信息<br>✗ 可能产生幻觉 | ✗ 没有推理规划<br>✗ 不知道下一步做什么 |
| 结论 | → **想得到，做不到** | → **做得到，想不到** |

2022 年，Yao 等人在论文 *"ReAct: Synergizing Reasoning and Acting in Language Models"* 中提出了 ReAct 范式，将两者结合：

> 💡 ReAct 的核心洞察
> **推理指导行动，行动反馈推理。**LLM 先"想"该做什么（Thought），再"做"（Action），然后"看"结果（Observation），基于结果再"想"下一步——形成闭环。

## ReAct 循环：Thought → Action → Observation

ReAct 的核心是三个角色的循环：

```
        ┌────────────────┐
        │   Thought      │
        │   (推理思考)    │
        └───────┬────────┘
                │ 决定做什么
                ▼
        ┌────────────────┐
        │   Action       │
        │   (调用工具)    │
        └───────┬────────┘
                │ 工具返回
                ▼
        ┌────────────────┐
        │ Observation    │
        │   (观察结果)    │
        └───────┬────────┘
        ▲       │
        │继续推理 │信息足够
        └───┐   ▼
        ┌────────────────┐
        │  Final Answer  │
        │  (最终回答)     │
        └────────────────┘
```

### 逐步演示：一个完整的 ReAct 执行

以下用诺贝尔奖问答演示一次完整的 ReAct 执行（原文为可点击的分步动画，此处改为静态步骤）：

1. **Thought #1**：我需要先搜索2024年诺贝尔物理学奖得主。
2. **Action #1**：`search("2024年诺贝尔物理学奖得主")`
3. **Observation #1**：搜索结果：2024年诺贝尔物理学奖授予 John Hopfield 和 Geoffrey Hinton，表彰他们在机器学习和神经网络领域的基础发现。
4. **Thought #2**：知道了得主是 Hopfield 和 Hinton。现在需要了解他们的具体研究领域。Hinton 以深度学习闻名，Hopfield 以 Hopfield 网络闻名。我已有足够信息回答。
5. **Action #2**：`finish("2024年诺贝尔物理学奖得主是 John Hopfield 和 Geoffrey Hinton...")`
6. **Observation #2**：任务完成，输出最终答案。
7. **Final Answer**：2024年诺贝尔物理学奖授予 John Hopfield 和 Geoffrey Hinton。Hopfield 的研究领域是物理学和神经网络的交叉——Hopfield 网络；Hinton 被称为"深度学习之父"，研究领域是深度学习和反向传播算法。

## ReAct 的 Prompt 模板

ReAct 的实现核心是 System Prompt。来看一个标准的 ReAct prompt：

```text
尽可能回答以下问题。你可以使用以下工具：

可用工具：
- search(query): 搜索互联网获取信息
- lookup(keyword): 在上一次搜索结果中查找关键词
- finish(answer): 提交最终答案

格式要求：
每一步必须使用以下格式：

Thought: 你对下一步该做什么的推理
Action: 工具名称(参数)

Observation: 工具返回的结果
... (Thought/Action/Observation 可以重复多次)

Thought: 我现在知道答案了
Action: finish(最终答案)

开始！
问题: {user_question}
```

### 关键设计点

1. **强制结构化输出**：用 "Thought:" "Action:" "Observation:" 标记，让 LLM 的输出可被程序解析。
2. **工具结果由框架注入**："Observation:" 不是 LLM 生成的，是框架执行工具后拼接上去的。
3. **循环终止条件**：当 LLM 输出 finish(answer) 时结束循环。也可设置最大步数防止死循环。
4. **推理可见性**：Thought 部分是 LLM 的"内心独白"，让推理过程可审计、可调试。

## ReWOO 模式（Reasoning Without Observation）

ReAct 的核心循环是"边想边做"——每一步 Thought 之后立刻 Action，获得 Observation 后再想下一步。这很直观，但有一个严重的问题：**每一步的 Observation 都会被塞入上下文，随着步数增加，token 消耗线性膨胀。**

ReWOO 提出了一个反直觉的思路：**先想好所有步骤，再统一执行。**

> **ReWOO = Reasoning Without Observation**
> 2023 年由 Xu 等人提出。核心思想：让 LLM 在**没有 Observation** 的情况下，先规划出完整的推理链（Planner），然后由 Worker 统一执行所有工具调用，最后由 Solver 综合所有结果给出答案。

### Planner → Worker → Solver 三阶段

ReWOO 把 ReAct 的循环拆成了三个独立阶段：

```
Planner (规划所有步骤)
   │ 输出步骤列表
   ▼
Worker (并行执行工具)
   │ 返回所有结果
   ▼
Solver (综合结果回答)
```

> 🔍 三阶段详解
> **Planner（规划器）**：LLM 一次性生成完整的推理链，每一步用 `#E` 标记期望的工具调用。因为还没有 Observation，Planner 必须靠自身推理决定步骤——这就是 "Without Observation" 的含义。
>
> **Worker（执行器）**：逐个执行 Planner 规划的工具调用，将结果填入 `#E` 占位符。Worker 是程序化的，不需要 LLM 参与——纯工具执行。
>
> **Solver（求解器）**：LLM 接收已填入结果的完整推理链，综合所有信息生成最终答案。此时 LLM 看到的是"规划+真实结果"的完整视图。

### ReAct vs ReWOO 流程对比

```
ReAct（串行 6 步）                    ReWOO（3 步）
Thought₁ → Action₁ → Obs₁           Planner
   │ 继续推理                          │ 步骤列表
   ▼                                 ▼
Thought₂ → Action₂ → Obs₂           Worker（并行执行）
   │                                 │ 所有结果
   ▼                                 ▼
Answer                              Solver → Answer
```

| | ReAct：边想边做 | ReWOO：先想后做 |
| --- | --- | --- |
| 上下文 | 每一步 Thought 都需要携带**完整历史上下文** | 只调用 LLM **1次**，生成完整推理链 |
| Token | Observation 逐步累积，token 随步数**线性增长** | Worker 执行工具，**不消耗 LLM token** |
| LLM 调用次数 | 步数 × 2（Thought + 解析），即 N 次 | Planner 1次 + Solver 1次 = **2次** |
| 优势 | 灵活调整，每步可基于 Observation 改变策略 | 总 LLM 调用远少于 ReAct 的 N 次 |

### ReWOO 代码示例

**Python：**

```python
from openai import OpenAI

client = OpenAI()
TOOLS = {"search": search_web, "weather": get_weather, "calc": calculate}

# ===== Phase 1: Planner =====
PLANNER_PROMPT = """你是一个规划器。根据用户问题，生成一系列步骤来解决问题。
每一步用 #E 标记需要执行的工具调用。

格式：
Plan: 第一步的推理
#E1 = tool_name("参数")
Plan: 第二步的推理（可引用 #E1 的结果）
#E2 = tool_name("参数")
...

问题: {question}"""

def plan_steps(question):
    """Phase 1: LLM 一次性规划所有步骤"""
    resp = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "system", "content": PLANNER_PROMPT},
                  {"role": "user", "content": question}]
    )
    return resp.choices[0].message.content

# ===== Phase 2: Worker =====
def execute_steps(plan_text):
    """Phase 2: 解析并执行所有 #E 工具调用"""
    import re
    results = {}
    # 查找所有 #E 标记
    steps = re.findall(r'#E(\d+)\s*=\s*(\w+)\((".*?"|\'.*?\'|.*?)\)', plan_text)
    for step_id, tool_name, tool_input in steps:
        tool_input = tool_input.strip('"\'')
        if tool_name in TOOLS:
            results[f"#E{step_id}"] = TOOLS[tool_name](tool_input)
        else:
            results[f"#E{step_id}"] = f"Error: {tool_name} not found"
    return results

# ===== Phase 3: Solver =====
SOLVER_PROMPT = """根据以下规划和执行结果，给出最终答案。

规划:
{plan}

执行结果:
{results}

请综合以上信息，给出完整答案。"""

def solve_answer(plan_text, results):
    """Phase 3: LLM 综合所有结果生成答案"""
    # 将结果填入规划的 #E 占位符
    filled_plan = plan_text
    for key, value in results.items():
        filled_plan = filled_plan.replace(key, f"[结果: {value}]")

    resp = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "system", "content": SOLVER_PROMPT},
                  {"role": "user", "content":
                   f"规划:\n{plan_text}\n\n执行结果:\n{filled_plan}"}]
    )
    return resp.choices[0].message.content

# ===== 完整流程 =====
def rewoo_agent(question):
    """ReWOO: Planner → Worker → Solver"""
    # 1. 规划
    plan = plan_steps(question)
    # 2. 执行
    results = execute_steps(plan)
    # 3. 求解
    answer = solve_answer(plan, results)
    return answer

# 使用
answer = rewoo_agent("北京今天天气如何？适合户外活动吗？")
```

> ⚠️ ReWOO 的局限
> ReWOO 的 Planner 必须**在没有 Observation 的条件下**规划所有步骤，这意味着它无法根据中间结果调整策略。如果第一步的搜索结果出乎意料，Planner 无法"转向"——它只能沿着预设路径走到底。这是 ReWOO 相比 ReAct 的核心劣势。

## LLM Compiler 模式

ReAct 是串行的：Thought₁ → Action₁ → Observation₁ → Thought₂ → Action₂ → …。如果 Agent 需要调用 5 个独立的工具，即使它们之间没有依赖关系，也必须一个一个等。

LLM Compiler 提出了**并行执行**的思路：让 LLM 一次性输出多个独立的工具调用，然后并行执行它们。

> **LLM Compiler**
> 2023 年由 Kim 等人提出。核心思想：将 Agent 的执行计划编译成**依赖图（DAG）**，识别可并行的步骤，同时执行没有依赖关系的工具调用，显著减少总执行时间。

### 依赖图分析：识别可并行的步骤

关键洞察：很多工具调用之间**没有数据依赖**。比如：

| 串行（ReAct） | 并行（LLM Compiler） |
| --- | --- |
| Thought → search("北京天气") → Obs₁<br>Thought → search("上海天气") → Obs₂<br>Thought → search("广州天气") → Obs₃<br>Thought → 比较三城市 → Answer<br>**总计：4轮LLM + 3次搜索 = ~12s** | Planner → 并行:<br>&nbsp;&nbsp;search("北京天气") ─┐<br>&nbsp;&nbsp;search("上海天气") ─┤→ Solver → Answer<br>&nbsp;&nbsp;search("广州天气") ─┘<br>**总计：1轮LLM + 1次并行搜索 = ~4s** |

依赖图示意：

```
        ┌────────┐
        │ 用户问题 │
        └───┬────┘
            ▼
        ┌──────────┐
        │ 编译器    │
        │ 生成 DAG  │
        └───┬──────┘
    ┌───────┼────────┐
  并行 ▼     ▼ (独立)  ▼ (依赖A)
    Tool A   Tool B   Tool C
    (独立)    (独立)   (依赖A)
     │        │        │
     └───┬────┴───┬────┘
         ▼        ▼
       ┌─ Solver (综合) ─┐
         └── Answer ──┘
```

### 并行调用多个工具：代码示例

> 关于多语言示例
> 本节原文的 TypeScript / Go / Java 版本仅为 Python 的注释占位（`// Python: ...`），并非可运行实现，故此处仅保留完整的 Python 版本。

**Python：**

```python
import asyncio
from openai import OpenAI

client = OpenAI()

# ===== Step 1: 编译器生成并行计划 =====
COMPILER_PROMPT = """根据用户问题，生成工具调用计划。
标记依赖关系：如果一个调用需要另一个的结果，标注 depends_on。

输出JSON格式:
[
  {"id": 1, "tool": "search", "args": {"query": "北京天气"},
   "depends_on": []},
  {"id": 2, "tool": "search", "args": {"query": "上海天气"},
   "depends_on": []},
  {"id": 3, "tool": "compare", "args": {"data_from": [1, 2]},
   "depends_on": [1, 2]}
]

问题: {question}"""

async def compile_plan(question):
    """LLM 编译：生成带依赖关系的工具调用计划"""
    resp = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "system", "content": COMPILER_PROMPT},
                  {"role": "user", "content": question}],
        response_format={"type": "json_object"}
    )
    import json
    return json.loads(resp.choices[0].message.content)

# ===== Step 2: 并行执行独立工具 =====
async def execute_parallel(plan):
    """按依赖图并行执行：无依赖的步骤同时运行"""
    results = {}
    completed = set()

    while len(completed) < len(plan):
        # 找出所有依赖已完成的步骤
        ready = [step for step in plan
                 if step["id"] not in completed
                 and all(d in completed for d in step["depends_on"])]

        if not ready:
            break  # 防止死锁

        # 并行执行所有就绪步骤
        tasks = []
        for step in ready:
            task = asyncio.create_task(
                call_tool_async(step["tool"], step["args"], results)
            )
            tasks.append((step["id"], task))

        # 等待本轮所有任务完成
        for step_id, task in tasks:
            results[step_id] = await task
            completed.add(step_id)

    return results

async def call_tool_async(tool_name, args, prev_results):
    """异步调用单个工具"""
    # 替换依赖引用为实际结果
    if "data_from" in args:
        args["data"] = [prev_results[d] for d in args["data_from"]]

    # 模拟工具执行（实际项目中替换为真实API调用）
    await asyncio.sleep(1)  # 模拟网络延迟
    return f"{tool_name} 结果: {args}"

# ===== Step 3: Solver 综合答案 =====
async def solve_with_results(question, plan, results):
    """Solver：根据工具调用结果综合最终答案"""
    resp = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": "根据以下工具调用结果，回答用户问题。"},
            {"role": "user", "content": f"问题: {question}\n\n结果: {results}"}
        ]
    )
    return resp.choices[0].message.content

async def llm_compiler_agent(question):
    """LLM Compiler 完整流程"""
    plan = await compile_plan(question)
    results = await execute_parallel(plan)
    answer = solve_with_results(question, plan, results)
    return answer

# 使用
answer = await llm_compiler_agent(
    "北京、上海、广州三城市今天天气如何？哪个最适合户外活动？"
)
```

> 📊 效率对比
> | 指标 | ReAct（串行） | LLM Compiler（并行） |
> | --- | --- | --- |
> | LLM 调用次数 | N 次（每步1次） | 1 次编译 + 1 求解 |
> | 工具执行时间 | N × 单次耗时 | ≈ max(并行组耗时) |
> | 总耗时（3个独立工具） | ~12s | ~4s（3x加速） |
> | 灵活性 | 高（可中途调整） | 低（预编译路径） |

## Reflexion 模式（反思校验）

ReAct 有一个隐含假设：**LLM 的推理是对的**。它只观察工具返回的**外部结果**，从不质疑自己的推理质量。如果 LLM 在 Thought 中犯了逻辑错误，ReAct 无法发现——它只会继续沿着错误方向走。

Reflexion 给 Agent 加了一个**自我反思**环节。

> **Reflexion = ReAct + Self-Reflection**
> 2023 年由 Shinn 等人提出。核心思想：Agent 执行完任务后，**回头审视自己的推理过程**，评估结果质量，发现问题则重新尝试。通过多轮"执行→反思→改进"循环，逐步提升答案质量。

```
Act (执行任务)
   │ 输出结果
   ▼
Evaluate (评估结果) ──质量达标──→ Done (质量达标)
   │
   │质量不足
   ▼
Reflect (反思推理) ──生成反思──→ Retry (带着反思重试)
                                   │重新执行
                                   ▼
                                 (回到 Act)
```

### ReAct vs Reflexion：观察什么？

| | ReAct：只观察外部 | Reflexion：还观察自身 |
| --- | --- | --- |
| 过程 | Thought: 我觉得应该搜X<br>Action: search("X")<br>Observation: 搜索结果... | 执行任务，得到结果<br>评估结果质量：答案是否完整？<br>反思推理过程：决策是否合理？ |
| 观察对象 | → 观察**工具返回的结果**<br>→ 不评估"搜X这个决策本身是否合理" | → 观察**外部结果 + 自身推理质量**<br>→ 发现推理错误可以修正 |

### Reflexion 循环实现

> 关于多语言示例
> 本节原文的 TypeScript / Go / Java 版本同样仅为 Python 的注释占位，此处仅保留完整的 Python 版本。

**Python：**

```python
from openai import OpenAI

client = OpenAI()

REFLECT_PROMPT = """你刚刚完成了一个任务，但结果不够好。
回顾你的推理过程和执行结果，找出问题所在。

之前的尝试:
{trajectory}

评估反馈:
{evaluation}

请反思:
1. 哪一步推理出了问题？
2. 应该怎么做才更好？
3. 下次尝试时需要注意什么？

输出格式:
Reflection: 你的反思内容"""

def react_agent_with_context(question, context=""):
    """带上下文的 ReAct Agent（复用 react_agent 逻辑，注入额外上下文）"""
    messages = [{"role": "system", "content": REACT_PROMPT + context}]
    messages.append({"role": "user", "content": question})
    trajectory = []
    for step in range(10):
        resp = client.chat.completions.create(model="gpt-4o", messages=messages)
        thought = resp.choices[0].message.content
        trajectory.append(thought)
        if "finish" in thought.lower():
            return {"answer": thought, "trajectory": "\n".join(trajectory)}
        messages.append({"role": "assistant", "content": thought})
    return {"answer": thought, "trajectory": "\n".join(trajectory)}

def reflexion_agent(question, max_trials=3):
    """Reflexion: 执行→评估→反思→重试"""
    reflections = []  # 累积的反思经验

    for trial in range(max_trials):
        # 1. 执行任务（使用 ReAct + 历史反思作为额外上下文）
        context = ""
        if reflections:
            context = f"\n之前的反思经验:\n" + "\n".join(reflections)

        result = react_agent_with_context(question, context)

        # 2. 评估结果质量
        evaluation = evaluate_result(question, result)

        if evaluation["score"] >= 0.8:  # 质量达标
            return result

        # 3. 反思推理过程
        reflection = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": REFLECT_PROMPT},
                {"role": "user", "content":
                 f"之前的尝试:\n{result['trajectory']}\n\n"
                 f"评估反馈:\n{evaluation['feedback']}"}
            ]
        ).choices[0].message.content

        reflections.append(reflection)
        print(f"Trial {trial+1}: score={evaluation['score']:.2f}")
        print(f"Reflection: {reflection[:100]}...")

    return result  # 达到最大尝试次数，返回最后结果

def evaluate_result(question, result):
    """LLM 评估答案质量"""
    resp = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content":
             "评估以下答案的质量。输出JSON: {\"score\": 0-1, \"feedback\": \"...\"}"},
            {"role": "user", "content":
             f"问题: {question}\n答案: {result['answer']}"}
        ],
        response_format={"type": "json_object"}
    )
    import json
    return json.loads(resp.choices[0].message.content)

# 使用
answer = reflexion_agent(
    "解释量子纠缠的原理，并说明它与经典关联的区别"
)
```
