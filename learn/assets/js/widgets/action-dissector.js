/* action-dissector — 解剖 baseline 模型输出的 19-D raw action，
   以及它如何被重排成 server 契约的 {action(16) + base_motion(3)}。
   切换 baseline 看各自的缩放 / gripper / base 处理差异。 */
(function () {
  window.EBWidgets["action-dissector"] = function (root) {
    const groups = [
      { key: "larm", name: "左臂关节", range: "[0:6]", n: 6, color: "accent" },
      { key: "rarm", name: "右臂关节", range: "[6:12]", n: 6, color: "rl" },
      { key: "grip", name: "夹爪 gripper", range: "[12:16]", n: 4, color: "interactive" },
      { key: "base", name: "底盘 base", range: "[16:19]", n: 3, color: "g103" },
    ];
    const notes = {
      contract: {
        larm: "server 契约里，左臂 6 个 joint position 进入 action[0:6]。",
        rarm: "右臂 6 个 joint，被插到 action[8:14]（夹爪夹在中间）。",
        grip: "4 维：左 2 指 + 右 2 指。契约 action 排布为 [j0-5, gripL(2), j6-11, gripR(2)] 共 16 维。",
        base: "base_motion = (Δx, Δy, Δyaw)，与 action 分开提交；base_is_rel 决定是否相对量。",
      },
      openpi: {
        larm: "π0/π0.5：EBenchInputs 把 state.joints+gripper 拼成 state 喂模型；输出 action[:19]。",
        rarm: "prep_output 把 action[:6] / action[6:12] 与 gripper[12:16] 交错重排成 server 顺序。",
        grip: "gripper 原样输出（不做阈值化）。",
        base: "base_motion = action[16:19] − 上一帧累计；base_is_rel = True（相对增量）。",
      },
      xvla: {
        larm: "X-VLA：proprio = [joints(6), base_scaled(3), gripper×20(4)]；推理走 inference_api。",
        rarm: "输出 chunk 后按训练缩放还原：action[:,12:14]/=10, [:,14]*=10, [:,15:19]/=20。",
        grip: "gripper 做阈值门控：<0.001 视为不动并置 -0.01。",
        base: "base_is_rel = False（绝对）；这是与另两者最大的不同。",
      },
      a1: {
        larm: "InternVLA-A1：_pack_action_fields 重排为 [j0-5, gripL(2), j6-11, gripR(2)]。",
        rarm: "delta 模式下 action[:12] 加回初始 state 还原绝对关节角。",
        grip: "gripper 离散化：<0.005→0.0，否则→0.044。",
        base: "predicted_rel_base 相对 chunk 起点；target = chunk_start_base + Δ；base_is_rel = True。",
      },
    };
    let baseline = "contract", active = "larm";

    const wrap = EBW.el("div");
    const bar = EBW.el("div", { style: "display:flex;gap:3px;flex-wrap:wrap;margin-bottom:4px" });
    let cells = [];
    groups.forEach((g) => {
      const gb = EBW.el("div", { style: "display:flex;flex-direction:column;align-items:center;cursor:pointer", "data-g": g.key });
      const row = EBW.el("div", { style: "display:flex;gap:2px" });
      for (let i = 0; i < g.n; i++) row.appendChild(EBW.el("div", { style: `width:26px;height:30px;border-radius:4px;background:var(--${g.color});opacity:.78` }));
      const lab = EBW.el("div", { style: "font-size:.68rem;font-family:var(--mono);color:var(--ink-faint);margin-top:4px" }, g.range);
      const nm = EBW.el("div", { style: "font-size:.74rem;margin-top:1px" }, g.name);
      gb.appendChild(row); gb.appendChild(lab); gb.appendChild(nm);
      gb.addEventListener("click", () => { active = g.key; update(); });
      bar.appendChild(gb); cells.push(gb);
    });

    const detail = EBW.el("div", { class: "callout note", style: "margin:12px 0 0" });

    const ctrls = EBW.el("div", { class: "ctrl-row", style: "margin-top:12px" });
    const bw = EBW.el("div", { class: "ctrl" }); bw.appendChild(EBW.el("label", null, "<span>视角 baseline</span>"));
    bw.appendChild(EBW.seg([
      { label: "server 契约", value: "contract" }, { label: "π0 / π0.5", value: "openpi" },
      { label: "X-VLA", value: "xvla" }, { label: "InternVLA-A1", value: "a1" },
    ], baseline, (v) => { baseline = v; update(); }));
    ctrls.appendChild(bw);

    function update() {
      cells.forEach((gb) => gb.style.outline = gb.dataset.g === active ? "2px solid var(--ink)" : "none");
      cells.forEach((gb) => gb.querySelectorAll("div > div").forEach(() => {}));
      const g = groups.find((x) => x.key === active);
      detail.innerHTML = `<div class="c-h">${g.name} <span class="term">${g.range}</span></div><p>${notes[baseline][active]}</p>`;
    }

    wrap.appendChild(bar); wrap.appendChild(detail); wrap.appendChild(ctrls);
    root.appendChild(wrap); update();
  };
})();
