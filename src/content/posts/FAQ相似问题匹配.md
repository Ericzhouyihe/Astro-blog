---
title: FAQ相似问题匹配
published: 2026-09-23
tags:
  - NLP
  - Python
  - 信息检索
  - 智能客服
  - 文本匹配
  - 向量检索
  - BM25
category: 编程技术
description: 系统梳理智能客服 FAQ 相似问题匹配的工程方案：从问题库设计、分词预处理、字面/关键词/语义多路检索，到 RRF 融合排序、Cross-Encoder 精排与效果评估，附完整 Python 代码示例与常见踩坑总结。
---
# 智能客服 FAQ 相似问题匹配

智能客服中最常见的交互模式是：用户输入一句话，系统从预设问题库中找出最相关的几个问题（通常是前 3 个）供用户点选，点选后返回对应答案。

这个过程的核心是**检索与排序**，可以拆成三步：

1. **候选召回**——用关键词、字面相似度、语义向量等方式从问题库中快速筛出一批候选。
2. **融合排序**——将多路召回结果去重、合并，按综合相关性从高到低排列。
3. **阈值判定**——排名靠前的候选分数是否足够高？不够则引导用户补充说明或转人工。

> 一个常见误区是把 FAQ 匹配当「分类任务」——给输入贴意图标签。实际上它更接近**信息检索**：候选集随时增删，用户关心的是「推荐的问题里有没有我要问的」，而非系统内部的标签。

## 问题库设计

匹配效果的上限取决于问题库本身的质量。不要试图穷举用户的每种说法，而是**按业务意图维护标准问题，再为每个标准问题补充别名、关键词和答案**。

### 结构示例

| 意图 | 标准问题 | 常见问法 / 别名 |
|---|---|---|
| 营业时间 | 餐厅营业时间是什么？ | 几点开门、几点关门、你们营业到几点 |
| 预约座位 | 如何预约座位？ | 怎么订位、我想订桌、可以预订吗 |
| 取消预约 | 如何取消预约？ | 取消订位、我不去了怎么取消、怎么退订 |

### 推荐字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | int / UUID | 唯一标识，用于去重和日志追踪 |
| `intent` | string | 业务意图标签，便于分组管理 |
| `standard_question` | string | 展示给用户的标准问题文本 |
| `aliases` | list[string] | 常见的不同问法、口语表达 |
| `keywords` | list[string] | 核心业务关键词，辅助关键词检索 |
| `answer` | string / rich text | 对应的答案 |
| `enabled` | bool | 是否启用，方便临时下线 |
| `priority` | int | 优先级，相关性相同时高优先排前 |
| `created_at` / `updated_at` | datetime | 维护时间 |

### 设计要点

- **别名归同一 ID**：「怎么订位」和「可以预订吗」都应指向「如何预约座位？」，避免推荐列表出现重复答案。
- **保留否定词和修饰信息**：「如何预约？」和「如何**取消**预约？」只差一个词，意图完全不同。「不」「取消」「退」以及数量、日期、规格等词不能在预处理时丢掉。
- **一个问题对应一个明确意图**：不要把「在哪里」和「几点开门」合并成「基本信息」，颗粒度太粗会让推荐结果含糊。
- **定期清理合并**：运营积累后问题库会膨胀，定期排查语义重复的条目。

## 中文文本预处理

### 基础规范化

```python
import re
import unicodedata

def normalize(text: str) -> str:
    """统一全半角、去多余空白、转小写。"""
    text = unicodedata.normalize("NFKC", text)  # 全角转半角
    text = text.lower()
    text = re.sub(r"\s+", " ", text).strip()
    return text
```

### 分词

对 BM25、TF-IDF 等需要分词的方法，中文必须先切词。常用工具：

| 工具 | 特点 |
|---|---|
| jieba | 最常用，支持自定义词典，适合大多数场景 |
| pkuseg | 北大出品，多领域模型，准确率较高 |
| LAC（百度） | 分词 + 词性标注 + 实体识别一体 |

