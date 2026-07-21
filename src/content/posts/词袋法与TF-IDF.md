---
title: 词袋法与 TF-IDF
published: 2026-06-16
category: 编程技术
tags: [机器学习,特征工程,NLP,TF-IDF]
---

# 词袋法与 TF-IDF

在机器学习里，模型一般不能直接处理文本。

比如下面这句话：

```text
This is spark, spark sql a every good
```

对人来说，这是文本；但对模型来说，它需要的是数字。

所以文本特征处理的核心问题就是：

> 怎么把一句话、一段话、一个文档，转换成模型能理解的数字向量？

常见方法有：

- 词袋法，也叫 Bag of Words
- TF-IDF
- Word2Vec、BERT 等更复杂的文本向量方法

这节主要看词袋法和 TF-IDF。

---

## 1. 准备数据

```python
import pandas as pd
import numpy as np

from sklearn.feature_extraction.text import (
    TfidfVectorizer,
    CountVectorizer,
    TfidfTransformer
)
```

准备两组文本：

```python
arr1 = [
    "This is spark, spark sql a every good",
    "Spark Hadoop Hbase",
    "This is sample",
    "This is anthor example anthor example",
    "spark hbase hadoop spark hive hbase hue oozie",
    "hue oozie spark"
]

arr2 = [
    "this is a sample a example",
    "this cd is another another sample example example",
    "spark Hbase hadoop Spark hive hbase"
]
```

这里：

- `arr1`：训练文本，用来学习词表和 TF-IDF 权重
- `arr2`：新文本，用来测试转换效果

注意，`arr1` 里面有一个拼写是 `anthor`，而 `arr2` 里面是 `another`。  
这两个词在程序看来是两个完全不同的词。

---

# 一、词袋法

## 2. 什么是词袋法

词袋法的英文是 Bag of Words，简称 BOW。

它的思想很简单：

> 不关心词语顺序，只关心每个词出现了几次。

比如有两句话：

```text
spark hadoop spark
hadoop hive
```

词表是：

```text
spark, hadoop, hive
```

那么可以转换成：

| 文档               | spark | hadoop | hive |
| ------------------ | ----: | -----: | ---: |
| spark hadoop spark |     2 |      1 |    0 |
| hadoop hive        |     0 |      1 |    1 |

这就是词袋法。

它把文本变成了一个“词频矩阵”。

---

## 3. CountVectorizer

sklearn 里可以用 `CountVectorizer` 实现词袋法。

```python
count = CountVectorizer(
    min_df=0.1,
    dtype=np.float64,
    ngram_range=(0, 1)
)

df1 = count.fit_transform(arr1)
```

几个参数解释一下：

- `min_df=0.1`：词至少要在一定比例的文档里出现，才会被加入词表
- `dtype=np.float64`：矩阵里的数字类型
- `ngram_range=(0, 1)`：控制提取几个词组成的特征，正常常用写法是 `(1, 1)`，表示只提取单个词

实际项目里，如果只做普通词袋法，更推荐写：

```python
CountVectorizer(ngram_range=(1, 1))
```

---

## 4. 查看词袋矩阵

```python
print(df1)
print(df1.toarray())
```

`df1` 默认是稀疏矩阵。

稀疏矩阵的显示形式类似：

```text
(0, 13)  1.0
(0, 8)   1.0
(0, 11)  2.0
```

意思是：

- 第 0 篇文档
- 第 13 个词出现了 1 次
- 第 8 个词出现了 1 次
- 第 11 个词出现了 2 次

之所以用稀疏矩阵，是因为文本数据通常特别稀疏。  
比如词表有 10000 个词，但一篇文章可能只出现其中几十个。

如果想看普通数组，可以用：

```python
df1.toarray()
```

输出类似：

```python
[[0. 1. 0. 1. 0. 0. 0. 0. 1. 0. 0. 2. 1. 1.]
 [0. 0. 0. 0. 1. 1. 0. 0. 0. 0. 0. 1. 0. 0.]
 [0. 0. 0. 0. 0. 0. 0. 0. 1. 0. 1. 0. 0. 1.]
 ...
]
```

每一行表示一篇文档。  
每一列表示词表里的一个词。  
每个数字表示这个词在当前文档中出现的次数。

---

## 5. 查看词表

```python
print(count.get_feature_names_out())
```

输出：

```python
['anthor' 'every' 'example' 'good' 'hadoop' 'hbase' 'hive' 'hue' 'is'
 'oozie' 'sample' 'spark' 'sql' 'this']
```

