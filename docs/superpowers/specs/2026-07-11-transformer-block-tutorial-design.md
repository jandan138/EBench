# Transformer Block 教程补强设计

## 背景

F-2 已经解释了 Attention 如何通过 Q/K/V 收集上下文，但现有 F-3 只用少量段落带过 MLP、Residual 和 LayerNorm，而且流程文字近似 post-norm、公式却使用 pre-norm。读者因此无法回答三个基础问题：Attention 收集信息后为什么还要计算、原 hidden state 如何穿过多层、数值为何能保持可训练。

本次只重构 F-3，不扩展 Part F 的章节数量，不重复 F-2 的 Q/K/V 手算，也不重讲 F-4 的输入 token 化。

## 教学目标

章节必须让初学者形成并能复述这条主线：

> Attention 负责通信；MLP 负责每个位置上的非线性计算；Residual 提供原表示与增量更新的直接路径；LayerNorm 稳定进入计算分支的数值；多个 Block 反复更新 hidden state，最后由任务头读取。

“通信、计算、传递、稳定”是教学分工，不是模块能力的绝对边界。正文必须同时给直觉、最小数学和限制条件，避免用拟人化代替机制。

## 章节结构

1. `#attention-params`：从 F-2 接棒，明确 Attention 输出不是完整 Block，直接接预测头在结构上可行，但标准 Transformer 用 MLP 增加逐位置非线性计算能力。
2. `#mainline`：给出四个模块的职责总览和 `[B,n,d] -> [B,n,d]` 形状不变量，只展示无公式路线图。
3. `#mlp`：解释 MLP/FFN 的目的、共享范围和 GPU 视角。
4. `#shared-mlp`：用“同一个函数、不同输入”例子解释不同 token 输出不同；补充相同输入在确定性推理时得到相同输出。
5. `#mlp-expressivity`：解释 `Linear -> GELU -> Linear`，指出没有 GELU 时两个 affine map 会合并成一个 affine map；不宣称单个神经元对应固定语法概念。
6. `#residual-ln`：用静态旁路图先解释 `y=x+F(x)`，再定义 Delta；明确 Delta 不保证很小或可解释。
7. `#residual-gradient`：分开解释前向 identity path 和反向的 `I + J_F`，不承诺梯度永不消失、抵消或爆炸。
8. `#layernorm`：说明激活尺度漂移、饱和、loss spike、NaN 和学习率敏感等训练风险。
9. `#layernorm-axis`：对 `[B,n,d]` 的每个 `(b,i)` 独立沿最后的 `d` 维归一化，并给数值例子。
10. `#layernorm-semantics`：明确 LayerNorm 非可逆，会移除每行均值和尺度；说明相对 feature pattern、可学习 `gamma/beta` 和 pre-norm residual stream 如何缓解影响。
11. `#full-flow`：最后才组装精确 pre-norm 公式，使用两个独立的 `LN_1/LN_2`，并把 `W_O` 归入 Attention 分支。
12. `#block-trace`：交互图用四个视角追踪同一组 toy hidden states。
13. `#variants`：简短区分原始 post-norm、现代 pre-norm、RMSNorm 和 SwiGLU；不展开为第二套主教程。
14. `#deep-stack`：解释深度是迭代 refinement，不给特定层强行指定固定语义；不同 Block 通常有不同参数。
15. `#training-heads`：解释 loss 如何联合塑造 trainable 参数，以及 GPT、BERT、VLM、VLA 的不同输出头。
16. `#checkpoint` 与 `#recap`：逐项检查误解并重复主线。

保留 F-2 已引用的 `#attention-params`、`#mlp`、`#residual-ln`、`#full-flow`，不修改 F-2。

## 十五问追踪

| 问题 | 正文落点 | 必须出现的边界 |
| --- | --- | --- |
| 1 | `#attention-params`, `#mlp` | Attention 后可直接预测；MLP 是能力和优化选择，不是逻辑必要条件。 |
| 2 | `#mlp`, `#shared-mlp` | MLP 处理的是 contextual hidden state，不是按 token 名称分配人工任务。 |
| 3 | `#mlp-expressivity` | 学到 feature detector 与 update direction 是直觉，不等于人工可命名规则。 |
| 4 | `#shared-mlp` | 同层跨 batch/position 共享；不同层通常不共享；相同输入得到相同确定性输出。 |
| 5 | `#residual-ln` | identity route 不等于可逆或绝不丢信息。 |
| 6 | `#residual-ln` | `F(x)` 在加法中扮演 Delta，但不保证数值小。 |
| 7 | `#residual-ln`, `#block-trace` | 静态正文和交互图都画出绕过分支的路径。 |
| 8 | `#residual-gradient` | 前向表示路径与反向梯度路径分开讲。 |
| 9 | `#layernorm` | 具体描述尺度漂移和训练症状，不写成必然爆炸。 |
| 10 | `#layernorm-axis` | 只沿 `d`，不跨 `B` 或 `n`。 |
| 11 | `#layernorm-semantics` | LayerNorm 非可逆；pre-norm 的未归一化 residual route 仍在。 |
| 12 | `#full-flow` | `LN_1 -> Attention -> + -> LN_2 -> MLP -> +`。 |
| 13 | `#deep-stack` | 多层迭代 refinement，不固定指定某层一定学什么。 |
| 14 | `#training-heads` | 只更新 trainable 参数；冻结、adapter 和不同输出头均有例外。 |
| 15 | `#mainline`, `#full-flow`, `#recap` | 主线在开头、组装处和结尾各出现一次。 |

