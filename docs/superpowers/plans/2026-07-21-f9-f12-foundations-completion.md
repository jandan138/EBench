# Part F 补完：f-9 ~ f-12（hidden state 主线 / 训练全程 / VLA 读取 / Adapter·LoRA）

**Goal:** 回答读者（已理解 Token/Embedding/Attention/QKV/MLP/GELU/LayerNorm/Residual 基础组件）在整体训练逻辑、任务输出、VLA 结构上的 30 个问题（见用户整理清单）。教学风格：**宝宝式教学**——来龙去脉清晰、一条主线贯穿、通俗且系统。

**Architecture:** 在 Part F 末尾（f-8 之后）新增 4 节，每节一个主题，沿用本书既有骨架（`_template.html` / f-3 黄金参考）。新增 2 个 widget。现有章节只做「只加不减」的交叉链接。TDD：先写内容契约测试（node:test），再写章节，再跑全量测试。

**Tech Stack:** 静态 HTML + book.css + vanilla JS/EBWidgets + KaTeX 0.16.9 + node:test。

## 问题 → 章节映射（30 问全覆盖）

| 新节 | 覆盖问题 | 已有覆盖（不重复写，只做链接） |
|---|---|---|
| f-9 Hidden state 才是产品 | Q1, Q2, Q3, Q30 | — |
| f-10 一次训练更新了什么 | Q12, Q14, Q17, Q19, Q20, Q21 | f-3（block 主线 Q15/16/18） |
| f-11 VLA 怎么读 hidden state | Q22, Q23, Q24, Q25, Q26 | 5-7（action expert 结构） |
| f-12 Adapter 与 LoRA | Q27, Q28, Q29 | 5b-5（KI 梯度）、6-2（X-VLA PEFT） |
| （已有，仅补链接/小段） | Q4-Q11, Q13, Q15-18 | f-2-25 / f-2-5 / f-2-6 / f-3 |

Q11 末尾「为什么出现 SiLU/SwiGLU」：在 f-2-6 末尾追加一个小节（addendum），不开新节。

## 章节大纲

### f-9 `f-9-hidden-state-product.html` —「Hidden state 才是产品：Transformer 到底在优化什么」
主线一句话：**Transformer 不直接产出答案，它产出的是一排被上下文充实过的 hidden states；任务头才是读答案的人。**
- `factory`：工厂比喻——进料 token，出货 hidden state 矩阵；答案由「任务头」这台读表器读出
- `each-token-own`：每个 token 都有自己的最终 hidden state；H 是 `[B,n,d]` 矩阵不是单向量（答 Q2）
- `why-context-inside`：为什么一行能装下整句信息——每一层 Attention 都在「抄同桌作业」（答 Q2 第三问，链接 f-2）
- `four-heads`：同一骨干四种读法——GPT 读最后位置→LM head；BERT 读 CLS/masked 位置；VLM 读多模态行→text head；VLA 读多模态行→action head（答 Q1/Q3）
- widget **`task-head-switcher`**：同一份 toy H（6 行 token），四个按钮切换 GPT/BERT/VLM/VLA，高亮被读取的行并显示各自输出
- `mainline`：收束到 Q30 的全链图（Image+Language+State→Embedding→Blocks→Multimodal H→Task Head→输出），预告 f-10

