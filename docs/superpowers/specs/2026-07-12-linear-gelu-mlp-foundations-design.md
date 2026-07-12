# Linear / GELU / MLP 零基础前置章设计

## 背景与问题诊断

现有 F-3 默认读者已经理解 `Linear -> GELU -> Linear`，因此在解释 Transformer Block 时直接使用 contextual hidden state、nonlinear capacity、residual stream 和矩阵形状。读者虽然可能已经通过 F-2 理解 Attention 如何跨 token 收集信息，却仍不知道一条向量如何被普通神经网络加工，也无法回答 Linear、GELU、MLP 分别是什么。

本次新增独立的 F-2.5，在 F-2 与现有 F-3 之间补齐这一级台阶。现有 F-3 的编号、文件名、锚点和公开 URL 保持不变。

## 读者前提与成功标准

章节只假设读者会基本加减乘法，不预设矩阵乘法、神经网络、激活函数或深度学习框架知识。完成后，读者应能用自己的话回答：

1. 函数为什么能用同一条规则处理不同输入。
2. Transformer 中的 Linear 如何把输入数字加权组合成输出数字。
3. `W`、`b`、输入维度和输出维度分别控制什么。
4. GELU 为什么是逐元素非线性函数，而不是另一套矩阵或 token 间通信。
5. 为什么两个连续 affine transform 总能合并，而加入 GELU 后通常不再是 affine，不能对任意参数普遍合并；同时知道特殊参数组合仍可能得到 affine 映射。
6. 一个 `Linear 1 -> GELU -> Linear 2` MLP 如何逐步把一条 hidden state 变成另一条同宽向量。
7. 为什么同层所有 token 共用一个 MLP，却仍会产生不同输出。
8. 为什么 Attention 后通常仍加入 MLP，以及这种分工不是绝对能力边界。
9. 训练如何更新 `W_1,b_1,W_2,b_2`，而不是人工给神经元分配语法角色。

## 编号与导航

- 新章节 ID：`f-2-5`。
- 新文件：`learn/chapters/foundations/f-2-5-linear-gelu-mlp.html`。
- 导航标题：`Linear、GELU 与 MLP 从零开始`。
- `learn/content.js` 将该章节插入 `f-2` 与 `f-3` 之间。
- F-2 的结尾先导向 F-2.5；涉及 Residual 和完整 Block 的深链接继续指向 F-3。
- F-3 的开头先用一幅无公式数据流回顾 F-2 与 F-2.5，再进入 Residual、LayerNorm 和完整 Block。

## 教学结构

### 1. 从函数开始

先用 `输入 -> 同一条规则 -> 输出` 解释函数。通过 `f(x)=2x+1` 展示不同输入经过同一规则得到不同输出，为后面的参数共享建立基础。

### 2. 一个数字的 Linear

使用 `y=wx+b`，明确 `x` 是输入、`w` 是权重、`b` 是偏置、`y` 是输出。先代入具体数值，再解释训练会改变 `w,b`。同时说明严格数学上 `b!=0` 时这是 affine transform，深度学习库仍常把这个模块命名为 Linear。

### 3. 向量 Linear

从 `[x_1,x_2]` 到 `[y_1,y_2,y_3]` 手算每个输出：每个 `y_j` 都是所有输入的加权和再加偏置。矩阵公式 `y=xW+b` 只在逐项计算之后出现，并用表格标出 `W` 的两条轴。Linear 在同一 token 的 feature 之间混合信息，不在 token 位置之间通信。

### 4. GELU

先给 `-2,-1,0,1,2` 的输入输出表和曲线，再给精确定义 `GELU(x)=x Phi(x)`。准确直觉是：较大的正数接近原样通过，较大的负数被压到接近 0，中间区域平滑变化；输出不被限制在 `[0,1]`，负输入可以得到负输出，而且 GELU 在负半轴的一小段并非单调。正文区分精确定义、数值近似计算和常见 tanh 近似。GELU 对向量中的每个数字独立执行，没有可学习矩阵。

### 5. 为什么需要非线性

