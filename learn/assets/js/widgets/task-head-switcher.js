/* task-head-switcher — 同一条 Transformer 流水线，四种任务头读法。
   切换 GPT / BERT / VLM / VLA，看同一份 hidden state 矩阵里
   哪些行被任务头读取、读出什么。 */
(function () {
  window.EBWidgets["task-head-switcher"] = function (root) {
    const c = (n) => EBW.c(n);

    /* 每种模式：行标签、被读取的行、任务头名、输出示例、一句话解释 */
    const MODES = {
      "gpt": {
        label: "GPT · 下一个词",
        rows: ["我", "喜欢", "吃", "苹", "果", "▪"],
        read: [5],
        head: "LM head（Linear → 词表 logits）",
        out: "下一个 token 的概率分布",
        note: "causal mask 让每个位置只看到前面；最后一个位置汇聚了整句，读它一行就够。",
      },
      "bert": {
        label: "BERT · 句子分类",
        rows: ["[CLS]", "我", "喜欢", "吃", "苹果", "[SEP]"],
        read: [0],
        head: "Classification head",
        out: "整句的标签（如情感正/负）",
        note: "[CLS] 是专门为「被读取」准备的槽位：bidirectional attention 把整句信息写进它，分类只读这一行。",
      },
      "vlm": {
        label: "VLM · 看图说话",
        rows: ["img", "img", "img", "描", "述", "▪"],
        read: [0, 1, 2, 3, 4, 5],
        head: "Text head（逐位置 LM head）",
        out: "一段描述文本的 token 序列",
        note: "图像 patch 行与文本行在同一 attention 里互相可见；生成时逐个文本位置读出自己的行。",
      },
      "vla": {
        label: "VLA · 输出动作",
        rows: ["img", "img", "拿起", "杯子", "state", "action"],
        read: [0, 1, 2, 3, 4, 5],
        head: "Action head / action expert",
        out: "action chunk（未来 H 步动作）",
        note: "答案散落在整个场景里：杯子在哪（视觉行）、手在哪（state 行）、要干什么（文本行）——不能只读一行。",
      },
    };

    const W = 720, H = 340, ROW_H = 34, ROW_X = 60, ROW_W = 150;
    const svg = EBW.svg("svg", { viewBox: `0 0 ${W} ${H}`, style: "width:100%;height:auto;display:block" });
    const ctrl = EBW.el("div", { class: "ctrl-row" });
    let mode = "gpt";
    ctrl.appendChild(EBW.seg(
      Object.entries(MODES).map(([value, m]) => ({ label: m.label, value })),
      "gpt", (v) => { mode = v; render(); },
    ));
    const note = EBW.el("div", { style: "font-size:.84rem;color:var(--ink-soft);line-height:1.6;margin:2px 0 8px" });

    function render() {
      const m = MODES[mode];
      note.textContent = m.note;
      while (svg.firstChild) svg.removeChild(svg.firstChild);

      const defs = EBW.svg("defs", {});
      const mk = EBW.svg("marker", { id: "m-ths", viewBox: "0 0 10 10", refX: "9", refY: "5", markerWidth: "7", markerHeight: "7", orient: "auto-start-reverse" });
      mk.appendChild(EBW.svg("path", { d: "M 0 0 L 10 5 L 0 10 z", fill: c("interactive") }));
      defs.appendChild(mk);
      svg.appendChild(defs);

      /* 标题行：H 矩阵 */
      const cap = EBW.svg("text", { x: ROW_X + ROW_W / 2, y: 26, "text-anchor": "middle", "font-size": "12", "font-weight": "650", fill: c("ink-faint") });
      cap.textContent = "最终 hidden states H（每 token 一行）";
      svg.appendChild(cap);

      const rowY = (i) => 42 + i * ROW_H;
      m.rows.forEach((label, i) => {
        const isRead = m.read.includes(i);
        const y = rowY(i);
        svg.appendChild(EBW.svg("rect", {
          x: ROW_X, y, width: ROW_W, height: ROW_H - 8, rx: 8,
          fill: isRead ? c("interactive") + "22" : c("surface"),
          stroke: isRead ? c("interactive") : c("border-strong"),
          "stroke-width": isRead ? 2 : 1.1,
        }));
        const t = EBW.svg("text", { x: ROW_X + 14, y: y + 18, "font-size": "12.5", "font-weight": isRead ? "650" : "400", fill: isRead ? c("ink") : c("ink-faint") });
        t.textContent = "h_" + label;
        svg.appendChild(t);
        const dots = EBW.svg("text", { x: ROW_X + ROW_W - 12, y: y + 18, "text-anchor": "end", "font-size": "11", fill: c("ink-faint"), "letter-spacing": "2" });
        dots.textContent = "···";
        svg.appendChild(dots);
      });

      /* 汇聚箭头 → head 框 → 输出框 */
      const headBox = { x: 360, y: 118, w: 170, h: 64 };
      const outBox = { x: 580, y: 118, w: 124, h: 64 };
      m.read.forEach((i) => {
        const y = rowY(i) + (ROW_H - 8) / 2;
        const p = EBW.svg("path", {
          d: `M ${ROW_X + ROW_W} ${y} C ${ROW_X + ROW_W + 70} ${y}, ${headBox.x - 70} ${headBox.y + headBox.h / 2}, ${headBox.x} ${headBox.y + headBox.h / 2}`,
          fill: "none", stroke: c("interactive"), "stroke-width": 1.8,
          "stroke-dasharray": EBW.reduced ? "none" : "5 4",
          "marker-end": "url(#m-ths)",
        });
        svg.appendChild(p);
      });
      svg.appendChild(EBW.svg("rect", { x: headBox.x, y: headBox.y, width: headBox.w, height: headBox.h, rx: 10, fill: c("interactive") + "1c", stroke: c("interactive"), "stroke-width": 2 }));
      const ht = EBW.svg("text", { x: headBox.x + headBox.w / 2, y: headBox.y + 26, "text-anchor": "middle", "font-size": "12.5", "font-weight": "650", fill: c("ink") });
      ht.textContent = "任务头";
      const ht2 = EBW.svg("text", { x: headBox.x + headBox.w / 2, y: headBox.y + 44, "text-anchor": "middle", "font-size": "10", fill: c("ink-faint") });
      ht2.textContent = m.head.length > 22 ? m.head.slice(0, 22) + "…" : m.head;
      svg.appendChild(ht); svg.appendChild(ht2);

      const arr = EBW.svg("path", {
        d: `M ${headBox.x + headBox.w} ${headBox.y + headBox.h / 2} L ${outBox.x} ${outBox.y + outBox.h / 2}`,
        fill: "none", stroke: c("interactive"), "stroke-width": 1.8, "marker-end": "url(#m-ths)",
      });
      svg.appendChild(arr);
      svg.appendChild(EBW.svg("rect", { x: outBox.x, y: outBox.y, width: outBox.w, height: outBox.h, rx: 10, fill: c("surface"), stroke: c("border-strong"), "stroke-width": 1.4 }));
      const ot = EBW.svg("text", { x: outBox.x + outBox.w / 2, y: outBox.y + 24, "text-anchor": "middle", "font-size": "11.5", "font-weight": "650", fill: c("ink") });
      ot.textContent = "输出";
      const ot2 = EBW.svg("text", { x: outBox.x + outBox.w / 2, y: outBox.y + 42, "text-anchor": "middle", "font-size": "9.5", fill: c("ink-faint") });
      ot2.textContent = m.out.length > 14 ? m.out.slice(0, 14) + "…" : m.out;
      svg.appendChild(ot); svg.appendChild(ot2);

      /* 底部一句话结论 */
      const verdict = EBW.svg("text", { x: W / 2, y: H - 14, "text-anchor": "middle", "font-size": "12", fill: c("ink-soft") });
      verdict.textContent = m.label + "：读 " + (m.read.length === m.rows.length ? "全部行" : "第 " + m.read.map((i) => i + 1).join(",") + " 行") + " → " + m.out;
      svg.appendChild(verdict);
    }

    root.appendChild(ctrl);
    root.appendChild(note);
    root.appendChild(svg);
    render();
  };
})();
