/* mode-averaging — 同一个 x 有两个都对的 y（绕左 / 绕右），
   MSE 回归把它们平均成中间那条"撞上去"的线。拖动演示多模态被平均化。 */
(function () {
  window.EBWidgets["mode-averaging"] = function (root) {
    const W = 560, H = 300, PAD = 36;
    const c = (n) => EBW.c(n);
    let mix = 0.5; // 两种 demo 的混合比例（0=全绕上, 1=全绕下）
    let showAvg = true, showModes = true;

    const cv = EBW.el("canvas", { width: W, height: H, style: "width:100%;max-width:" + W + "px;margin:auto;background:var(--surface-2);border-radius:10px" });
    const ctx = cv.getContext("2d");
    const X = (u) => PAD + u * (W - 2 * PAD);
    const Y = (v) => H - PAD - v * (H - 2 * PAD);

    // 障碍物在中间 (x=0.5, y=0.5)；两条 demo：上绕 / 下绕
    function up(x) { return 0.5 + 0.42 * Math.sin(Math.PI * x); }   // 拱形向上
    function down(x) { return 0.5 - 0.42 * Math.sin(Math.PI * x); } // 拱形向下

    function draw() {
      ctx.clearRect(0, 0, W, H);
      // 障碍物
      ctx.beginPath(); ctx.arc(X(0.5), Y(0.5), 22, 0, 7);
      ctx.fillStyle = c("warn") + "33"; ctx.fill();
      ctx.beginPath(); ctx.arc(X(0.5), Y(0.5), 8, 0, 7); ctx.fillStyle = c("warn"); ctx.fill();
      ctx.fillStyle = c("warn"); ctx.font = "11px sans-serif"; ctx.fillText("障碍物", X(0.5) - 18, Y(0.5) - 28);
      // 起点终点
      ctx.fillStyle = c("ink-soft"); ctx.font = "12px sans-serif";
      ctx.fillText("起点", X(0) - 6, Y(0.5) + 28); ctx.fillText("终点", X(1) - 20, Y(0.5) + 28);

      if (showModes) {
        // 上绕（demo A）
        ctx.beginPath();
        for (let i = 0; i <= 60; i++) { const x = i / 60; i ? ctx.lineTo(X(x), Y(up(x))) : ctx.moveTo(X(x), Y(up(x))); }
        ctx.strokeStyle = c("interactive"); ctx.lineWidth = 2; ctx.globalAlpha = 0.4 + 0.6 * (1 - mix); ctx.stroke(); ctx.globalAlpha = 1;
        // 下绕（demo B）
        ctx.beginPath();
        for (let i = 0; i <= 60; i++) { const x = i / 60; i ? ctx.lineTo(X(x), Y(down(x))) : ctx.moveTo(X(x), Y(down(x))); }
        ctx.strokeStyle = c("rl"); ctx.lineWidth = 2; ctx.globalAlpha = 0.4 + 0.6 * mix; ctx.stroke(); ctx.globalAlpha = 1;
      }
      if (showAvg) {
        // MSE 最优 = 按 mix 加权平均（mix=0.5 时正好穿过障碍物）
        ctx.beginPath();
        for (let i = 0; i <= 60; i++) { const x = i / 60; const y = (1 - mix) * up(x) + mix * down(x); i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y)); }
        ctx.strokeStyle = c("ink"); ctx.lineWidth = 3; ctx.setLineDash([6, 4]); ctx.stroke(); ctx.setLineDash([]);
        // 标注是否撞
        const ymid = (1 - mix) * up(0.5) + mix * down(0.5);
        const hit = Math.abs(Y(ymid) - Y(0.5)) < 22;
        ctx.fillStyle = hit ? c("warn") : c("ink-soft"); ctx.font = "12px monospace";
        ctx.fillText(hit ? "⚠ MSE 平均线 → 直接撞上障碍物" : "MSE 平均线（偏向一侧，侥幸避开）", PAD, 18);
      }
      // 图例
      ctx.font = "11px sans-serif";
      ctx.fillStyle = c("interactive"); ctx.fillText("— 绕上（demo A，都对）", W - 165, H - 34);
      ctx.fillStyle = c("rl"); ctx.fillText("— 绕下（demo B，都对）", W - 165, H - 20);
      ctx.fillStyle = c("ink"); ctx.fillText("- - MSE 回归的输出（均值）", W - 165, H - 6);
    }

    const ctrls = EBW.el("div", { class: "ctrl-row" });
    ctrls.appendChild(EBW.slider("数据里 绕上↔绕下 的比例", 0, 1, 0.01, mix, (v) => { mix = v; draw(); }).wrap);
    const t1 = EBW.el("div", { class: "ctrl" }); t1.appendChild(EBW.el("label", null, "<span>显示</span>"));
    t1.appendChild(EBW.seg([{ label: "全部", value: "all" }, { label: "只看均值", value: "avg" }, { label: "只看示范", value: "modes" }], "all", (v) => {
      showAvg = v !== "modes"; showModes = v !== "avg"; draw();
    }));
    ctrls.appendChild(t1);

    root.appendChild(cv); root.appendChild(ctrls);
    draw(); window.addEventListener("resize", draw);
  };
})();
