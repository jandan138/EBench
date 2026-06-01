# EBench 交互式教程

一本"娓娓道来"的 HTML 书，帮你**完全理解 EBench 这个项目** —— 从仿真地基、评测方法，到 VLA 模型理论（flow matching / action chunking / π0·π0.5 / X-VLA / InternVLA-A1）。

受众：有 **RL 数学基础 + GAMES103（物理仿真）基础**的读者。中文叙述，保留英文术语。

## 怎么看

零构建（zero-build），纯静态。任选其一：

```bash
# 方式一：本地静态服务器（推荐，KaTeX/字体走 CDN，需要联网）
cd learn && python3 -m http.server 8000
# 浏览器打开 http://localhost:8000/index.html

# 方式二：直接用浏览器打开 learn/index.html（file://）
```

入口是 `index.html`（封面 + 总目录）。`/` 或 <kbd>Ctrl/Cmd+K</kbd> 打开搜索；右上角切换深色/浅色。

## 结构

- `index.html` —— 封面与目录
- `content.js` —— 导航单一真相源（章节、上下页、搜索都由它驱动）
- `assets/css/book.css` —— 设计系统（主题、三栏布局、组件）
- `assets/js/book.js` —— 运行时（导航、主题、进度、搜索、代码高亮、KaTeX、widget 自动挂载）
- `assets/js/widgets/` —— 7 个交互部件（`data-widget` 自动发现）
- `chapters/` —— 7 个 Part + Appendix，共 35 节
- `DESIGN.md` —— 设计文档；`_AGENT_BRIEF.md` —— 写作时用的事实库与风格规范；`_template.html` —— 新章节样板

## 加新章节

1. 在 `content.js` 对应 Part 的 `sections` 里加一条 `{id, title, file, keywords}`。
2. 复制 `_template.html`（或任一现有章节），改 `data-section` / eyebrow / `<h1>` / 正文。
3. 侧栏、上下页、搜索会自动更新。需要交互部件时，在正文里放
   `<div class="lab">…<div class="lab-body" data-widget="WIDGET_NAME"></div>…</div>`。

> 注：教程刻意区分 README/paper 的**愿景**（5-axis 诊断、Test-Mini 等）与线上 docs/代码的**可验证事实**（3 tracks × 3 splits、26 tasks、6,600 episodes）。两者在正文里都明确标注。