```python
import jieba

jieba.load_userdict("custom_dict.txt")  # 业务自定义词典

def tokenize(text: str) -> list[str]:
    words = jieba.lcut(normalize(text))
    return [w for w in words if w.strip() and not re.match(r"^\W+$", w)]
```

> **踩坑**：业务专有名词容易被切碎——「宫保鸡丁」可能变成「宫保 / 鸡 / 丁」。务必维护自定义词典。

### 停用词策略

- 关键词检索（BM25）场景下，去掉「的」「了」「吗」等虚词通常有益。
- **不要删除否定词**（不、没、别、未、无），它们直接影响意图。
- 语义向量模型自带 tokenizer，一般不需要额外去停用词。

## 匹配方法总览

| 方法               | Python 工具                 | 擅长          | 局限                  |
| ---------------- | ------------------------- | ----------- | ------------------- |
| 精确匹配 / 别名词典      | Python 字典、数据库             | 高频固定说法，零延迟  | 覆盖率取决于别名维护          |
| 字符串模糊匹配          | `difflib`、`RapidFuzz`     | 错别字、漏字、多字   | 只比字面，不懂语义           |
| Jaccard 相似度      | Python 集合运算               | 实现极简，计算快    | 中文短句词少时区分度差；不考虑词频权重 |
| 字符 n-gram TF-IDF | scikit-learn              | 不必分词，对错字有容忍 | 语义理解有限              |
| BM25 关键词检索       | rank-bm25 / Elasticsearch | 关键词权重实用     | 中文需先分词；不擅长改写表达      |
| 语义向量检索           | Sentence Transformers     | 不同说法相近意思    | 需要模型；分数非概率          |
| Cross-Encoder 重排 | Sentence Transformers     | 精细相关性判断     | 逐对计算，只适合重排少量候选      |

> 关于 TF-IDF 的原理可参考 [词袋法与 TF-IDF](./词袋法与TF-IDF.md)；向量数据库的选型思路可参考 [什么是向量数据库](./什么是向量数据库.md)；语义向量模型背后的 Transformer 架构可参考 [Seq2Seq、Attention 到 Transformer：NLP 架构演进](./Seq2Seq-Attention-Transformer-NLP-架构演进.md)。

### 1. 精确匹配 / 别名词典

把标准问题和所有别名建成查找表，规范化后直接查表。

```python
alias_index: dict[str, int] = {}
for faq in faqs:
    alias_index[normalize(faq["standard_question"])] = faq["id"]
    for alias in faq["aliases"]:
        alias_index[normalize(alias)] = faq["id"]

def exact_match(user_input: str) -> int | None:
    return alias_index.get(normalize(user_input))
```

精确匹配通常作为**第一优先级快速通道**：命中就直接返回，跳过后续检索。

### 2. 字符串模糊匹配

当用户输入有错别字或漏字时，精确匹配失效，模糊匹配通过字符级相似度来容忍偏差。

**RapidFuzz** 底层 C++ 实现，批量比较比 `difflib` 快 10 倍以上：

```python
from rapidfuzz import fuzz, process

choices = {}
for faq in faqs:
    for text in [faq["standard_question"]] + faq["aliases"]:
        choices[normalize(text)] = faq["id"]

def fuzzy_match(user_input: str, top_k: int = 5, threshold: float = 60.0):
    query = normalize(user_input)
    results = process.extract(
        query, choices.keys(),
        scorer=fuzz.token_sort_ratio,
        limit=top_k * 2,
    )
    seen = {}
    for text, score, _ in results:
        faq_id = choices[text]
        if score >= threshold and (faq_id not in seen or score > seen[faq_id]):
            seen[faq_id] = score
    return sorted(seen.items(), key=lambda x: x[1], reverse=True)[:top_k]
```

> **scorer 选择**：`ratio` 对语序敏感；`token_sort_ratio` 先排序再比较，适合语序不同但内容相同；`partial_ratio` 适合用户输入是问题的一部分。中文 FAQ 建议先试 `token_sort_ratio`。

### 3. Jaccard 相似度