这就是模型从 `arr1` 里学到的词表。

有几个细节：

1. 默认会把英文转成小写，所以 `Spark` 和 `spark` 会被当成同一个词。
2. 默认会忽略单个字符，所以 `a` 没有进入词表。
3. `arr2` 里出现但 `arr1` 没出现的词，转换时会被忽略。

---

## 6. 转换新文本

```python
print("转换另外的文档数据")
print(count.transform(arr2).toarray())
```

注意这里用的是：

```python
count.transform(arr2)
```

而不是：

```python
count.fit_transform(arr2)
```

两者区别很重要：

- `fit_transform`：重新学习词表，并转换数据
- `transform`：使用已经学好的词表，转换新数据

在真实项目里，训练集用 `fit_transform`，测试集和新样本用 `transform`。

如果对测试集也用 `fit_transform`，那测试集的词表就可能和训练集不一样，模型就没法正确使用。

---

# 二、TF-IDF

## 7. 为什么需要 TF-IDF

词袋法只统计词频，有一个问题：

> 高频词不一定重要。

比如在英文文本里：

```text
this, is, the, a
```

这些词可能经常出现，但它们对区分文本主题帮助不大。

而像：

```text
spark, hadoop, hbase
```

这些词虽然不一定每篇都出现，但更能表达文档主题。

所以我们希望：

- 一个词在当前文档中出现越多，越重要
- 一个词在所有文档中都出现，说明它太常见，重要性应该降低

这就是 TF-IDF 的思想。

---

## 8. TF 是什么

TF 是 Term Frequency，词频。

它表示某个词在当前文档中出现的频率。

简单理解：

```text
某个词在文档中出现次数越多，TF 越高
```

比如：

```text
spark hadoop spark
```

`spark` 出现了 2 次，`hadoop` 出现了 1 次。  
所以 `spark` 的 TF 更高。

---

## 9. IDF 是什么

IDF 是 Inverse Document Frequency，逆文档频率。

它表示一个词在整个语料库中是否稀有。

简单理解：

```text
一个词在很多文档里都出现，IDF 较低
一个词只在少数文档里出现，IDF 较高
```

比如：

- `is` 很常见，区分度低
- `hadoop` 更专业，区分度高

所以 `hadoop` 的 IDF 通常会比 `is` 高。

---

## 10. TF-IDF 的直观理解

TF-IDF 可以粗略理解成：

```text
TF-IDF = 当前文档里的词频 × 这个词在全局的稀有程度
```

也就是：

> 一个词在当前文章里经常出现，并且在其他文章里不常出现，那么它就更重要。

---

# 三、TfidfTransformer

## 11. 先词袋，再 TF-IDF

`TfidfTransformer` 的作用是：

> 把已经计算好的词频矩阵，转换成 TF-IDF 矩阵。

它不能直接处理原始文本，需要先用 `CountVectorizer` 得到词袋矩阵。

```python
tfidf_t = TfidfTransformer()
df2 = tfidf_t.fit_transform(df1)

print(df2.toarray())
```

流程是：

```text
原始文本
  ↓
CountVectorizer
  ↓
词频矩阵
  ↓
TfidfTransformer
  ↓
TF-IDF 矩阵
```

---

## 12. TF-IDF 矩阵怎么看

输出类似：

```python
[[0.         0.43167582 0.         0.43167582 ...]
 [0.         0.         0.         0.         ...]
 ...
]
```

每一行还是一篇文档。  
每一列还是词表中的一个词。

但矩阵里的值已经不是简单的出现次数，而是 TF-IDF 权重。

值越大，说明这个词对当前文档越重要。

---

## 13. 转换新文本

```python
print("转换另外的文档数据")
print(tfidf_t.transform(count.transform(arr2)).toarray())
```

这里要注意流程：

```python
count.transform(arr2)
```

先把新文本转换成词频矩阵。

然后：

```python
tfidf_t.transform(...)
```

再把词频矩阵转换成 TF-IDF 矩阵。

完整流程是：

```text
arr2
  ↓
使用 arr1 学到的词表做词袋转换
  ↓
使用 arr1 学到的 IDF 做 TF-IDF 转换
```

也就是说，新文本不能重新学习词表，也不能重新学习 IDF。  
必须使用训练集上学到的规则。

---

# 四、TfidfVectorizer

## 14. 一步完成词袋和 TF-IDF

`TfidfVectorizer` 可以理解成：

```text
CountVectorizer + TfidfTransformer
```

它可以直接从原始文本得到 TF-IDF 矩阵。

