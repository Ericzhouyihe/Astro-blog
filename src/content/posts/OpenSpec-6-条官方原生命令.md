---
title: "OpenSpec 6 条官方原生命令"
published: 2026-09-12
category: 工具、环境与工作流
tags:
  - OpenSpec
  - 规范驱动开发
  - AI编程
  - 开发工作流
  - 命令行工具
description: 介绍 OpenSpec 的 6 条官方原生命令、适用场景与标准执行顺序，并总结需求修订、规格同步、编码实现和变更归档的关键注意事项。
---

| 内置命令                       | 全称             | 官方作用                                               | 什么时候运行                                                                       |
| -------------------------- | -------------- | -------------------------------------------------- | ---------------------------------------------------------------------------- |
| `$openspec-explore`        | Explore        | 探索调研阶段，需求摸底、现状分析                                   | **最开始，还没提案之前**，用来梳理现有Web项目功能盘点、现状调研                                          |
| `$openspec-propose`        | Propose        | 创建变更任务，生成 proposal.md + tasks.md + .openspec.yaml  | 调研完成后，**正式开启一个新Feature变更分支**（就是你上一张截图生成整套openspec/changes/xxx文件夹）            |
| `$openspec-sync-specs`     | Sync‑Specs     | 同步规格文档；当你修改了任意spec.md，运行这条命令刷新所有子spec，校验模块之间规格没有冲突 | 修改spec之后，用来同步、校验多份拆分spec文档                                                   |
| `$openspec-apply-change`   | Apply‑Change   | 执行变更，生成代码实现，进入编码阶段                                 | proposal → tasks → specs → design 全部审批完毕，**开始写代码**的触发命令                      |
| `$openspec-update-change`  | Update‑Change  | 更新当前变更任务（中途修改提案、任务、架构、需求）                          | ✅**这条才是官方原生的「修订/修改」命令！替代之前我写的Revise‑xxx标签**。提案、任务清单、规格、架构任何文档需要改动，都用这条指令触发更新 |
| `$openspec-archive-change` | Archive‑Change | 归档变更，冻结所有文档，任务闭环完结                                 | 全部代码开发、验证测试完成之后，收尾归档                                                         |

## 标准执行顺序

### 步骤1：调研摸底（Explore）

```
$openspec-explore
需求：将现有web版项目重构迁移为微信小程序，完整承接web全部原有功能，移动端布局重设计。
```

> AI产出现状调研报告，盘点Web所有页面、接口、功能清单。

### 步骤2：创建变更提案（Propose）

```
$openspec-propose
```

> AI自动生成整套目录：`openspec/changes/web‑to‑miniprogram/`
> 产出：`.openspec.yaml`、`proposal.md`、`tasks.md`，生成specs子目录、design.md预留文件。
> 生成完成暂停，等待你人工审核文档。

#### 如果提案/tasks有问题，需要修改，**不要用Revise‑Proposal**，运行原生更新命令：

```
$openspec-update-change
修改内容：【在这里写上你要调整proposal.md / tasks.md的改动点】
```

改完之后，再执行：

```
$openspec-sync-specs
```

用来同步校验文档。

### 步骤3：编写&审核规格文档 specs/**/spec.md

所有子模块spec文档生成完毕，审核无误。

> 如果后期需要修改某一份spec规格文档：

```
$openspec-update-change
修改模块：xxx/spec.md，改动点：【你的修改需求】
```

修改完成**必须同步刷新规格**

```
$openspec-sync-specs
```

### 步骤4：架构文档 design.md 审核完成

### 步骤5：启动编码实现（Apply‑Change）

所有文档全部审批通过，触发代码生成：

```
$openspec-apply-change
```

AI严格按照proposal + specs + design 开始输出业务代码。

### 步骤6：开发中途出现Bug、调整实现方案

> 需求不变，仅修复代码，不需要改动md文档：直接描述问题让AI修复代码。
> 如果**需求发生变动，需要修改md文档**：

```
$openspec-update-change
```

再 `$openspec-sync-specs`

### 步骤7：全部开发自测验收完毕，归档闭环

```
$openspec-archive-change
```

> 当前变更任务所有文档冻结，项目完成归档。

## 相关阅读

- [Spec Kit 完整工作流](./Spec-Kit-完整工作流.md)