Jaccard 是最朴素的集合相似度：把两段文本分词后当作集合，算交集与并集的比值。

$$
J(A, B) = \frac{|A \cap B|}{|A \cup B|}
$$

```python
def jaccard_similarity(text_a: str, text_b: str) -> float:
    set_a = set(tokenize(text_a))
    set_b = set(tokenize(text_b))
    if not set_a or not set_b:
        return 0.0
    return len(set_a & set_b) / len(set_a | set_b)
```

**在 FAQ 场景中好用吗？**——大多数情况下**不是首选**，原因如下：

- **中文短句词少，区分度差**：「如何预约座位」分词后只有 3~4 个词，交集差一个词 Jaccard 就会从 0.75 跳到 0.5，波动剧烈。
- **不考虑词频权重**：BM25 和 TF-IDF 会给稀有词更高权重（比如「取消」比「如何」更有区分力），Jaccard 把所有词一视同仁。
- **不考虑语序**：「退订后重新预约」和「预约后取消退订」的 Jaccard 可能一样高。

**什么时候可以用**：

- 作为**轻量级预筛**——在几百条规模下，先用 Jaccard 过滤掉完全不沾边的候选（比如 Jaccard = 0），减少后续模糊匹配或向量检索的计算量。
- 和分词质量强相关——如果你的分词足够好且别名覆盖充分，Jaccard 在小词库上的效果不会太差。
- 适合做**数据去重**——判断两条 FAQ 是否重复时，Jaccard 比语义向量更直观可控。

总结：Jaccard 实现简单、速度快，但在 FAQ 匹配的核心排序环节，效果通常不如 RapidFuzz（考虑了字符级对齐）和 BM25（考虑了词频权重）。建议作为辅助手段而非主力。

### 4. 字符 n-gram TF-IDF

不分词，直接用字符级 2~4-gram 构建 TF-IDF 向量。关于 TF-IDF 的数学原理和 `TfidfVectorizer` 的参数细节，可参考 [词袋法与 TF-IDF](./词袋法与TF-IDF.md)。

```python
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

corpus, faq_ids = [], []
for faq in faqs:
    for text in [faq["standard_question"]] + faq["aliases"]:
        corpus.append(normalize(text))
        faq_ids.append(faq["id"])

vectorizer = TfidfVectorizer(analyzer="char", ngram_range=(2, 4), max_features=10000)
tfidf_matrix = vectorizer.fit_transform(corpus)

def tfidf_search(user_input: str, top_k: int = 5):
    query_vec = vectorizer.transform([normalize(user_input)])
    scores = cosine_similarity(query_vec, tfidf_matrix).flatten()
    faq_scores = {}
    for idx in np.argsort(scores)[::-1]:
        fid = faq_ids[idx]
        if fid not in faq_scores:
            faq_scores[fid] = float(scores[idx])
        if len(faq_scores) >= top_k:
            break
    return list(faq_scores.items())
```

不依赖分词器、对错别字有容忍度，但完全不理解语义——「怎么订位」和「如何预约座位」字面重合度很低，TF-IDF 分数也低。

### 5. BM25 关键词检索

BM25 是搜索引擎经典排序算法，在用户输入含明确业务关键词时效果好。中文前提是**先分好词**。

```python
from rank_bm25 import BM25Okapi

tokenized_corpus = [tokenize(text) for text in corpus]
bm25 = BM25Okapi(tokenized_corpus)

def bm25_search(user_input: str, top_k: int = 5):
    scores = bm25.get_scores(tokenize(user_input))
    faq_scores = {}
    for idx in np.argsort(scores)[::-1]:
        fid = faq_ids[idx]
        if fid not in faq_scores:
            faq_scores[fid] = float(scores[idx])
        if len(faq_scores) >= top_k:
            break
    return list(faq_scores.items())
```

> 小规模用 `rank-bm25`（纯 Python）；大规模或高并发场景用 Elasticsearch / OpenSearch，它们内置中文分词插件（如 ik_analyzer）和高效倒排索引。

### 6. 语义向量检索

