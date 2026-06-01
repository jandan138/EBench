/* eval-flow — client(模型) ↔ server(Isaac Sim) 的评测时序动画。
   切换 chunk / step 模式，直观看到 round-trip 次数差异。 */
(function () {
  window.EBWidgets["eval-flow"] = function (root) {
    let mode = "chunk", playing = false, idx = 0, raf = null;

    function buildSeq() {
      const s = [];
      s.push({ dir: "c2s", label: "client.reset()", note: "申请初始观测" });
      s.push({ dir: "s2c", label: "obs", note: "images ×4 · state · instruction" });
      for (let step = 0; step < 2; step++) {
        s.push({ dir: "infer", label: "model.get_action(obs)", note: "flow matching 采样 action chunk (H 步)" });
        if (mode === "chunk") {
          s.push({ dir: "c2s", label: "client.step([a0…a_{H-1}])", note: "一次发送整段 chunk" });
          s.push({ dir: "sim", label: "server 内部执行 H 步", note: "省去 H-1 次网络往返" });
          s.push({ dir: "s2c", label: "obs', done", note: "只回最后一个 re-inference 点的观测" });
        } else {
          for (let k = 0; k < 3; k++) {
            s.push({ dir: "c2s", label: "client.step(a" + k + ")", note: "逐步发送" });
            s.push({ dir: "s2c", label: "obs', done", note: "每步都回一次" });
          }
        }
      }
      s.push({ dir: "done", label: "eval_finished == True", note: "client.close()" });
      return s;
    }
    let seq = buildSeq();

    const wrap = EBW.el("div");
    const lanes = EBW.el("div", { style: "display:grid;grid-template-columns:1fr 1fr;gap:0;text-align:center;font-weight:600;margin-bottom:6px" });
    lanes.appendChild(EBW.el("div", { style: "color:var(--interactive)" }, "Client · 你的模型 env"));
    lanes.appendChild(EBW.el("div", { style: "color:var(--accent)" }, "Server · Isaac Sim 黑盒"));
    const stage = EBW.el("div", { style: "position:relative;border:1px solid var(--border);border-radius:10px;background:var(--surface-2);padding:14px;min-height:120px" });
    const arrow = EBW.el("div", { style: "font-family:var(--mono);font-size:.84rem" });
    stage.appendChild(arrow);
    const log = EBW.el("div", { style: "margin-top:10px;font-family:var(--mono);font-size:.74rem;color:var(--ink-faint);max-height:130px;overflow:auto" });

    function render() {
      const m = seq[idx];
      const dirIcon = { c2s: "──▶  发往 server", s2c: "◀──  server 返回", infer: "⟳  client 本地推理", sim: "⚙  server 本地仿真", done: "✓  结束" }[m.dir];
      const color = m.dir === "s2c" || m.dir === "sim" ? "accent" : (m.dir === "done" ? "interactive" : "interactive");
      arrow.innerHTML = `<div style="font-size:1.05rem;font-weight:700;color:var(--${color})">${m.label}</div>
        <div style="margin-top:6px;color:var(--ink-soft)">${dirIcon}</div>
        <div style="margin-top:4px;color:var(--ink-faint)">${m.note}</div>
        <div style="margin-top:8px;color:var(--ink-faint)">[${idx + 1} / ${seq.length}]</div>`;
      const lines = seq.slice(0, idx + 1).map((x, i) => `${String(i + 1).padStart(2, "0")}  ${x.label}`).join("<br>");
      log.innerHTML = lines;
      log.scrollTop = log.scrollHeight;
    }
    function step() { idx = Math.min(seq.length - 1, idx + 1); render(); if (idx >= seq.length - 1) stop(); }
    function stop() { playing = false; playBtn.textContent = "▶ 播放"; cancelAnimationFrame(raf); }
    function reset() { idx = 0; render(); }

    const ctrls = EBW.el("div", { class: "ctrl-row", style: "margin-top:12px" });
    const modeWrap = EBW.el("div", { class: "ctrl" }); modeWrap.appendChild(EBW.el("label", null, "<span>step 模式</span>"));
    modeWrap.appendChild(EBW.seg([{ label: "chunk（推荐）", value: "chunk" }, { label: "step（逐步）", value: "step" }], mode, (v) => { mode = v; seq = buildSeq(); reset(); }));
    ctrls.appendChild(modeWrap);
    const playBtn = EBW.el("button", { class: "btn primary" }, "▶ 播放");
    const stepBtn = EBW.el("button", { class: "btn" }, "⏭ 单步");
    const resBtn = EBW.el("button", { class: "btn" }, "↺ 重置");
    const bw = EBW.el("div", { class: "ctrl" }); bw.appendChild(EBW.el("label", null, "<span>&nbsp;</span>"));
    const bb = EBW.el("div", { style: "display:flex;gap:8px" }); bb.appendChild(playBtn); bb.appendChild(stepBtn); bb.appendChild(resBtn); bw.appendChild(bb); ctrls.appendChild(bw);

    let last = 0;
    playBtn.addEventListener("click", () => {
      if (playing) { stop(); return; }
      if (idx >= seq.length - 1) reset();
      playing = true; playBtn.textContent = "⏸ 暂停"; last = performance.now();
      const tick = (now) => { if (!playing) return; if (now - last > 900) { last = now; step(); } if (playing) raf = requestAnimationFrame(tick); };
      raf = requestAnimationFrame(tick);
    });
    stepBtn.addEventListener("click", () => { stop(); step(); });
    resBtn.addEventListener("click", () => { stop(); reset(); });

    wrap.appendChild(lanes); wrap.appendChild(stage); wrap.appendChild(log); wrap.appendChild(ctrls);
    root.appendChild(wrap); render();
  };
})();
