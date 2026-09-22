---
title: Spec Kit 完整工作流：从需求规格到代码实现
published: 2026-09-22
category: 工具与环境配置
tags:
  - Spec_Kit
  - 规范驱动开发
  - AI编程
  - 开发工作流
  - Codex
description: 介绍 Spec Kit 在已有项目中的安装与初始化方法，梳理 Constitution、Specify、Clarify、Plan、Checklist、Tasks、Analyze、Implement 和 Converge 的完整规范驱动开发流程。
---
可以把 **Spec Kit** 理解成：

> **先把需求写清楚 → 再设计怎么做 → 再拆任务 → 最后让 AI 按任务写代码 → 检查是否真正完成。**

无论是新项目还是已有项目，都可以按照下面这套流程使用 Spec Kit。

官方项目与最新文档：[GitHub · github/spec-kit](https://github.com/github/spec-kit)

如果想对比另一套规范驱动开发工具openspec，可参考 [OpenSpec 6 条官方原生命令](./openspec-6-条官方原生命令.md)。

## 1. 第一次安装 Spec Kit

终端里执行：

```powershell
uv tool install specify-cli
```

检查是否安装成功：

```powershell
specify version
```

这个只需要安装一次。

关于 `uv tool`、工具目录和缓存管理，可参考 [uv 常用指令](./uv-常用指令.md)。

## 2. 在已有项目中初始化

进入你的项目：

```powershell
cd D:\project\my-app
```

然后：

```powershell
specify init --here --force
```

如果你确定使用某个 AI 编程工具，也可以直接指定，例如：

```powershell
specify init --here --force --integration codex
```

或者：

```powershell
specify init --here --force --integration claude
```

作用是给当前项目加入 Spec Kit 的 `.specify/`、模板、脚本以及对应 AI Agent 的命令文件。`--here` 表示当前目录，`--force` 表示允许初始化到已有文件的项目里。

**`specify init` 一个项目通常只执行一次。** 后面开发功能，不需要每次重新 init。
## 3. 正式开发流程

初始化完成以后，下面这些就**不是 PowerShell 命令了**。

它们是在 Codex、Claude Code、Copilot 等 AI 编程 Agent 的聊天框里输入。

最完整流程是：

```text
constitution
    ↓
specify
    ↓
clarify
    ↓
plan
    ↓
checklist
    ↓
tasks
    ↓
analyze
    ↓
implement
    ↓
converge
```

官方目前把 `clarify / checklist / analyze` 看作质量检查步骤；简单功能可以省略，正式项目建议使用。

具体作用：

| 顺序  | 指令                      | 作用                          |
| --- | ----------------------- | --------------------------- |
| 1   | `/speckit.constitution` | 定项目总规则                      |
| 2   | `/speckit.specify`      | 写需求规格                       |
| 3   | `/speckit.clarify`      | 找需求里不明确的地方                  |
| 4   | `/speckit.plan`         | 制定技术实现方案                    |
| 5   | `/speckit.checklist`    | 检查需求质量                      |
| 6   | `/speckit.tasks`        | 拆成具体开发任务                    |
| 7   | `/speckit.analyze`      | 检查 spec / plan / tasks 是否矛盾 |
| 8   | `/speckit.implement`    | 真正开始写代码                     |
| 9   | `/speckit.converge`     | 检查是否全部实现完成                  |

不同 Agent 生成出来的命令格式可能显示成：

```text
/speckit.specify
```

或者：

```text
/speckit-specify
```

按你的 Agent 初始化后实际显示的命令为准；官方文档也说明命令调用形式会跟 integration 有关。
### ① `/speckit.constitution`

**一个项目通常执行一次。**

作用：定义整个项目以后都必须遵守的规则。

例如，一个普通的 Python Web 项目可以写：

```text
/speckit.constitution

项目采用 Python 开发。
使用 FastAPI 提供接口。
使用 SQLite 存储数据。
所有配置通过 .env 管理。
代码要求模块化，并使用 Pydantic 定义数据模型。
所有核心功能都需要编写测试。
```

以后生成 spec、plan、代码时，都应该遵守这些规则。

可以理解成：

> **项目宪法 / 项目最高规范**

官方也明确建议 constitution 通常是项目级、一次性的。

---

### ② `/speckit.specify`

这个是**每开发一个新功能都执行**。

作用：

> 定义“我要做什么”。

这个阶段尽量只说**需求**，不要急着说具体怎么实现。

例如要开发“待办事项管理”功能：

```text
/speckit.specify

实现待办事项管理功能。

用户可以输入：
待办事项标题
待办事项描述

用户可以：
创建待办事项
查看待办事项列表
将待办事项标记为已完成
删除待办事项
```

它通常会生成类似：

```text
specs/
└── xxx-recommend-dish/
    └── spec.md
```

`spec.md` 就是这个功能的**需求说明书**。

---

### ③ `/speckit.clarify`

作用：

> 找出需求里面模糊、不完整的地方。

例如 AI 可能发现：

```text
标题是否允许为空？
列表是否需要分页？
删除操作是否需要二次确认？
已完成的事项是否可以恢复？
```

然后你回答这些问题，Spec Kit 会继续完善 `spec.md`。

所以：

```text
specify
```

解决：

> 我要什么？

而：

```text
clarify
```

解决：

> 这个需求还有什么没讲清楚？

---

### ④ `/speckit.plan`

这一步开始谈**技术实现**。

作用：

> 决定“怎么做”。

比如：

```text
/speckit.plan

使用 Python + FastAPI。

使用 SQLite 存储待办事项。

提供创建、查询、更新和删除接口。

使用 Pydantic 校验请求参数和响应数据。
```

它会生成类似：

```text
plan.md
```

里面包含：

```text
技术架构
模块设计
数据库设计
数据流
接口设计
依赖关系
```

所以：

```text
spec.md
```

回答：

> 做什么？

```text
plan.md
```

回答：

> 怎么做？

---

### ⑤ `/speckit.checklist`

作用：

> 检查需求写得够不够完整。

例如检查：

```text
[x] 是否定义功能范围
[x] 是否定义待办事项的数据结构
[x] 是否定义可以执行的操作
[ ] 是否定义空标题的处理方式
[ ] 是否定义删除后的返回结果
```

它主要检查**需求本身的质量**，不是测试你的 Python 代码。

---

### ⑥ `/speckit.tasks`

这一步很重要。

作用：

> 把 plan 拆成真正可以执行的小任务。

比如会生成：

```text
tasks.md
```

内容可能类似：

```text
T001 创建 Todo Pydantic 模型

T002 创建待办事项数据表

T003 实现创建待办事项接口

T004 实现待办事项列表接口

T005 实现完成状态更新接口

T006 实现删除待办事项接口

T007 编写接口测试
```

也就是把：

> “实现智能推荐”

变成：

> “具体我要改哪些文件、写哪些模块。”

而且任务会按照依赖顺序排列。

---

### ⑦ `/speckit.analyze`

作用：

> 在真正写代码之前做一次总检查。

它会比较：

```text
spec.md
plan.md
tasks.md
```

检查有没有这种情况：

```text
spec 要求支持恢复已完成事项
        ↓
plan 里面忘记设计
        ↓
tasks 里面也没有对应任务
```

或者：

```text
plan 设计了分页功能
        ↓
tasks 却完全没有分页任务
```

这个命令主要负责**找矛盾、遗漏和不一致**，本身不会直接修代码。

---

### ⑧ `/speckit.implement`

到了这里才真正开始：

> **写代码。**

直接执行：

```text
/speckit.implement
```

AI 会读取：

```text
constitution
spec.md
plan.md
tasks.md
```

然后按照：

```text
T001
↓
T002
↓
T003
↓
...
```

逐个实现。

也就是说 Spec Kit 最核心的思想不是：

```text
我：帮我写个推荐系统
AI：好的，开始乱写
```

而是：

```text
需求
 ↓
需求澄清
 ↓
技术设计
 ↓
任务拆分
 ↓
一致性检查
 ↓
开始编码
```

---

### ⑨ `/speckit.converge`

这是现在流程里最后一个很重要的步骤。

作用：

> **检查代码是否真的已经满足 spec，而不是“代码写完就算完”。**

执行：

```text
/speckit.converge
```

它会检查当前实现和需求之间还有没有 gap。

如果发现：

```text
还有功能没实现
还有测试没补
还有需求没覆盖
```

它可能继续生成剩余任务。

然后继续：

```text
/speckit.implement
```

再：

```text
/speckit.converge
```

直到达到：

```text
Converged
```

官方现在推荐的模式就是反复：

```text
implement
↓
converge
↓
implement
↓
converge
```

直到实现和规格完全收敛。

---

## 你实际最需要记住的版本

第一次在项目中使用时：

```powershell
uv tool install specify-cli

cd D:\project\my-app

specify init --here --force --integration codex
```

然后项目级执行一次：

```text
/speckit.constitution
```

以后每开发一个功能：

```text
/speckit.specify
        ↓
/speckit.clarify
        ↓
/speckit.plan
        ↓
/speckit.checklist
        ↓
/speckit.tasks
        ↓
/speckit.analyze
        ↓
/speckit.implement
        ↓
/speckit.converge
```

如果只是小功能，可以简化成官方核心流程：

```text
/speckit.specify
        ↓
/speckit.plan
        ↓
/speckit.tasks
        ↓
/speckit.implement
        ↓
/speckit.converge
```

一句话记忆就是：

> **Constitution 定规矩 → Specify 定需求 → Clarify 问清楚 → Plan 定方案 → Checklist 查需求 → Tasks 拆任务 → Analyze 查矛盾 → Implement 写代码 → Converge 验收。** 
>