### f-10 `f-10-training-loop.html` —「一次训练更新了什么：参数清单与 backprop 全程」
主线一句话：**训练就是「猜 → 量差距 → 沿梯度回头改每一个可学参数」，而残差和 LayerNorm 是让这条回头路在 100 层后仍然走得通的设计。**
- `param-inventory`：可学参数清单表（Embedding 表 / WQ,WK,WV,WO / W1,b1,W2,b2 / 每套 LN 的 γ,β / task head）vs 固定公式（softmax、LN 的 μ/σ 计算、residual 加法、mask 规则）（答 Q20）
- `one-step`：一次训练循环五步走（forward→预测→loss→backprop→optimizer 更新），用 toy 数字走一小步（答 Q21）
- `what-is-gradient`：梯度是什么 + 链式法则直觉；`0.1^100` 为什么前面层学不到（答 Q17 前两问）
- `highway`：residual 的 `I+J_F` 直通路，为什么 `y=x+F(x)` 比 `y=F(x)` 好训（答 Q17 第三问，承接 f-3 optional 小节并讲透）
- `why-two-ln`：为什么一个 block 里两套 LN、参数独立——Attention 输出已改变分布，MLP 需要针对新分布的归一化（答 Q14）
- `pre-vs-post-norm`：pre-norm 为什么深网好训——residual 通道从输入到输出不被 LN 打断，梯度直通（答 Q19）；Q12（没有 LN 会怎样）在本节开头作为动机
- `swiglu-pointer`：一句话指向 f-2-6 新增 addendum

### f-11 `f-11-vla-reads-hidden.html` —「VLA 怎么读 hidden state：从最后一个 token 到 Action Expert」
主线一句话：**GPT 的答案浓缩在一个位置，机器人的答案散落在整个场景里——所以 VLA 不能只读最后一个 token。**
- `h-context-matrix`：H_context 是 `[B,n,d]` 矩阵（n=图像 patch+文字+state+action token），不是单向量（答 Q23）
- `what-fusion-means`：「融合」= 这些 token 在同一个 attention 里互相可见，每行都带上跨模态信息（答 Q24）
- `read-strategies`：读取策略分类学——last-token(GPT) / CLS(BERT) / pooling / 新 query token + cross-attention / action token 进序列共享 attention（π0 系 action expert）（答 Q25）
- `why-not-last-token`：为什么机器人不能只读最后一个 token——「杯子在哪、哪只手够得到、关节现在什么角度」分散在几百个视觉 token 与 state token 里；GPT 的答案是「下一个词」，天然由因果 mask 汇总到最后位置（答 Q26）
- `pi05-wiring`：π0/π0.5 的 action expert 接法通用机制：image/text/state 走 backbone、action token 走 expert 权重、共享一次 attention（链接 5-7 与 moe-attention widget，不引入新论文细节）（答 Q22）

### f-12 `f-12-adapter-lora.html` —「Adapter 与 LoRA：冻结 backbone 时梯度怎么走」
主线一句话：**冻结不是断路——前向照走、梯度照穿，只是 optimizer 不更新被冻的参数；Adapter 和 LoRA 是在 frozen 主干旁开的「可学旁路」。**
- `why-freeze`：为什么不全量微调（显存/算力、灾难性遗忘、一份主干服务多任务）
- `adapter`：Adapter = bottleneck 小网络（降维→激活→升维），`out = F(x) + Adapter(x)` 加在子层之后（答 Q27）
- `lora`：LoRA = 冻结 W，学低秩 ΔW=BA，`(W+BA)x`；秩 r 控制容量；为什么低秩有效（任务需要的修改通常远低于全秩）（答 Q28）
- `gradient-path`：冻结时 loss 的梯度如何穿过 frozen 层到达 LoRA/Adapter/Head（frozen 层要算梯度用于传播，只是不更新）（答 Q29）
- widget **`peft-gradient`**：类 ki-gradient 的计算图，切换 全量微调/Adapter/LoRA 三档，看哪些模块亮（可学）、梯度路径怎么走
- `landscape`：PEFT 地图——Adapter/LoRA/soft prompt(→6-2 X-VLA)/KI(→5b-5) 各是什么关系

### f-2-6 addendum（Q11 末尾）
- 新小节 `silu-swiglu`：SiLU = x·sigmoid(x)；SwiGLU = 门控 MLP（两个线性分支相乘）；为什么现代模型爱用——平滑门控 + 多一组可学「阀门」，与 f-3 变体表呼应

