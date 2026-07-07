/* multimodal-distribution — 2D 多模态分布可视化（F-8） */
(function () {
  window.EBWidgets["multimodal-distribution"] = function (root) {
    const c = (n) => EBW.c(n);
    let mode = "single"; // single | multi | flow

    const wrap = EBW.el("div");
    const seg = EBW.seg(
      [{label:"单高斯", value:"single"}, {label:"多模态（真实）", value:"multi"}, {label:"Flow 采样", value:"flow"}],
      mode, v => { mode = v; render(); }
    );
    wrap.appendChild(seg);

    const canvas = EBW.el("canvas", { width: 420, height: 260, style: "border:1px solid var(--border);border-radius:8px;background:#0b0c14;display:block;margin:10px auto" });
    const ctx = canvas.getContext("2d");
    const cap = EBW.el("div", { style: "font-size:.8rem;text-align:center;color:var(--ink-faint)" });

    function draw() {
      ctx.fillStyle = "#0b0c14";
      ctx.fillRect(0,0,420,260);

      const cx = 210, cy = 130;

      if (mode === "single") {
        // 单峰高斯（撞障碍物）
        ctx.fillStyle = "rgba(107,163,255,0.35)";
        ctx.beginPath();
        ctx.ellipse(cx, cy, 55, 38, 0, 0, Math.PI*2);
        ctx.fill();
        ctx.fillStyle = "#6ba3ff";
        ctx.fillRect(cx-3, cy-3, 6, 6);
        cap.textContent = "单高斯只能有一个峰 → 平均到障碍物中心";
      } else if (mode === "multi") {
        // 两个峰（绕上 + 绕下）
        ctx.fillStyle = "rgba(45,212,191,0.4)";
        ctx.beginPath(); ctx.ellipse(cx-52, cy-38, 38, 28, -0.6, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(cx+48, cy+42, 38, 28, 0.5, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = "#2dd4bf";
        ctx.fillRect(cx-55, cy-41, 5, 5);
        ctx.fillRect(cx+45, cy+39, 5, 5);
        cap.textContent = "真实数据是多模态的（两条都对的路）";
      } else {
        // flow 采样点
        ctx.fillStyle = "#2dd4bf";
        for (let i=0; i<28; i++) {
          const t = i/27;
          const x = cx - 70 + t*140 + (Math.sin(t*6)*12);
          const y = cy - 50 + t*100 + (Math.cos(t*5)*8);
          ctx.fillRect(x, y, 4, 4);
        }
        cap.textContent = "Flow / Diffusion 可以从不同噪声采样到不同模态";
      }

      // 障碍物
      ctx.fillStyle = "#f0b86c";
      ctx.fillRect(cx-12, cy-12, 24, 24);
      ctx.fillStyle = "#0b0c14";
      ctx.fillText("障碍", cx-18, cy+4);
    }

    function render() {
      draw();
    }

    wrap.appendChild(canvas);
    wrap.appendChild(cap);
    root.appendChild(wrap);
    render();
  };
})();