用 row-vector 公式证明两个 affine transform 总能合并：`W*=W_1W_2`，`b*=b_1W_2+b_2`。加入 GELU 后，整条映射通常不再是 affine，因此不存在对任意参数都成立的合并规则；特殊参数组合仍可能碰巧产生 affine 映射。这里不宣称 GELU 是唯一选择，ReLU、SiLU 或门控变体也能提供非线性。

### 6. 完整 MLP 手算

固定输入 `x=[2,-1]`，使用以下确定性参数：

```text
W1 = [[ 1, 0, 0.5,  0.25],
      [-1, 2, 0.5, -0.50]]
b1 = [0, 0, 0, 0]

W2 = [[ 0.2,  0.4],
      [ 0.1, -0.2],
      [ 0.3,  0.2],
      [-0.1,  0.3]]
b2 = [0, 0]
```

因此 `xW1+b1=[3,-2,0.5,1]`，按精确定义数值求值得到的 GELU 近似值为 `[2.996,-0.046,0.346,0.841]`，最终 `hW2+b2` 约为 `[0.614,1.529]`。正文逐项写出至少一个输出维度的乘加过程，并解释这是 `2 -> 4 -> 2`：先扩宽到中间 feature，再投回原宽度。实际模型中的 `d` 和 `d_ff` 更大，但机制相同。

### 7. 参数共享与 GPU 视角

用“她 / 喜欢 / 苹果”三条不同的二维 toy hidden states 进入标准 dense Transformer 同一层的同一组 `W_1,b_1,W_2,b_2`。展示权重不变，并说明不同输入可以但不保证得到不同输出；toy 数值中至少两行确实不同。最后才把三行叠成矩阵，说明实现可以把 `[B,n,d]` 的前两轴展平或向量化批量计算，这是一种实现策略，不是共享参数的原因，也不代表语义上在行间交换数据。MoE 等变体不遵守“所有 token 必经同一个 dense MLP”的简化。

### 8. 与 Attention 和训练连接

Attention 先让每个位置从其他可见位置取得上下文；MLP 再独立加工每个位置当前拥有的 feature。这是标准 Transformer 中有用的教学分工，不是排他的能力边界；Attention 后直接接输出头在结构上仍然可行。从头训练通常从初始化参数开始，微调通常从 checkpoint 开始；反向传播计算梯度，优化器只更新当前存在且可训练的参数，冻结参数不会被更新，有些架构也可能省略 bias。“feature detector”只是一种解释视角，不代表人工命名或单神经元固定对应语法概念。

### 9. 检查与 F-3 桥接

章节结尾用判断题和口头复述检查 Linear、GELU、MLP、共享范围和形状。桥接图只展示：

```text
F-2: Attention 让位置之间通信
F-2.5: MLP 在每个位置内部计算
F-3: Residual + LayerNorm 把两种更新组装成可堆叠 Block
```

## 交互实验台

新增 `mlp-basics-viz`，沿用现有 `.lab`、`EBWidgets` 注册表和延迟初始化机制。组件包含四个互斥视图：

1. `linear`：选择一个输出维度，显示该输出的每一项乘法、求和和偏置。
2. `gelu`：滑动输入值或选择预设值，在 SVG 曲线上显示输入点与 GELU 输出，同时显示数值表。
3. `mlp`：逐步显示固定 toy 输入经过 Linear 1、GELU、Linear 2 的形状和值；可切换“保留 GELU / 去掉 GELU”进行结构对比。
4. `shared`：在三条 token hidden states 间切换，保持参数区域不变，展示不同输出；同时显示批量矩阵形状 `[3,2] -> [3,4] -> [3,2]`。

视图按钮使用 `type="button"`、`aria-pressed`、方向键/Home/End 导航和 `:focus-visible`。输出列和 token 选择组也提供名称、单一选中状态和键盘操作；range 与 checkbox 有显式 label；SVG 标明自身是补充图形还是装饰。动态结果放在简洁的 `aria-live="polite"` 区域。图形之外提供等价文字和数值，不依赖颜色传达唯一含义。组件包含 `<noscript>` 静态回退；320px 下改成单列，公式、表格与数值允许换行，不产生 document overflow。

## F-3 重构范围

F-3 不再以六行 Q/K/V 公式和 MLP 矩阵作为入口。开头顺序改为：