语义向量把文本映射到高维空间，语义相近的文本距离也近，从根本上解决了「同义不同形」问题。关于向量数据库的工作原理和选型，可参考 [什么是向量数据库](./什么是向量数据库.md)。

```python
from sentence_transformers import SentenceTransformer

# 常用中文模型：
#   shibing624/text2vec-base-chinese（轻量入门）
#   BAAI/bge-base-zh-v1.5（效果好，社区活跃）
#   BAAI/bge-large-zh-v1.5（更大更准）
model = SentenceTransformer("BAAI/bge-base-zh-v1.5")

corpus_embeddings = model.encode(
    [normalize(text) for text in corpus],
    normalize_embeddings=True,
    show_progress_bar=True,
)

def semantic_search(user_input: str, top_k: int = 5):
    query_emb = model.encode(normalize(user_input), normalize_embeddings=True)
    scores = corpus_embeddings @ query_emb  # 归一化后点积 = 余弦相似度
    faq_scores = {}
    for idx in np.argsort(scores)[::-1]:
        fid = faq_ids[idx]
        if fid not in faq_scores:
            faq_scores[fid] = float(scores[idx])
        if len(faq_scores) >= top_k:
            break
    return list(faq_scores.items())
```

**向量存储选型**：

| 规模 | 建议 |
|---|---|
| < 1 万条 | NumPy 内存点积，毫秒级 |
| 1 万 ~ 100 万 | FAISS 本地部署，支持 GPU |
| > 100 万或分布式 | Milvus、Qdrant、Weaviate |

大多数 FAQ 场景（几百到几千条），NumPy 就够了。

### 7. Cross-Encoder 精排

前面的方法都是 Bi-Encoder（独立编码再算相似度）。Cross-Encoder 把 query 和 candidate 拼在一起送入模型，语义交互更充分，精度更高，但逐对计算，只适合对 **Top-10~20 候选**做精排。

```python
from sentence_transformers import CrossEncoder

reranker = CrossEncoder("BAAI/bge-reranker-base")

def rerank(user_input: str, candidates: list[dict], top_k: int = 3):
    if not candidates:
        return []
    pairs = [(user_input, c["text"]) for c in candidates]
    scores = reranker.predict(pairs)
    for i, c in enumerate(candidates):
        c["rerank_score"] = float(scores[i])
    return sorted(candidates, key=lambda x: x["rerank_score"], reverse=True)[:top_k]
```

## 不同规模怎么选

以下按**标准问题 + 别名合计的索引文本数**估算，仅作工程参考：

| 规模 | 建议方案 |
|---|---|
| 几十 ~ 几百条 | 别名规则 + RapidFuzz；`difflib` 适合原型。用户经常换说法时加语义向量，不必搭向量数据库 |
| 几百 ~ 几万条 | BM25 / 字符 TF-IDF + 语义向量双路召回，RRF 合并排名。向量可预计算放内存 |
| 几万条以上或高并发 | Elasticsearch 关键词 + Milvus 向量双路召回，Cross-Encoder 精排。先实测延迟和准确度 |

实际还要看别名数量、并发、硬件和用户改写程度。小词库逐条比较可能就够；变大后需实测，不按固定条数机械切换。

## 多路召回与 RRF 融合

生产系统很少只用单一方法，更常见的是**多路召回 + 融合排序**：

```
用户输入
  ├─ 精确匹配 ────────── 命中 → 直接返回
  │
  ├─ RapidFuzz ────────── 候选 A（字面排名）
  ├─ BM25 ──────────────── 候选 B（关键词排名）
  ├─ 语义向量 ───────────── 候选 C（语义排名）
  │
  └─ A + B + C → 去重 → RRF 融合 → Top-3
                                      │
                              （可选）Cross-Encoder 精排
```

### Reciprocal Rank Fusion

不同方法的分数量纲不同（BM25 可能 0~30，余弦 -1~1，RapidFuzz 0~100），直接相加没意义。RRF **只看排名不看分数**，简单有效：