```python
tfidf_v = TfidfVectorizer(
    min_df=0,
    dtype=np.float64
)

df3 = tfidf_v.fit_transform(arr1)

print(df3.toarray())
print(tfidf_v.get_feature_names_out())
```

相比前面的两步写法：

```python
count = CountVectorizer()
df1 = count.fit_transform(arr1)

tfidf_t = TfidfTransformer()
df2 = tfidf_t.fit_transform(df1)
```

`TfidfVectorizer` 更简洁：

```python
tfidf_v = TfidfVectorizer()
df3 = tfidf_v.fit_transform(arr1)
```

---

## 15. 查看词表

```python
print(tfidf_v.get_feature_names_out())
```

输出：

```python
['anthor' 'every' 'example' 'good' 'hadoop' 'hbase' 'hive' 'hue' 'is'
 'oozie' 'sample' 'spark' 'sql' 'this']
```

可以看到，它学到的词表和 `CountVectorizer` 是一致的。

---

## 16. 转换新文本

```python
print("转换另外的文档数据")
print(tfidf_v.transform(arr2).toarray())
```

这里也一样：

- 训练文本：`fit_transform`
- 新文本：`transform`

```python
tfidf_v.fit_transform(arr1)
tfidf_v.transform(arr2)
```

这样可以保证训练数据和新数据使用同一套词表、同一套 IDF 权重。

---

# 五、CountVectorizer、TfidfTransformer、TfidfVectorizer 的关系

可以这样记：

## CountVectorizer

作用：

```text
文本 → 词频矩阵
```

只统计每个词出现了几次。

适合理解词袋法。

---

## TfidfTransformer

作用：

```text
词频矩阵 → TF-IDF 矩阵
```

它不直接处理文本，而是处理 `CountVectorizer` 的输出。

---

## TfidfVectorizer

作用：

```text
文本 → TF-IDF 矩阵
```

它等价于：

```text
CountVectorizer + TfidfTransformer
```

所以实际项目里，如果直接想要 TF-IDF，一般用 `TfidfVectorizer` 更方便。

---

# 六、几个容易混淆的点

## 1. 为什么输出里没有单词 a？

因为 sklearn 默认的分词规则会忽略单个字符。

默认 `token_pattern` 类似：

```python
r"(?u)\b\w\w+\b"
```

意思是只保留长度至少为 2 的词。

所以 `a` 被忽略了。

---

## 2. 为什么 Spark 和 spark 算同一个词？

因为 `CountVectorizer` 和 `TfidfVectorizer` 默认会做小写转换。

也就是：

```text
Spark → spark
Hbase → hbase
This → this
```

如果不想自动转小写，可以设置：

```python
lowercase=False
```

---

## 3. 为什么 arr2 里的 cd 没有出现在结果里？

因为词表是在 `arr1` 上学到的。

`cd` 只出现在 `arr2`，没有出现在 `arr1`，所以转换时会被忽略。

这也是为什么新数据要用 `transform`，而不是重新 `fit_transform`。

---

## 4. anthor 和 another 为什么不是一个词？

因为程序不会自动纠错。

`arr1` 里是：

```text
anthor
```

`arr2` 里是：

```text
another
```

这两个词拼写不同，所以会被当成两个不同的词。

而且 `another` 没有出现在训练词表里，所以转换 `arr2` 时会被忽略。

---

# 七、实际使用建议

如果只是学习词袋法，可以用：

```python
CountVectorizer()
```

如果已经有词频矩阵，想转 TF-IDF，可以用：

```python
TfidfTransformer()
```

如果直接想把文本转成 TF-IDF 特征，推荐用：

```python
TfidfVectorizer()
```

实际项目中最常见的是：

```python
from sklearn.feature_extraction.text import TfidfVectorizer

tfidf = TfidfVectorizer()
X_train = tfidf.fit_transform(train_texts)
X_test = tfidf.transform(test_texts)
```

然后把 `X_train`、`X_test` 送给分类模型或聚类模型。

---

# 八、小结

这节主要讲了文本特征提取里两个基础方法。

词袋法：

```text
只看词出现了几次
```

TF-IDF：

```text
既看词在当前文档中是否常出现，也看它在全局是否稀有
```

三种工具的关系：

```text
CountVectorizer：文本 → 词频矩阵

TfidfTransformer：词频矩阵 → TF-IDF 矩阵

TfidfVectorizer：文本 → TF-IDF 矩阵
```

一句话总结：

> 词袋法负责数词频，TF-IDF 负责判断哪些词更重要。