HTML 中相应标题使用 `data-answers` 标注问题编号，使自动测试可以确认 1 到 15 全覆盖而不绑定整句中文措辞。

## 数学约定

统一采用 row-vector 写法。输入 `H^ell` 的形状为 `[B,n,d]`。

```text
MLP(X)_{b,i,:} = GELU(X_{b,i,:} W_1 + b_1) W_2 + b_2
W_1 in R^{d x d_ff}, W_2 in R^{d_ff x d}

A^ell = H^ell + Attn^ell(LN_1^ell(H^ell))
H^{ell+1} = A^ell + MLP^ell(LN_2^ell(A^ell))
```

LayerNorm 对每个 `X[b,i,:]` 计算 mean 和 population variance，`gamma,beta in R^d` 在 batch 和 position 之间共享。`epsilon` 存在时归一化后的方差只近似为 1；经过 `gamma/beta` 后均值和方差不要求保持 0/1。

## 交互设计

页面沿用现有颜色、Newsreader/Inter/Noto Sans SC/JetBrains Mono 字体和 `.lab` 容器，不建立新视觉主题。

- 主色：`var(--accent)` 表示 residual stream。
- 交互色：`var(--interactive)` 表示当前计算分支。
- 警示色：`var(--warn)` 表示被移除的均值/尺度或限制条件。
- 表面色：`var(--surface)`、`var(--surface-2)` 保持书籍阅读感。

标志性元素是一条连续的 hidden-state 电路。四个按钮为“完整 Block”“MLP 共享”“Residual 旁路”“LayerNorm 轴”，所有视图复用“她 / 喜欢 / 苹果”三行 toy tensor、相同 shape 标签和颜色语义。

控件使用本地实现的 `type="button"`、`aria-pressed`、方向键/Home/End 导航和 `:focus-visible`。图形之外必须有等价文字，信息不能只靠颜色。桌面横向、窄屏纵向，320px 宽度不能造成 document overflow。无动画，天然兼容 reduced motion。

## 文件边界

- 修改 `learn/chapters/foundations/f-3-transformer-block.html`。
- 修改 `learn/content.js` 的 F-3 标题和关键词。
- 新增 `learn/assets/js/widgets/transformer-block-viz.js`。
- 在 `learn/assets/css/book.css` 中，widget 样式仅新增 `.transformer-block-viz` / `.tbv-*` 作用域样式；F-3 静态内容的窄屏适配仅新增以 `body[data-section="f-3"]` 开头、目标为 `.f3-*` 的页面作用域选择器。不得新增通用或全局选择器。
- 新增 `learn/tests/f-3-transformer-block-content.test.mjs`。
- 不修改 `learn/assets/js/book.js`、`registry.js`、F-2 或 F-4。

## 验证标准

1. Node 内容测试检查 15 问映射、唯一 ID、兼容锚点、章节顺序、核心公式/边界、metadata 和本地链接。
2. Task 2 先扩展测试使其因 widget 缺失而失败，再实现注册、脚本顺序、控件语义、widget scoped CSS，以及 F-3 静态表格的页面作用域窄屏 CSS。
3. 全量 JS 通过 `node --check`；全书本地链接和 fragment 可解析；`git diff --check` 通过。
4. Playwright 在 1440x900、834x1112、390x844、320x720 检查 light/dark、所有四个视图、键盘、懒加载、KaTeX、console/page/request errors、overflow 和裁切。
5. 独立 reviewer 按 15 问和数学约定复审，Critical/Important 问题全部修正后才能整合。

## 资料校准

数学边界依据原始 Transformer、Residual Learning、Layer Normalization、Pre-LN 分析和 FFN interpretability 的原始论文校准。正文把 interpretability 结果写成一种有用视角，不写成所有模型和神经元都满足的定理。