$$
\text{RRF}(d) = \sum_{r \in R} \frac{1}{k + \text{rank}_r(d)}
$$

$R$ 是所有检索通道，$\text{rank}_r(d)$ 是文档在第 $r$ 通道的排名（从 1 开始），$k$ 通常取 60。

```python
def reciprocal_rank_fusion(*ranked_lists: list[list[int]], k: int = 60):
    rrf_scores: dict[int, float] = {}
    for ranked in ranked_lists:
        for rank, faq_id in enumerate(ranked, start=1):
            rrf_scores[faq_id] = rrf_scores.get(faq_id, 0) + 1 / (k + rank)
    return sorted(rrf_scores.items(), key=lambda x: x[1], reverse=True)
```

RRF 不需要归一化或调权重，实践中效果常优于精心调参的加权求和。

## 完整检索流程

```python
def faq_search(user_input: str, top_k: int = 3):
    # 1. 精确匹配
    exact_id = exact_match(user_input)
    if exact_id is not None:
        return [exact_id]

    # 2. 多路召回
    fuzzy_ranked  = [fid for fid, _ in fuzzy_match(user_input, top_k=10)]
    bm25_ranked   = [fid for fid, _ in bm25_search(user_input, top_k=10)]
    semant_ranked = [fid for fid, _ in semantic_search(user_input, top_k=10)]

    # 3. RRF 融合
    fused = reciprocal_rank_fusion(fuzzy_ranked, bm25_ranked, semant_ranked)

    # 4.（可选）Cross-Encoder 精排
    top_candidates = [
        {"faq_id": fid, "text": get_faq_text(fid), "score": s}
        for fid, s in fused[:15]
    ]
    reranked = rerank(user_input, top_candidates, top_k=top_k)
    return [c["faq_id"] for c in reranked]
```

**检索步骤小结**：

1. **规范化输入**：统一大小写、全半角、空白。保留否定词和数字。
2. **精确匹配**：命中直接返回。
3. **多路召回**：字面 + 关键词 + 语义并行检索。
4. **去重融合**：按 FAQ ID 合并别名结果，RRF 融合排名。
5. **精排（可选）**：Top-10~15 候选用 Cross-Encoder 重排。
6. **阈值判定**：分数不够就澄清或转人工。
7. **日志闭环**：记录点击、未点击和人工纠正，持续优化。

## `difflib` 小词库示例

最简单的原型方案——对每个标准问题及其别名算字符串匹配分，取最高分：

```python
from difflib import SequenceMatcher

faqs = [
    {"question": "餐厅营业时间是什么？", "aliases": ["几点开门", "几点关门", "你们营业到几点"]},
    {"question": "如何预约座位？",     "aliases": ["怎么订位", "我想订桌", "可以预订吗"]},
    {"question": "如何取消预约？",     "aliases": ["取消订位", "我不去了怎么取消", "怎么退订"]},
]

def normalize(text: str) -> str:
    return "".join(text.lower().split())

def suggest(user_text: str, top_k: int = 3):
    query = normalize(user_text)
    results = []
    for faq in faqs:
        candidates = [faq["question"], *faq["aliases"]]
        score = max(
            SequenceMatcher(None, query, normalize(c), autojunk=False).ratio()
            for c in candidates
        )
        results.append({"question": faq["question"], "score": score})
    return sorted(results, key=lambda x: x["score"], reverse=True)[:top_k]

print(suggest("我想改订位"))
# [{'question': '如何预约座位？', 'score': 0.67},
#  {'question': '如何取消预约？', 'score': 0.50},
#  {'question': '餐厅营业时间是什么？', 'score': 0.22}]
```

> 代码总是会排出结果，但这些结果可能**都不相关**。生产环境必须根据实际样本设定最低接受阈值；分数不够时请用户补充说明。

## 常见踩坑

### 否定词混淆

「如何预约？」和「如何取消预约？」字面相似度很高，但意图完全不同。

- 字面匹配（difflib / RapidFuzz）天然会给高分——大部分字符重合。
- BM25 如果「取消」在别名中有合理 IDF 权重，能区分。
- 语义向量大多数模型能区分，但不保证——测试时务必用否定词对验证。

