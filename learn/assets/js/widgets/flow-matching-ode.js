/* flow-matching-ode — 把 Gaussian noise 沿学到的向量场积分成 action chunk。
   对比 rectified flow（近直线，少步即可）vs diffusion（弯曲路径，需多步）。 */
(function () {
  window.EBWidgets["flow-matching-ode"] = function (root) {
    const W = 560, H = 320, PAD = 30;
    const c = (n) => EBW.c(n);

    // 目标分布：3 个 mode（代表多模态的"几种正确动作"）
    const targets = [ {x: 0.78, y: 0.24}, {x: 0.82, y: 0.62}, {x: 0.66, y: 0.86} ];
    let steps = 8, mode = "rectified", t = 1, seed = 7, particles = [];

    function sample() {
      const rnd = EBW.rng(seed);
      particles = [];
      for (let i = 0; i < 36; i++) {
        // noise ~ N(左侧)
        const z = { x: 0.18 + (rnd() - 0.5) * 0.18, y: 0.2 + rnd() * 0.6 };
        const tg = targets[i % targets.length];
        particles.push({ z, tg });
      }
    }
    // 给定 coupling (z -> x*)，沿 τ 的位置
    function pos(p, tau) {
      // 直线（OT / rectified flow）
      const lx = EBW.lerp(p.z.x, p.tg.x, tau);
      const ly = EBW.lerp(p.z.y, p.tg.y, tau);
      if (mode === "rectified") return { x: lx, y: ly };
      // 弯曲（模拟 diffusion 的非直路径）：加一个在 τ=0,1 处为 0 的横向扰动
      const bump = Math.sin(tau * Math.PI) * 0.22 * Math.sign(((p.z.y * 10) % 2) - 1);
      return { x: lx, y: ly + bump };
    }
    // Euler 积分得到的离散落点（步数 = steps）：用差分逼近 pos 曲线
    function eulerEnd(p) {
      let x = p.z.x, y = p.z.y;
      const dt = 1 / steps;
      for (let k = 0; k < steps; k++) {
        const tau = k * dt;
        // 数值估计向量场 v ≈ (pos(tau+h) - pos(tau)) / h
        const h = 1e-3;
        const a = pos(p, tau), b = pos(p, Math.min(1, tau + h));
        const vx = (b.x - a.x) / h, vy = (b.y - a.y) / h;
        x += dt * vx; y += dt * vy;
      }
      return { x, y };
    }

    const cv = EBW.el("canvas", { width: W, height: H, style: "width:100%;max-width:" + W + "px;margin:auto;background:var(--surface-2);border-radius:10px" });
    const ctx = cv.getContext("2d");
    const X = (u) => PAD + u * (W - 2 * PAD), Y = (v) => PAD + v * (H - 2 * PAD);

    function draw() {
      ctx.clearRect(0, 0, W, H);
      // 目标 mode
      targets.forEach((tg) => {
        ctx.beginPath(); ctx.arc(X(tg.x), Y(tg.y), 26, 0, 7);
        ctx.fillStyle = c("accent") + "22"; ctx.fill();
        ctx.beginPath(); ctx.arc(X(tg.x), Y(tg.y), 5, 0, 7);
        ctx.fillStyle = c("accent"); ctx.fill();
      });
      // 噪声起点 + 路径 + 当前点
      particles.forEach((p) => {
        ctx.beginPath(); ctx.arc(X(p.z.x), Y(p.z.y), 2.5, 0, 7);
        ctx.fillStyle = c("ink-faint"); ctx.fill();
        // 连续真实路径（淡）
        ctx.beginPath();
        for (let s = 0; s <= 40; s++) { const q = pos(p, s / 40); s ? ctx.lineTo(X(q.x), Y(q.y)) : ctx.moveTo(X(q.x), Y(q.y)); }
        ctx.strokeStyle = c("border-strong"); ctx.lineWidth = 1; ctx.stroke();
        // Euler 折线（到当前 t）
        let x = p.z.x, y = p.z.y; const dt = 1 / steps;
        ctx.beginPath(); ctx.moveTo(X(x), Y(y));
        const upto = Math.round(steps * t);
        for (let k = 0; k < upto; k++) {
          const tau = k * dt, h = 1e-3;
          const a = pos(p, tau), b = pos(p, Math.min(1, tau + h));
          x += dt * (b.x - a.x) / h; y += dt * (b.y - a.y) / h;
          ctx.lineTo(X(x), Y(y));
        }
        ctx.strokeStyle = c("interactive"); ctx.lineWidth = 1.4; ctx.stroke();
        ctx.beginPath(); ctx.arc(X(x), Y(y), 3, 0, 7); ctx.fillStyle = c("interactive"); ctx.fill();
      });
      // 误差读数
      let err = 0; particles.forEach((p) => { const e = eulerEnd(p); err += Math.hypot(e.x - p.tg.x, e.y - p.tg.y); });
      err = (err / particles.length * 100).toFixed(1);
      ctx.fillStyle = c("ink-soft"); ctx.font = "12px monospace";
      ctx.fillText("τ = " + t.toFixed(2) + "   平均落点误差 ≈ " + err + " (越小越好)", PAD, H - 8);
      ctx.fillText("noise  τ=0", PAD, 16); ctx.fillText("action chunk  τ=1", W - 130, 16);
    }

    // 控件
    const ctrls = EBW.el("div", { class: "ctrl-row" });
    const sSlider = EBW.slider("Euler 积分步数 (steps)", 1, 20, 1, steps, (v) => { steps = v; t = 1; draw(); });
    ctrls.appendChild(sSlider.wrap);
    const modeSeg = EBW.seg([{ label: "rectified flow (直)", value: "rectified" }, { label: "diffusion (弯)", value: "curved" }], mode, (v) => { mode = v; draw(); });
    const segCtrl = EBW.el("div", { class: "ctrl" }); segCtrl.appendChild(EBW.el("label", null, "<span>向量场形态</span>")); segCtrl.appendChild(modeSeg); ctrls.appendChild(segCtrl);
    const playBtn = EBW.el("button", { class: "btn primary" }, "▶ 积分动画");
    const resBtn = EBW.el("button", { class: "btn" }, "↻ 重采样 noise");
    const btnWrap = EBW.el("div", { class: "ctrl" }); btnWrap.appendChild(EBW.el("label", null, "<span>&nbsp;</span>"));
    const bb = EBW.el("div", { style: "display:flex;gap:8px" }); bb.appendChild(playBtn); bb.appendChild(resBtn); btnWrap.appendChild(bb); ctrls.appendChild(btnWrap);

    let raf = null;
    playBtn.addEventListener("click", () => {
      if (EBW.reduced) { t = 1; draw(); return; }
      cancelAnimationFrame(raf); t = 0;
      const tick = () => { t = Math.min(1, t + 0.02); draw(); if (t < 1) raf = requestAnimationFrame(tick); };
      tick();
    });
    resBtn.addEventListener("click", () => { seed = (seed * 7 + 13) % 9973; sample(); t = 1; draw(); });

    root.appendChild(cv); root.appendChild(ctrls);
    sample(); draw();
    window.addEventListener("resize", draw);
  };
})();
