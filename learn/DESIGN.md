# EBench 交互式教程 — 设计文档 (DESIGN)

> 一本"娓娓道来"的 HTML 书，帮助读者**完全理解 EBench 这个项目**。
> 受众：有强化学习数学基础 + GAMES103（物理仿真）基础，VLA 领域新人。

## 0. 目标与约束

- **重心**：均衡 —— 既讲透 EBench 这个 *benchmark*（评测方法、client-server 架构、接入模型、跑评测），也讲透其 baseline 背后的 *VLA 模型理论*（flow matching、action chunking、π0/π0.5、X-VLA、InternVLA-A1）。
- **数学深度**：直觉 + 关键公式 + 推导要点。不堆满每一行代数；用 RL/物理直觉切入，配交互动画建立 feeling。
- **语言**：中文用于解释性叙述；**英文保留所有架构术语、命令名、性能指标、概念名**（符合论文阅读习惯）。
- **位置**：`EBench/learn/`（仓库内）。
- **技术栈**：零构建（zero-build）。纯 HTML/CSS/JS，可在 `file://` 或任意静态服务器下运行。CDN 引入 KaTeX（数学）与 Three.js（少数 3D 部件）。
- **两座桥**：每当引入新概念，尽量用「从 RL 看」/「从 GAMES103 看」callout 连接读者已有知识。

## 1. 资料来源（已收集）

