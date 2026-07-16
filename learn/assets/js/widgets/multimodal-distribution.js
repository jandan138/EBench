/* multimodal-distribution — F-8 的点预测、密度峰与采样示意 */
(function () {
  window.EBWidgets["multimodal-distribution"] = function (root) {
    let mode = "point";

    const wrap = EBW.el("div");
    const seg = EBW.seg(
      [
        { label: "MSE 点预测", value: "point" },
        { label: "单高斯（一个峰）", value: "single" },
        { label: "多峰（两座山）", value: "multi" },
        { label: "从噪声采样", value: "sample" },
      ],
      mode,
      (value) => { mode = value; render(); },
    );
    const modeStatus = EBW.el("div", {
      style: "margin:8px 0;padding:6px 10px;border-radius:6px;background:var(--accent-soft);font-size:.85rem;color:var(--ink-soft)",
    });
    const canvas = EBW.el("canvas", {
      width: 420,
      height: 260,
      style: "border:1px solid var(--border);border-radius:8px;background:#0b0c14;display:block;max-width:100%;height:auto;margin:10px auto",
    });
    const ctx = canvas.getContext("2d");
    const cap = EBW.el("div", { style: "font-size:.8rem;text-align:center;color:var(--ink-faint)" });

    const cx = 210;
    const cy = 130;

    function text(label, x, y, color) {
      ctx.fillStyle = color;
      ctx.font = "12px sans-serif";
      ctx.fillText(label, x, y);
    }

    function obstacle() {
      ctx.fillStyle = "#f0b86c";
      ctx.fillRect(cx - 12, cy - 12, 24, 24);
      ctx.strokeStyle = "#ffd79a";
      ctx.lineWidth = 1;
      ctx.strokeRect(cx - 12, cy - 12, 24, 24);
      text("障碍", cx - 18, cy - 19, "#f0b86c");
    }

    function densityEllipse(x, y, rx, ry, color) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    function path(points, color) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(points[0][0], points[0][1]);
      points.slice(1).forEach(([x, y]) => ctx.lineTo(x, y));
      ctx.stroke();
      const [x, y] = points[points.length - 1];
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    function draw() {
      ctx.fillStyle = "#0b0c14";
      ctx.fillRect(0, 0, 420, 260);
      obstacle();

      if (mode === "point") {
        ctx.fillStyle = "#ff7070";
        ctx.beginPath();
        ctx.arc(cx, cy, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#ffe0e0";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        text("一个点预测（撞上障碍）", cx + 18, cy - 14, "#ffd0d0");
        cap.textContent = "MSE 点预测：只能交一个动作点；在这个示意里，红点与障碍物重合。";
      } else if (mode === "single") {
        densityEllipse(cx, cy, 100, 48, "rgba(107,163,255,0.32)");
        ctx.strokeStyle = "#6ba3ff";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(cx, cy, 100, 48, 0, 0, Math.PI * 2);
        ctx.stroke();
        text("一个峰的密度山", cx - 50, cy - 58, "#b9d2ff");
        cap.textContent = "单高斯（一个峰）：有中心和宽度，但仍会给两个合理峰之间分配一些密度。";
      } else if (mode === "multi") {
        densityEllipse(cx - 58, cy - 50, 42, 30, "rgba(45,212,191,0.42)");
        densityEllipse(cx + 58, cy + 50, 42, 30, "rgba(45,212,191,0.42)");
        text("左绕峰", cx - 88, cy - 88, "#8ff0df");
        text("右绕峰", cx + 34, cy + 94, "#8ff0df");
        cap.textContent = "多峰（两座山）：左绕和右绕分别是高密度区域，而不是被平均成一个点。";
      } else {
        const seedA = [72, 188];
        const seedB = [72, 72];
        ctx.fillStyle = "#d5d9e8";
        [seedA, seedB].forEach(([x, y]) => {
          ctx.beginPath();
          ctx.arc(x, y, 4, 0, Math.PI * 2);
          ctx.fill();
        });
        text("噪声起点", 34, 38, "#d5d9e8");
        path([seedA, [130, 205], [185, 190], [258, 185], [330, 176]], "#2dd4bf");
        path([seedB, [130, 55], [185, 68], [255, 72], [330, 84]], "#2dd4bf");
        text("最终样本", 312, 62, "#8ff0df");
        text("最终样本", 312, 202, "#8ff0df");
        cap.textContent = "从噪声采样：两条线是采样过程的二维示意；右侧圆点才是两个最终样本，不是穿过障碍物的最终动作。";
      }

    }

    function render() {
      draw();
      const labels = {
        point: "MSE 点预测（一个点）",
        single: "单高斯（一个峰）",
        multi: "多峰（两座山）",
        sample: "从噪声采样（起点 → 最终样本）",
      };
      modeStatus.innerHTML = `当前视图：<b>${labels[mode]}</b>`;
    }

    wrap.appendChild(seg);
    wrap.appendChild(modeStatus);
    wrap.appendChild(canvas);
    wrap.appendChild(cap);
    root.appendChild(wrap);
    render();
  };
})();