## 交叉链接（只加不减）
- f-3 `#training-heads` 末尾 → f-9；`#residual-gradient` 末尾 → f-10
- 5-7 action-expert 结尾 → f-11
- 5b-5 ki-gradient 结尾 → f-12；6-2 xvla（PEFT ~9M 处）→ f-12
- 各新节开头 callout 标注前置章节（f-3/f-4/5-7）

## Widget 接口（沿用 EBWidgets 模式）
- `task-head-switcher.js`：注册 `EBWidgets["task-head-switcher"]`；6 行 toy token（我/喜欢/苹果 或 image×3/text×2/state），4 档 seg 控制（GPT/BERT/VLM/VLA）；每档高亮被读行 + 显示 head 名称 + 输出示例；静态正文先行，no-JS 可读
- `peft-gradient.js`：注册 `EBWidgets["peft-gradient"]`；节点图（input→frozen backbone→head→loss），seg 三档（全量/Adapter/LoRA）；可学模块高亮、梯度虚线动画；遵守 `EBW.reduced`
- 两个文件都在章节底部 script 块单独加载（registry.js 之后、book.js 之前），不改 book.js / registry.js 逻辑之外的文件

## content.js
Part F `sections` 末尾（f-8 之后）追加 f-9~f-12 四条 `{id,title,file,keywords}`；keywords 覆盖用户问题里的高频词（hidden state 任务头 训练 参数 反向传播 梯度 lora adapter action expert 读取）。

## 测试（TDD，先红后绿）
- 新增 `learn/tests/f-9-to-f-12-content.test.mjs`：逐节断言 h2 id 齐全、主线句存在、widget `data-widget` 与 script 加载顺序、交叉链接 href 正确、content.js 四条注册且顺序在 f-8 后
- 新增 `learn/tests/f-9-f-12-widgets.test.mjs`：断言两 widget 注册名、seg 档位、reduced-motion 遵守
- 更新 `foundations-navigation-integrity.test.mjs` / `foundations-story-arc.test.mjs`：它们硬编码了 `["f-2","f-2-25","f-2-5","f-2-6","f-3"]` id 列表——检查断言语义，只追加不破坏（这两个文件枚举的是 attention 子链，不一定包含 f-4~f-8；先读再定）
- 运行：`cd learn && node --test tests/`

## 风格约束（宝宝式教学）
- 每节一个比喻主线贯穿（工厂/读表器、回头路/高速公路、散落答案、可学旁路）
- 每节开头 `lede` + 前置提示 callout；结尾收束 + 预告下一节
- 每个概念先「是什么/为什么需要」再公式；公式只放关键行
- 诚实标注：机制性表述不夸大（如 residual 不保证信息不丢失，沿用 f-3 口径）
- 中文叙述、英文术语 `<span class="term">`；每 `<h2>` 唯一 id；静态正文先于 widget
- **宝宝式 = 一条主线 + 先为什么后公式，但保留术语密度与 bridge 盒**（对齐 0-1/f-3 语气，不低幼化）；f-10 至少两座桥（RL：梯度链 ↔ semi-gradient TD/target network；G103：伴随法/数值积分沿轨迹反传），f-12 至少一座桥

---

# 三方审核修订（2026-07-21，已汇总架构/完整性/风险三份报告）

## 事实修正（动笔前必须）
1. **f-11 路由口径**：image/text → backbone 权重；**state/action → action expert 权重**；共享一次 attention（对齐 _AGENT_BRIEF:152，state 属 expert 侧）。
2. **f-12 的 KI 定位**：KI 不是 PEFT 也不是冻结。`landscape` 三分类：全量微调 / PEFT（冻结主干+可学旁路：Adapter/LoRA/soft prompt）/ KI（stop-gradient，非冻结非 PEFT）；沿用 6-2「软隔离 vs 硬冻结」口径；`gradient-path` 显式区分「冻结=梯度穿透但不更新」vs「stop-gradient=梯度截断」，链接 `5b-5-ki-gradient.html#not-freezing`。

