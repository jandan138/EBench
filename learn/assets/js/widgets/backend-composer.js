/* backend-composer — EOS 的 BackendProfile 不说"Isaac vs MuJoCo"，
   而把后端拆成 platform/physics/renderer/control 等可组合组件，每项带 CapabilityTier。
   选两套配置，工具告诉你这次跨后端对比"哪一项可比、哪一项不可比"。 */
(function () {
  window.EBWidgets["backend-composer"] = function (root) {
    const c = (n) => EBW.c(n);
    const axes = [
      { k: "physics", label: "physics", opts: ["mujoco", "physx", "genesis", "semantic_proxy"] },
      { k: "renderer", label: "renderer", opts: ["isaac_rtx", "blender_cycles", "mujoco_gl", "none"] },
      { k: "control", label: "control", opts: ["joint_position", "ee_pose", "direct_delta"] },
    ];
    // 给每个组件一个能力档（示意）
    const tier = { mujoco: "native", physx: "native", genesis: "native", semantic_proxy: "semantic_proxy",
      isaac_rtx: "native", blender_cycles: "reduced", mujoco_gl: "reduced", none: "unsupported",
      joint_position: "native", ee_pose: "reduced", direct_delta: "emulated" };
    const tierColor = { native: "interactive", reduced: "warn", semantic_proxy: "g103", emulated: "warn", unsupported: "ink-faint" };

    const A = { physics: "mujoco", renderer: "blender_cycles", control: "joint_position" };
    const B = { physics: "physx", renderer: "isaac_rtx", control: "joint_position" };

    const wrap = EBW.el("div");
    function profileCol(name, cfg, color) {
      const col = EBW.el("div", { style: "flex:1;min-width:220px" });
      col.appendChild(EBW.el("div", { style: `font-family:var(--mono);font-size:.8rem;color:${c(color)};margin-bottom:8px` }, `Profile ${name}`));
      axes.forEach((ax) => {
        const row = EBW.el("div", { class: "ctrl", style: "margin-bottom:8px" });
        row.appendChild(EBW.el("label", null, `<span>${ax.label}</span>`));
        row.appendChild(EBW.seg(ax.opts.map((o) => ({ label: o, value: o })), cfg[ax.k], (v) => { cfg[ax.k] = v; render(); }));
        col.appendChild(row);
      });
      return col;
    }
    const cols = EBW.el("div", { style: "display:flex;gap:24px;flex-wrap:wrap;margin-bottom:6px" });
    cols.appendChild(profileCol("A", A, "rl"));
    cols.appendChild(profileCol("B", B, "g103"));
    const verdict = EBW.el("div", { style: "background:var(--surface-2);border:1px solid var(--border);border-radius:10px;padding:12px 14px;font-size:.86rem;line-height:1.6" });

    function render() {
      let rows = "";
      axes.forEach((ax) => {
        const same = A[ax.k] === B[ax.k];
        const ta = tier[A[ax.k]], tb = tier[B[ax.k]];
        const ok = same && ta === "native";
        const verb = same ? (ta === "native" ? "✅ 可比（同组件、native）" : `⚠ 同组件但档位=${ta}，结论需带 claim boundary`)
          : `🚫 不可比：A=${A[ax.k]}(${ta}) ≠ B=${B[ax.k]}(${tb})`;
        rows += `<div style="display:flex;justify-content:space-between;gap:10px"><span style="font-family:var(--mono);color:${c(ok ? 'interactive' : (same ? 'warn' : 'ink-faint'))}">${ax.label}</span><span style="color:var(--ink-soft)">${verb}</span></div>`;
      });
      const comparable = axes.filter((ax) => A[ax.k] === B[ax.k]);
      let head;
      if (comparable.length === axes.length && comparable.every((ax) => tier[A[ax.k]] === "native"))
        head = `<b style="color:var(--interactive)">三项组件全相同 → 这是一次干净的可比实验。</b>`;
      else if (comparable.length === 0)
        head = `<b style="color:var(--warn)">没有任何组件相同 → "A 比 B 好" 这种笼统结论<b>不成立</b>，差异来源无法归因。</b>`;
      else
        head = `仅 <b>${comparable.map((a) => a.label).join("、")}</b> 相同：只能在这几项受控的前提下比较，其余维度的差异不能归因到模型。`;
      verdict.innerHTML = head + `<div style="margin-top:8px;display:flex;flex-direction:column;gap:4px">${rows}</div>`;
    }

    wrap.appendChild(cols); wrap.appendChild(verdict);
    root.appendChild(wrap); render();
  };
})();
