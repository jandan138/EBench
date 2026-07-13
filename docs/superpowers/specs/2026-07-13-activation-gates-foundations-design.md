# F-2.5 激活门控基础升级设计

## 背景与判断

F-2.5 已经从零解释了函数、Linear、GELU、两层 MLP 和参数共享，F-3 也已经改为完整 Transformer Block 的组装课。但现有 F-2.5 仍把“较大的正数通过、较大的负数被压低”写成数值观察，没有建立其因果机制。初学者因此容易把数值符号误读成“有用/无用”“正确/错误”或固定的人类语义。

这不是在 F-3 末尾补一段 FAQ 能解决的缺口。它属于 MLP 的前置心智模型，必须升级 F-2.5 的中段教学结构；F-3 继续只负责 Attention、MLP、Residual、LayerNorm 的 Block 组装。

## 教学目标

读完升级后的 F-2.5，读者能够准确复述：

> 神经网络需要非线性和门控。ReLU 或 GELU 人为规定了对输入数值正负不对称的规则；正数没有天然更有价值。训练通过任务 loss 调整 W 和 b，让某些输入在某些通道上更容易落入该激活函数的通过区域，其他输入更容易落入被压低的区域。不同通道、后续权重和 residual stream 共同决定信息怎样继续流动。

正文以初学者为对象，只预设加减乘法。它必须区分直觉和机制：直觉可说“通道响应”，机制必须落到 `z = w^T x + b`、逐元素激活、loss 对参数的梯度和后续 Linear 的加权组合。

## 必须保持的数学边界

1. `z = w^T x + b` 是某个中间 feature 的 pre-activation。把 `w^T x` 叫“沿学习到的方向的带符号匹配分数”是近似直觉；只有忽略 b 并适当归一化 w 时，才可严格解释为几何投影。
2. `z > 0` 与 `z < 0` 只是激活函数输入落在零点两侧，不天然表示有用/无用、正确/错误、模式存在/不存在。把 `(w,b)` 同时变为 `(-w,-b)` 会把 z 变为 -z，但不会得到与原 ReLU 相同的函数，而是得到互补的门控；符号是模型可利用的坐标约定。
3. `ReLU(z) = max(0, z)` 给正半轴硬通过、负半轴归零。其核心功能是分段非线性；门控和稀疏输出是相关性质，不能混为“负数没有信息”。在 `z < 0` 处导数为 0；在 `z = 0` 处数学导数未定义，软件会选一个次梯度约定，教程不得把它误写成普通导数事实。
4. `GELU(z) = z Phi(z)` 是平滑的逐元素非线性，导数为 `Phi(z) + z phi(z)`。它总体保留较大的正值、压低较大的负值，但可输出少量负值；`x Phi(x)` 的概率式说法是一个推导/解释视角，不是运行时真的抽样或真的在估计“模式存在概率”。
5. 严格 ReLU 在 z < 0 的导数为 0。不能声称一个当前负值的 ReLU 单元必然由该同一个训练样本的直接梯度从 -1 推到正侧。训练数值轨迹使用 GELU；ReLU 另行说明 dead-unit 风险、其他激活样本可能更新参数，以及 Leaky ReLU 是常见替代。
6. bias 与 w 共同决定边界：`w^T x + b = 0`。一维的 `ReLU(x - 3)` 是 b = -3 把有效门槛移到 x > 3 的例子；在高维中，w 决定超平面方向，b 移动其位置。
7. 一个 ReLU 通道的负侧值在该通道输出中被清零，但不等于整网永久丢失相反方向的信息。令 `z = w^T x+b`，另一通道用 `(-w)^T x+(-b)=-z`，再以第二个 Linear 的系数 `+1,-1` 组合，即有 `z = ReLU(z) - ReLU(-z)`；这说明架构可以保留互补方向，不保证训练一定会学出这对通道。Transformer 的 pre-norm residual stream 也绕过 MLP 分支继续传递输入表示，但这不是整个模型可逆、也不保证绝不丢失信息。
8. GELU 的负输出之后仍可被第二个 Linear 的负权重乘出正贡献；负值不是“负面信息”。
9. “神经元检测某种模式”只能作为局部比喻。真实特征通常是分布式的，loss 间接决定参数更新，不是人工给单个维度分配猫、动词或宾语等固定含义。

## 章节结构