- EBench README / README.zh-CN（项目入口、baseline 接入命令）。
- 仓库代码：`scripts/`、`baselines/{openpi,X-VLA,InternVLA-A1}/`（**非** third_party）的 EBench 专用胶水代码。
- 官方 docs 站 `internrobotics.github.io/EBench-doc`（Astro Starlight，9 页）：benchmark overview、task showcase、environment、assets&dataset、run-benchmark、custom-model、gmp-cli、challenge。
- 论文/博客：π0 (arXiv 2410.24164)、π0.5 (2504.16054)、Knowledge Insulation (2505.23705)、X-VLA (2510.10274)、InternVLA-A1 (2601.02456)、GenManip (2506.10966, CVPR'25)；Isaac Sim / cuRobo / LeRobot 官方文档；ACT / flow matching / rectified flow 背景。

### 1.1 需要在书中调和的口径差异

- README 宣传「5-axis atomic diagnostic / 4-axis generalization / 794 task instances / Test-Mini / Specialist vs Generalist」。
- 现行 docs 站实际描述「**3 tracks**(`mobile_manip`/`table_top_manip`/`generalist`) × **3 splits**(`val_train`/`val_unseen`/`test`)，**26 tasks**，dataset **6,600 episodes**」，且 split 细分标注 *WIP*。
- **处理方式**：把 capability-profile 的**愿景**（5 轴诊断）作为叙事主线讲清"为什么"；把 **3 tracks × 3 splits + 26 tasks + 接入契约**作为可验证的**地面真相**讲清"是什么/怎么做"。明确标注哪些是 paper/愿景、哪些是 docs/代码可验证事实。

## 2. 信息架构（章节）

9 个 Part + Appendix，共 45 节。详见 `content.js`（导航单一真相源）。

- **Part 0 序章**：why EBench / repo constellation / 怎么读这本书
- **Part 1 问题域**：RL→behavior cloning（生成式策略）/ 什么是 VLA / `lift2` 本体
- **Part 2 仿真地基**(GAMES103 桥)：Isaac Sim(USD+PhysX+RTX) / cuRobo / GenManip / LeRobot+数据集
- **Part 3 benchmark 方法论**：capability profile 愿景 / 3 tracks×3 splits / 26 tasks 与打分 / 泛化轴 / 指标与诊断报告
- **Part 4 评测引擎(client-server)**：为何 client-server / EvalClient 契约 / action 向量解剖 / chunk vs step、receding horizon / gmp CLI 与 online challenge
- **Part 5 VLA 理论**：compounding error→action chunking / flow matching 数学 / action expert / 离散 vs 连续解码、FAST、knowledge insulation
- **Part 6 baseline 全链路**：π0/π0.5(openpi) / X-VLA(soft prompt+domain_id) / InternVLA-A1(MoT+visual foresight) / 三者对比
- **Part 7 实战 capstone**：接入自己的模型 / 本地 vs online / 追踪一个 episode 全程
- **Part 8 评测系统通论**：construct validity / 五层解剖 / contract / reproducibility / aggregation / generalization
- **Appendix**：术语表 / repo&链接图 / obs&action&gmp 速查 / 参考文献

## 3. 技术与文件组织

```
learn/
├── DESIGN.md                  # 本文件
├── index.html                 # 封面 + 总目录
├── content.js                 # 导航单一真相源（驱动侧栏/上下页/封面 TOC/搜索）
├── _template.html             # 新章节样板
├── assets/
│   ├── css/book.css           # 设计系统（dark/light tokens、三栏布局、组件）
│   └── js/
│       ├── book.js            # 核心：导航渲染、主题、进度、scroll-spy、搜索、widget 自动挂载
│       └── widgets/           # 交互部件（data-widget 自动发现，避免脆弱的硬编码挂载点）
│           ├── registry.js
│           ├── flow-matching-ode.js
│           ├── mode-averaging.js
│           ├── action-chunking.js
│           ├── eval-flow.js
│           ├── action-dissector.js
│           ├── capability-radar.js
│           ├── task-taxonomy.js
│           ├── moe-attention.js
│           ├── aggregation-pitfall.js
│           └── eval-anatomy.js
└── chapters/
    ├── 00-orientation/ … 08-eval-systems/ , appendix/
```

### 3.1 相对 ConvertAsset/learn 的改进（去其糟粕）

1. **widget 自动发现**：用 `<div data-widget="flow-matching-ode">` + 注册表，`book.js` 扫描并挂载；替代脆弱的 `getElementById('xxx-mount')` 硬编码。
2. **客户端搜索**：基于 `content.js` 的标题/关键词做轻量全文索引。
3. **重部件懒加载**：Three.js / 大 canvas 部件用 IntersectionObserver 进入视口再初始化。
4. **统一的 widget 接口**：`init(rootEl, opts)`，遵守 `prefers-reduced-motion`，自带销毁与 resize。

### 3.2 设计系统要点

- CSS 变量主题（light/dark + localStorage）；衬线标题 + 无衬线正文 + 等宽代码 + Noto Sans SC 中文。
- 三栏：sticky topbar(进度条) / 左侧 TOC 树 / 主阅读列(~720px) / 右侧 "On this page"。
- 组件：`.callout`（含 `.bridge-rl` / `.bridge-games103` 两种桥）、`.math-block`、`.code`（文件名+复制）、`.lab`（部件容器）、`.prevnext`。
- 术语：`<span class="term">English</span>` 高亮英文术语。

## 4. 交互部件清单

1. **flow-matching-ode**：noise→action chunk 的 Euler 积分动画；可调步数；展示 rectified flow 近直线路径。
2. **mode-averaging**：回归动作均值化的多模态陷阱。
3. **action-chunking**：预测 H、执行 prefix、replan cadence；展示 compounding error 权衡。
4. **eval-flow**：`reset→obs→infer→step→…→done` 时序动画；切换 chunk/step 模式。
5. **action-dissector**：16/19-D action 向量分片悬停；展示每个 baseline 的映射差异。
6. **capability-radar**：多 baseline 跨轴雷达对比；可切换模型。
7. **task-taxonomy**：26 tasks×3 families，点开看打分公式。
8. **moe-attention**：image/text token 与 action token 经不同权重路由、attention mask 可视化。
9. **aggregation-pitfall**：展示指标聚合、加权与 Simpson's paradox 风险。
10. **eval-anatomy**：评测系统五层通用骨架与隐式/显式实现对照。

## 5. 构建顺序

1. 核心 scaffold：`book.css` / `book.js` / `content.js` / `index.html` / `_template.html` / widget registry。
2. 先打通一个完整 Part（含至少一个 widget）确立模式。
3. 逐 Part 写章节，逐个补 widget。
4. 搜索、术语表、参考文献、收尾打磨与自检。
</content>
</invoke>
