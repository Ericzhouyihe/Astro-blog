---
title: KMP算法详解
published: 2026-07-21
description: '字符串匹配 KMP 算法核心原理、next 数组推导、完整匹配流程、代码实现与复杂度分析'
tags: [算法, 字符串匹配, KMP]
category: '数据结构与算法'
draft: false 
---

# KMP 算法详解

KMP 由 Knuth、Morris、Pratt 三人提出，是一种**线性时间复杂度的字符串模式匹配算法**，用于在主串 S 中快速查找模式串 P 的出现位置。

相比暴力匹配 O(n·m) 的时间复杂度，KMP 可在 **O(n+m)** 时间内完成匹配，核心思想是：**主串指针永不回溯**，仅通过模式串自身的前缀信息调整匹配位置，避免重复比较已匹配的字符。

## 一、暴力匹配的缺陷
### 核心逻辑
- 主串指针 `i`、模式串指针 `j` 均从 0 开始
- 字符匹配则双指针共同后移
- 失配时 `i` 回退到 `i-j+1`，`j` 重置为 0，从头匹配

### 低效根源
每次失配都回退主串指针，大量已比较过的字符被重复比对。极端场景（如主串全为'A'、模式串末尾才失配）下，时间复杂度退化至 O(n·m)。

## 二、核心概念：最长相等前后缀
### 定义
- **前缀**：从字符串首字符开始、不包含最后一个字符的所有子串
- **后缀**：以字符串尾字符结尾、不包含第一个字符的所有子串
- **最长相等前后缀**：前缀与后缀中内容完全相等的最长子串的长度

### 示例（字符串 `ABABC`）
| 子串    | 最长相等前后缀 | 长度 |
| ------- | -------------- | ---- |
| `A`     | 无             | 0    |
| `AB`    | 无             | 0    |
| `ABA`   | `A`            | 1    |
| `ABAB`  | `AB`           | 2    |
| `ABABC` | 无             | 0    |

## 三、next 数组（前缀函数）
### 定义
将模式串每个位置对应的「最长相等前后缀长度」整理成数组，即为 next 数组。
- `next[j]`：模式串前 `j+1` 个字符组成的子串，其最长相等前后缀的长度
- 失配作用：第 `j` 位失配时，直接让 `j = next[j-1]`，跳过不可能匹配的位置

### 递推求解（O(m) 时间）
本质是「模式串自己匹配自己」，双指针递推实现：
1. 初始化 `length=0`（当前最长前后缀长度），`i=1`（遍历指针），`next[0]=0`
2. 若 `p[i] == p[length]`：`length++`，`next[i]=length`，`i++`
3. 若失配且 `length>0`：`length = next[length-1]`（复用已有结果快速回退）
4. 若失配且 `length==0`：`next[i]=0`，`i++`

### 示例结果
模式串 `ABABC` 的 next 数组：`[0, 0, 1, 2, 0]`
初始化：next = [0,0,0,0,0]，length=0，i=1
1. i=1：p[1]='B' ≠ p[0]='A'，且 length=0 → next[1]=0，i=2
2. i=2：p[2]='A' == p[0]='A' → length=1，next[2]=1，i=3
3. i=3：p[3]='B' == p[1]='B' → length=2，next[3]=2，i=4
4. i=4：p[4]='C' ≠ p[2]='A'，length>0 → length = next[1] = 0

此时 length=0，p[4] 仍 ≠ p[0] → next[4]=0，i=5 结束
最终结果：next = [0, 0, 1, 2, 0]，与手工计算完全一致。

## 四、完整匹配流程
主串 `s`（长度 n）、模式串 `p`（长度 m），`i` 遍历主串、`j` 遍历模式串：
1. 字符匹配：`i++`，`j++`
2. 字符失配：
   - `j > 0` 时：`j = next[j-1]`（前缀位置继续匹配，无需重比前面字符）
   - `j == 0` 时：首字符不匹配，`i++`
3. `j == m`：匹配成功，返回起始位置 `i - j`

> 核心优势：整个匹配过程主串指针 `i` 永不回退。

## 五、代码实现（Python）
```python
def build_next(pattern):
    i = 0
    j = 1
    next = [0] * len(pattern)
    while j < len(pattern):
        if pattern[i] == pattern[j]:
            i += 1
            next[j] = i
            j += 1
        else:
            if i > 0:
                i = next[i - 1]
            else:
                next[j] = 0
                j += 1

    return next

def kmp_search(text, pattern):
    if not pattern:
        return 0

    next = build_next(pattern)
    i = j = 0
    m, n = len(text), len(pattern)

    while i < m:
        if text[i] == pattern[j]:
            i += 1
            j += 1

        if j == n:
            return i - j 
        elif i < m and text[i] != pattern[j]:
            if j > 0:
                j = next[j - 1]
            else:
                i += 1

    return -1

if __name__ == '__main__':
    text = "BBC ABCDAB ABCDABCDABDE"
    pattern = 'ABCDABD'
    print(kmp_search(text, pattern))
```

## 六、复杂度分析
- **时间复杂度：O(n + m)**
  - 构建 next 数组：O(m)，指针总移动次数线性
  - 匹配过程：O(n)，主串指针不回溯
- **空间复杂度：O(m)**，需额外存储 next 数组

## 七、进阶优化：nextval 数组
标准 next 数组存在冗余：若跳转后的字符与当前失配字符相同，仍会再次失配。
优化思路：跳转位置字符与当前字符相同时，继续向前跳转，直到字符不同或到达起点。属于常数级优化，可减少无效比较次数。

## 总结
KMP 算法的精髓：**利用模式串自身的重复结构（最长相等前后缀），在失配时跳过所有不可能匹配的位置，主串指针不回溯，从而实现线性时间的字符串匹配。**