保留现有 `#start`、`#function`、`#scalar-linear`、`#vector-linear`、`#linear-boundaries` 和现有 `#mlp-trace` 之后的结构。将 `#gelu` 到 `#why-nonlinearity` 重构为以下连续台阶，并保留 `#gelu` 锚点以兼容链接：

1. `#preactivation`：从 hidden state、某条 Linear 输出 z、激活输出 a 三种对象开始。明确“被推向正侧”的是 z，不是 token 字符串，也不是整个 hidden state。
2. `#sign-is-not-meaning`：解释 z 的正负、学习方向、b、符号约定和“响应”一词的边界。用固定二维输入 `x=[1,1]`、权重矩阵 `[[1,-1,0.5,-2],[1.1,0.3,0.8,-1.2]]`、零 bias，经共享 `affine` helper 推导四条通道的 `[2.1, -0.7, 1.3, -3.2]`，而不是把这些数写成无来源字面量。
3. `#bias-threshold`：从 `ReLU(x-3)` 逐项算到一般的 `w^T x+b>0`。图示从一维门槛到高维分界面，不引入分类器以外的任务语义。
4. `#relu`：给出 ReLU 的硬门、分段非线性、门控、稀疏性和负区零梯度。给出“保留负侧”可通过 `ReLU(-z)` 配对实现的边界，避免宣称只翻 w 就与原函数相同。
5. `#gelu`：保留既有 GELU 数值表、曲线和精确定义，并补充与 ReLU 的逐项对比，概率式解释边界和负值可继续影响后续 Linear。
6. `#training-gates`：用标量 GELU 回归 toy 解释参数更新，不声称真实 MLP 单元有固定人类语义。固定 `x=1,target=1,w=-0.4,b=0,eta=0.5,L=0.5*(GELU(wx+b)-target)^2`，主轨迹的 z 为 `-0.400,-0.176,0.213,0.797,1.177`；显式给出 `dL/dz=(a-target)GELU'(z)`、`dL/dw=x*dL/dz`、`dL/db=dL/dz`，并说明因 x=1 才使两者数值相同。另一个独立 one-sample counterexample 固定 `target=0,w=0.8,b=0`，z 由 `0.800` 降向 `0.049`，说明不相关的正响应可被推向低响应区而不必变负。另设 ReLU 注意框，说明负区直接梯度为零和 dead ReLU。
7. `#negative-information`：用 `ReLU(z)-ReLU(-z)=z`、GELU 负输出乘以后续负权重、以及 residual stream 说明信息不会由“数值为负”自动失去意义。
8. `#why-nonlinearity`：保留已有“两次 affine 可合并”的证明，增加一句把 ReLU/GELU 的不对称门控与不可合并性连接起来。
9. `#mlp-trace`：沿用既有 2 -> 4 -> 2 手算，并在 GELU 后标明每个中间 feature 是通道数值而非命名语义。
10. `#checkpoint`：从九条扩为覆盖上述误解的检查清单；`#recap` 增加新的因果链并继续桥接 F-3。

## 交互设计

现有 `.mlp-basics-viz` 保持“一个向量经过两层 MLP”的手算职责，其中的 GELU slider 不承担符号、门槛或训练因果教学。新增一个轻量、可独立阅读的 `activation-gates-viz`，统一放在 `#negative-information` 之后：每个结论都先有静态段落与表格，再由互动复核。

它具有四个可访问视图，采用现有 `.lab` 容器和 scoped `.agv-*` CSS：

1. `channels`：显示由冻结 fixture 推导的同一 toy input 的四个 z 和每个通道的 ReLU/GELU 输出。明确每个 z 是一条 Linear 的 pre-activation。
2. `threshold`：一维 x、w、b 控件展示 `z=wx+b` 和 ReLU 的真实门槛；预置 `ReLU(x-3)`，同时覆盖 `w=0` 与负 w 的解释边界，不让读者误以为门槛永远等于输入 0。
3. `pair`：对比 z、ReLU(z)、ReLU(-z) 与 `ReLU(z)-ReLU(-z)`，解释互补检测器是可表达性例子而不是训练保证。
4. `training`：只展示两条彼此独立的 GELU one-sample toy trace 如何因 loss 驱动的参数更新而向不同响应区域移动；文字明确这是一维教学轨迹，不是训练每个通道的完整算法。

