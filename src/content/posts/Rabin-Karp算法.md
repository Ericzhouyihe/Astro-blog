---
title: Rabin-Karp算法
published: 2026-07-21
tags: [算法, 字符串匹配, 哈希表, 滚动哈希]
category: 数据结构与算法
description: 从多项式哈希到滚动窗口，彻底搞懂 Rabin-Karp 算法的设计与实现。
---

# Rabin-Karp：哈希思想的深入剖析

## 1. 从逐字符到比数字

朴素字符串匹配每次移动窗口都需要逐字符比较模式串与文本子串，最坏时间复杂度为 $O(n \cdot m)$。

Rabin-Karp 的核心思路是：**把“字符串相等”的判断，先转化为“整数相等”的判断。**

> 如果我们能设计一个函数 $h(S)$，将字符串映射成一个固定范围的整数（哈希值），那么模式 $P$ 与文本中每一个长度为 $m$ 的子串 $T[i\ldots i+m-1]$ 是否相同，就可以先比较 $h(P)$ 与 $h(T[i\ldots i+m-1])$。  
> 只有当哈希值相等时，才逐字符确认。

tip 为什么先比数字？
- 整数比较只需 $O(1)$ 时间。
- 绝大多数不匹配的位置可以在 $O(1)$ 内被排除。
- 只在极少数“命中”时才进行昂贵的逐字符验证。

---

## 2. 多项式哈希：把字符串变成数字

哈希函数的质量直接决定算法效率。Rabin-Karp 采用的**多项式哈希**，本质上是将字符串视为一个以 $B$ 为基数的数字。

给定一个字符串 $S = s_0 s_1 \ldots s_{m-1}$，每个字符先映射为一个整数值（例如 ASCII 码，或 `a`=1, `b`=2…）。那么它的哈希值定义为：

$$
h(S) = (s_0 \cdot B^{m-1} + s_1 \cdot B^{m-2} + \dots + s_{m-1} \cdot B^0) \bmod Q
$$

- **基数 $B$**：通常取比字符集大小稍大的质数，比如 256（针对字节）、131、137 等。  
- **模数 $Q$**：一般取一个大质数，如 $10^9+7$ 或 $10^9+9$，避免整数溢出并降低碰撞概率。

info 为什么模 $Q$ 选质数？
质数模可以让哈希值在 $[0, Q-1]$ 内更均匀地分布，减少因数字规律造成的碰撞。基数 $B$ 与 $Q$ 互质则进一步保证了良好的散列特性。

**示例**：设 $B=10$（仅用于手算），字符映射 `a=1, b=2, c=3`，模式 `"abc"` 的哈希值为：
$$
1 \cdot 10^2 + 2 \cdot 10^1 + 3 \cdot 10^0 = 123
$$

---

## 3. 滚动哈希：O(1) 滑动窗口更新

这是 Rabin-Karp 最精妙的部分。当窗口从 $T[i\ldots i+m-1]$ 滑动到 $T[i+1\ldots i+m]$ 时，我们无需重新扫描 $m-1$ 个字符，只需利用旧的哈希值，进行三步更新即可。

设旧哈希为 $h_i$，其对应子串为 $t_i t_{i+1} \ldots t_{i+m-1}$：
$$
h_i = (t_i \cdot B^{m-1} + t_{i+1} \cdot B^{m-2} + \dots + t_{i+m-1}) \bmod Q
$$

要得到新哈希 $h_{i+1}$：

1. **移除最高位贡献**：$h_i - t_i \cdot B^{m-1}$
2. **整体左移一位**（乘 $B$）：$(h_i - t_i \cdot B^{m-1}) \cdot B$
3. **加上新字符**：$+ t_{i+m}$
4. **取模**（始终保持在有限域内）

因此滚动公式为：
$$
h_{i+1} = \left[ (h_i - t_i \cdot B^{m-1}) \cdot B + t_{i+m} \right] \bmod Q
$$

> 实际编码中需要预计算 $\text{highBase} = B^{m-1} \bmod Q$，并且注意括号内减法可能产生负数，因此要 `(h_i - t_i * highBase) % Q` 并确保结果非负（加 $Q$ 再取模）。
>

如果把字符串看成十进制数，窗口滑动就是：去掉最高位数字，整体 ×10，加上新的个位。例如从 `23590` 滑到 `35902`：

- 23590 - 2×10000 = 3590
- ×10 → 35900
- +2 → 35902

---

## 4. 关键步骤的 Python 实现

### 4.1 基本设置与哈希函数

```python
# 选择基数与模数
BASE = 256          # 扩展 ASCII 范围
MOD = 10**9 + 7     # 大质数

def char_val(ch: str) -> int:
    """将字符映射为整数，这里直接使用 ASCII 码"""
    return ord(ch)

def compute_hash(s: str) -> int:
    """计算字符串 s 的多项式哈希值"""
    h = 0
    for ch in s:
        h = (h * BASE + char_val(ch)) % MOD
    return h
```