## 结构修订
3. **f-10 内部顺序**（先定义后使用）：`param-inventory` → `what-is-gradient`（梯度是什么+链式法则+0.1^100）→ `one-step`（五步循环，loss 处链接 f-5/f-6）→ `highway` → `why-ln`（Q12 独立 h2：没有 LN 会怎样）→ `why-two-ln`（Q14）→ `pre-vs-post-norm`（Q19）。
4. **f-9 与 f-3 去重**：f-3 四行表保留为速览并在表下加「逐个拆见 f-9」；f-9 `four-heads` 不解释「什么是任务头」，直接讲「为什么各自读那个位置」（因果 mask 与信息汇聚的关系）。f-9 lede 显式承认「回到 Transformer 主线，f-5~f-8 的 loss 知识 f-10 会用上」。
5. **Q30 分两段收束**：f-9 `mainline` 只画**推理链**（输入→H→head→输出）；**f-12 末尾放完整收束图**（挂上训练回路与可学旁路）。
6. **f-11 收窄为通用读取策略课**：删除 `pi05-wiring` 深节；Q22 给 2-3 句当场最小答案（用修正后的路由口径）+ 链接 5-7 `#action-expert`/`#shared-attention` 作 further reading；前置只标 f-3/f-4。
7. **f-10 的 LN/残差只讲训练视角**（梯度路径、分布漂移、深网优化），结构与轴向细节一律链接 f-3，不重新推导；`highway` 一句话承接 f-3 `#residual-gradient` 的 I+J_F 后直奔消失直觉。
8. **f-12 定位**：节首 callout 标明「进阶可选：理解 5b-5/6-2 的旁路视角」（LoRA/Adapter 不被本书 baseline 直接使用）。

## 测试与 CI（阻断项）
9. `learn/tests/foundations-navigation-integrity.test.mjs:27` 与 `foundations-story-arc.test.mjs:94` 的 `flat.length === 64` → **68**（两处）。
10. `.github/workflows/deploy-learning-site.yml`：verify step 加入 2 个新测试文件；`node --check` 清单加入 2 个新 widget。
11. 新测试：`learn/tests/f-9-to-f-12-content.test.mjs`（h2 id、主线句、data-widget、script 加载顺序、交叉链接 href+fragment、content.js 注册与顺序）；`learn/tests/f-9-f-12-widgets.test.mjs`（注册名、seg 档位、EBW.reduced）。

## 小编辑清单（只加不减）
12. **f-8 recap 改写**：「Part F 地基铺完了」段改为 hand off 到 f-9（否则 prose 与自动「下一页」按钮矛盾）。
13. **f-2-25 `#gpu-view`**：补 1-2 句显式等价性论证（大 W_Q 切出第 r 段 ≡ 小 W_Q^(r)，逐位相同）（Q5 薄弱点）。
14. **f-2-5 `#shared-mlp`**：补一小段「为什么共享而不是每位置一套参数」（参数效率、position-wise 本质）（Q8 薄弱点）。
15. **f-2-6 addendum `silu-swiglu`**：插在 `training-gates` 之后、`checkpoint` 之前。
16. **f-3**：`#training-heads` 表下加 → f-9；`#residual-gradient` 末尾加 → f-10；`#layernorm` 与 `#variants` 各加 → f-10 对应锚点。
17. **5-7 结尾** → f-11（further reading 回看基础口径）；**5b-5 结尾** → f-12；**6-2 `#two-stage`** → f-12。
18. **链接方向约定**：Part F 侧 = 前置/背景引用；Part 5/5.5/6 侧 = further reading 回看基础，文案区分，避免回环。已核实 fragment：`5-7#action-expert`、`5-7#shared-attention`、`5b-5#not-freezing`、`5b-5#two-graphs`、`6-2#two-stage`。

## 文档收尾
19. `DESIGN.md`：节数 63→68、widget 清单 +2；`_AGENT_BRIEF.md`：「Part F（8 节）」→「12 节」、widget 清单 +2 条（标注用于 f-9/f-12）。