控件必须是 `type="button"` 或语义正确的 range input；四个视图用 `aria-pressed`、方向键、Home/End 和 `aria-live`。图形外有等价文本，颜色不作为唯一编码。桌面保持一张连续“门控电路”图；560px 以下改为单列，数值与公式可换行，document 不得横向溢出。

## 文件边界

- 修改 `learn/chapters/foundations/f-2-5-linear-gelu-mlp.html`：新增章节结构、静态数值例子、链接、可访问语义和对 F-3 的桥接。
- 修改 `learn/assets/js/widgets/mlp-basics-core.js`：仅当可复用的确定性 GELU/格式化/helper 不足时，导出纯数据和计算 helper；不把 DOM 渲染逻辑放入此文件。
- 新增 `learn/assets/js/widgets/activation-gates-viz.js`：注册 `EBWidgets["activation-gates-viz"]`，渲染四个视图并使用纯 helper。
- 修改 `learn/assets/css/book.css`：只新增 `.activation-gates-viz` / `.agv-*` 作用域样式；F-2.5 静态窄屏适配须以 `body[data-section="f-2-5"]` 开头。
- 修改 `learn/content.js`：更新 F-2.5 标题和关键词，使导航可检索 ReLU、pre-activation、bias、gate、dead ReLU、GELU。
- 修改 `learn/tests/f-2-5-mlp-basics-content.test.mjs`，新增 `learn/tests/activation-gates-viz.test.mjs`，扩展 `learn/tests/f-2-5-browser-audit.mjs`；以 Node verify workflow 阻止未经测试的 Pages 部署。
- 修改 `learn/chapters/foundations/f-3-transformer-block.html` 仅添加一条到 F-2.5 新主线的回链；不得重新扩张 F-3 的 MLP 数学。

## 验收标准

1. 内容测试逐项锁定 pre-activation、符号非语义、ReLU 边界（含零点次梯度边界）、GELU 导数和非抽样概率解释、bias 门槛、strict ReLU 负区零导数、dead ReLU、互补 ReLU 恒等式、GELU 负输出的后续正贡献、loss 间接决定、residual 非可逆边界以及分布式表示边界。
2. `data-answers` 映射覆盖用户提出的 1--26 号问题，去重后的集合必须恰好为 `1..26`。
3. widget 测试验证四个视图、可访问属性、键盘导航、x/w/b 阈值控件、预置 `ReLU(x-3)`、冻结 fixture 的 channel provenance、确定性 helper 输出、UMD browser/global 等价性和无 DOM 依赖的计算。
4. 浏览器审计在 1440x900、834x1112、390x844、320x720 检查 KaTeX、无 raw LaTeX、无 console/page/request error、所有视图可切换、控件可键盘操作、每个互动结论的 no-JS 静态等价物、F-3 回链、无 document 或核心模块横向溢出，并为四个激活视图保存桌面/320px 截图。
5. 复查 F-3 仍然以 Block 组装为主，保留既有稳定锚点且不重新要求读者先掌握新章节以外的概念。
6. 文本把 ReLU 与 GELU 的数学事实和教学比喻明确分开，不声称一个 feature 维度有固定人类可命名含义。

## 26 个问题到教材锚点

| 问题 | 主回答锚点 |
| --- | --- |
| 1, 24 | `#preactivation` |
| 2, 3, 4, 25, 26 | `#sign-is-not-meaning` |
| 5, 6, 7, 8 | `#relu` |
| 9, 22 | `#gelu` |
| 10, 11, 12, 13, 14, 15 | `#training-gates` |
| 16, 17, 18 | `#bias-threshold` |
| 19, 20, 21, 23 | `#negative-information` |

每个对应 section 的 `h2` 使用 `data-answers` 声明覆盖的编号；某个问题可以在多个位置被提及，但测试以主回答锚点构成恰好一次的 1--26 映射。

## 一手资料

- Nair & Hinton, Rectified Linear Units Improve Restricted Boltzmann Machines: ReLU 的定义和稀疏性背景。
- Hendrycks & Gimpel, Gaussian Error Linear Units (GELUs): `x Phi(x)` 的定义与随机正则化解释。
- Glorot, Bordes & Bengio, Deep Sparse Rectifier Neural Networks: ReLU/稀疏激活与优化背景。
- He et al., Deep Residual Learning for Image Recognition: residual identity path 的基础思想。