**解释**：以上算法等同于霍纳法则，避免了显式计算高次幂，时间复杂度 $O(m)$。

### 4.2 滚动更新

```python
def roll_hash(old_hash: int, left_char: str, right_char: str, high_base: int) -> int:
    """
    由旧窗口哈希滚动计算新窗口哈希。
    left_char: 移出窗口的字符
    right_char: 移入窗口的字符
    high_base: B^{m-1} mod Q
    """
    # 移除最高位，加 MOD 防止出现负数
    new_hash = (old_hash - char_val(left_char) * high_base) % MOD
    # 左移一位（乘以 BASE）
    new_hash = (new_hash * BASE) % MOD
    # 加入新字符
    new_hash = (new_hash + char_val(right_char)) % MOD
    return new_hash
```

### 4.3 完整的 Rabin-Karp 搜索

```python
def rabin_karp(text: str, pattern: str) -> list[int]:
    """返回 pattern 在 text 中所有匹配的起始索引"""
    n, m = len(text), len(pattern)
    if m == 0 or n < m:
        return []

    # 预计算 BASE^{m-1} mod MOD
    high_base = pow(BASE, m-1, MOD)

    # 计算模式哈希和文本第一个窗口的哈希
    pattern_hash = compute_hash(pattern)
    window_hash = compute_hash(text[:m])

    matches = []

    for i in range(n - m + 1):
        # 检查哈希是否匹配
        if window_hash == pattern_hash:
            # 必须逐字符验证，避免碰撞
            if text[i:i+m] == pattern:
                matches.append(i)

        # 如果不是最后一个窗口，滚动哈希
        if i < n - m:
            window_hash = roll_hash(window_hash, text[i], text[i+m], high_base)

    return matches
```

### 4.4 测试运行

```python
text = "ABCCDDAEFGCDD"
pattern = "CDD"
print(rabin_karp(text, pattern))  # 输出 [3, 9]
```

**执行过程举例**（简化版本，BASE=256 时类似）：
- 窗口 `CDD` 在索引 3 和 9 处出现，哈希命中并验证通过。
- 其他位置哈希值大概率不等，直接跳过。

---

## 5. 碰撞处理与可靠性

当 $Q$ 足够大时，哈希碰撞的概率极低（约 $1/Q$）。但为了保证算法绝对正确，我们采用 **“命中即验证”** 策略：

- 哈希值相等 $\Rightarrow$ 调用原始字符串比较 `text[i:i+m] == pattern`。
- 如果验证失败，就是一次假阳性（碰撞），忽略并继续滑动。

如果恶意构造输入，使得每个窗口的哈希值都与模式哈希相等（例如模 $Q$ 下的伪造碰撞），那么算法会退化成 $O(n \cdot m)$。实际应用中通过随机化基数或使用双哈希可以有效避免。

**双哈希优化**：使用两个不同的模数 $(Q_1, Q_2)$，只有两组哈希都相等才认为是命中，碰撞概率降为 $1/(Q_1 Q_2)$，可忽略不计。

---

## 6. 复杂度分析

| 操作                          | 时间复杂度     | 说明                              |
| ----------------------------- | -------------- | --------------------------------- |
| 预处理（模式哈希 + highBase） | $O(m)$         | 只需一次                          |
| 窗口滚动                      | $O(n)$         | 每个窗口 $O(1)$，共 $n-m+1$ 次    |
| 命中验证                      | 平均极少       | 真匹配次数 × $O(m)$，碰墙次数极少 |
| 总平均时间                    | $O(n+m)$       | 接近线性                          |
| 总最坏时间                    | $O(n \cdot m)$ | 恶意碰撞导致                      |

---

## 7. 扩展与应用

- **多模式匹配**：只需预计算所有模式的哈希并存入集合，滑动文本窗口时检查集合，命中后逐一核实。
- **文件去重与分块**：内容可变长分块（CDC）中常基于滚动哈希确定块边界。
- **最长公共子串**：结合二分查找，用滚动哈希 $O(n \log n)$ 判断特定长度是否存在重复子串。
- **数据流重复检测**：如网络数据包的滑动窗口指纹。

---

## 8. 总结

Rabin-Karp 用哈希思想将字符串匹配转化为高效的整数判等，并通过滚动哈希实现了常数时间的窗口滑动。其精髓在于：

1. **多项式哈希** – 有序、易滚动。
2. **滚动更新公式** – 减头、乘基、加尾、取模。
3. **命中验证** – 确保正确性，无惧碰撞。

这种“可增量计算的哈希”已经成为许多字符串算法与系统设计的基石。