1. 一句具体场景：Attention 已把“小红”的信息带到“她”的位置，现在这条向量还要继续计算。
2. 无公式双流程图：Attention 跨行通信，MLP 每行独立计算。
3. 链接 F-2.5 的三句回顾：Linear 加权重组、GELU 提供非线性、第二个 Linear 投回 `d`。
4. 先给完整 Block 的口语主线，再进入 Residual、LayerNorm，最后出现精确 pre-norm 公式。

保留现有兼容锚点 `#attention-params`、`#mlp`、`#residual-ln`、`#full-flow`。其中 `#attention-params` 继续解释 `W_O` 和回到宽度 `d`；`#mlp` 回顾 Linear、GELU 与投回 `d` 并链接 F-2.5；`#residual-ln` 继续定义残差旁路；`#full-flow` 继续给出精确 pre-norm 组装。原 `#shared-mlp` 与 `#mlp-expressivity` 不再承担正文内容，但保留隐藏兼容锚点或明确重定向到 F-2.5 对应位置。F-3 不重复 F-2.5 的完整手算。

## 文件边界

- 新增 `learn/chapters/foundations/f-2-5-linear-gelu-mlp.html`。
- 新增 `learn/assets/js/widgets/mlp-basics-viz.js`。
- 新增 `learn/assets/js/widgets/mlp-basics-core.js`，提供可在 Node 中执行验证的 deterministic affine/GELU/trace 函数，并在浏览器暴露同一 API。
- 新增 `learn/tests/f-2-5-mlp-basics-content.test.mjs`。
- 新增 `learn/tests/f-2-5-mlp-basics-math.test.mjs`。
- 新增 `learn/tests/foundations-navigation-integrity.test.mjs`。
- 新增 `learn/tests/f-2-5-browser-audit.mjs`，可自行启动随机端口静态服务器，也可通过环境变量验收远端 URL。
- 修改 `learn/content.js`，插入章节 metadata。
- 修改 `learn/chapters/foundations/f-2-attention.html`，更新下一章与分流链接。
- 修改 `learn/chapters/foundations/f-3-transformer-block.html`，重构入口和 MLP 回顾。
- 修改 `learn/tests/f-3-transformer-block-content.test.mjs`，约束新入口顺序和前置章链接。
- 修改 `learn/assets/css/book.css`，只新增 `.mlp-basics-viz` / `.mbv-*` 与 `body[data-section="f-2-5"] .f25-*` 作用域样式。
- 不修改 `learn/assets/js/book.js` 或 `registry.js`。

## 验证标准

1. 新内容测试先失败，并按 section scope 分别验证九项学习成果、checkpoint 对应项、教学顺序和数学限定；不能只用全页关键词存在性代替结果验证。
2. 独立可执行数学测试先失败，再验证 affine、GELU 容差、三条输入 trace、格式化和静态/交互数值一致性。
3. F-3 回归测试先失败，确认第一屏不再重复 Q/K/V 推导、链接 F-2.5，并验证四个兼容锚点的语义而不只检查 ID 存在。
4. 永久导航完整性测试以 `window.EBOOK.flat` 为 source of truth，验证 62 个唯一 ID/file、所有注册文件、本地 `href/src` 和 fragment。
5. 永久 Playwright 审计自行分配端口并在 `finally` 中关闭服务器/浏览器；在 1440x900、834x1112、390x844、320x720 下检查两章的 KaTeX、无 JS 静态内容、lazy init 单次挂载与无 `IntersectionObserver` 回退、四个交互视图、键盘/焦点/live region、light/dark、console/page/request errors、文本/公式/表格/组件 overflow。
6. 所有 `learn/**/*.js` 通过 `node --check`，提交范围通过 `git diff --check "$BASE_SHA"..HEAD`。
7. 三位独立 reviewer 分别从架构合理性、完整性与边界 case、风险与教学误导角度审核实施计划；Critical/Important 问题必须在实现前纳入计划。

## 非目标

- 不在 F-2.5 教反向传播推导、优化器细节或通用神经网络历史。
- 不把 GELU 描述成语义判断器，也不把中间维度逐一命名为固定语言规则。
- 不扩展为多层感知机的通用课程；重点只服务于理解 Transformer 中的 position-wise FFN/MLP。
- 不改变 F-3 的公开 URL，不重编号 F-3 到 F-8。