**建议**：维护一份否定词触发映射——检测到「取消」「退」「不要」时，优先匹配含对应否定语义的 FAQ。

### 短 query

用户只输入一两个字（「退款」「地址」「wifi」）时：

- 语义向量区分度下降（短文本向量表示不够丰富）。
- BM25 反而更好——关键词命中就是强信号。
- 可以对短 query 加大 BM25 通道的权重。

### 同义词 / 口语

「打折」「优惠」「活动」「便宜点」可能都指同一个 FAQ。

1. 别名尽量覆盖。
2. 语义向量天然擅长处理。
3. 维护同义词词典，分词后做扩展（对 BM25 有帮助）。

### 分数膨胀

问题库很小时（比如只有 10 条），任何输入都会在某个问题上得到相对高分。系统「过度自信」——总是推荐，且分数看起来都不低。

**解决**：不只看绝对分数，还要看 **Top-1 和 Top-2 的分数差距**（score gap）。差距小且分数都不高，说明系统不确定，应触发澄清。

## 效果评估

| 指标 | 含义 | 计算 |
|---|---|---|
| Hit@K | 正确答案出现在 Top-K 中的比例 | 命中样本数 / 总样本数 |
| MRR | 正确答案排名倒数的均值 | $\frac{1}{N}\sum\frac{1}{\text{rank}_i}$ |
| Precision@K | Top-K 中相关结果的比例 | 相关数 / K |
| 无匹配率 | 系统返回「无法匹配」的频率 | 无匹配次数 / 总查询数 |
| 误推荐率 | 推荐了但用户没选任何一个 | 未点击次数 / 推荐次数 |

**评估集构建**：收集真实用户日志 → 人工标注每条输入对应的正确 FAQ ID（可标「无匹配」）→ 至少 200~500 条 → 重点关注 Hit@3。

> 相似度分数不是概率，不同算法的分数不能直接比较。「超过 0.8 就匹配」没有通用标准，必须用自己的数据标定阈值。

## 餐厅客服落地建议

### 首版意图覆盖

- **基本信息**：营业时间、地址交通、联系方式、停车
- **预约相关**：预约座位、修改预约、取消预约、包间
- **菜单价格**：菜单查看、推荐菜品、套餐价格、时令菜
- **饮食需求**：过敏原、素食 / 清真、儿童餐
- **支付发票**：支付方式、开发票、团购 / 优惠券
- **配送取餐**：外卖范围、自取流程、配送时间

### 迭代路线

```
V1：MySQL + 精确匹配 + RapidFuzz
    ↓ 收集日志，发现模糊匹配覆盖不足
V2：+ BM25（jieba 分词）+ 语义向量（bge-base-zh）+ RRF
    ↓ 效果提升但部分 case 排序不准
V3：+ Cross-Encoder 精排 + 评估体系 + A/B 测试
    ↓ 数据量或并发上升
V4：Elasticsearch + Milvus + 在线学习
```

## 参考文档

- Python `difflib`：https://docs.python.org/3/library/difflib.html
- RapidFuzz：https://rapidfuzz.github.io/RapidFuzz/Usage/process.html
- scikit-learn `TfidfVectorizer`：https://scikit-learn.org/stable/modules/generated/sklearn.feature_extraction.text.TfidfVectorizer.html
- Sentence Transformers 语义相似度：https://sbert.net/docs/sentence_transformer/usage/semantic_textual_similarity.html
- Sentence Transformers 检索与重排：https://www.sbert.net/examples/sentence_transformer/applications/retrieve_rerank/README.html
- BAAI/bge 系列模型：https://huggingface.co/BAAI/bge-base-zh-v1.5
- rank-bm25：https://github.com/dorianbrown/rank_bm25
- jieba 分词：https://github.com/fxsjy/jieba
- FAISS 向量检索：https://github.com/facebookresearch/faiss
- Milvus 向量数据库：https://milvus.io/docs
