/* vla-stack — VLA 训练系统七层总图（数据→样本→表示→模型→训练→推理→评测）。
   点一层：看它装什么、以及 π0.5 / LabVLA 在这一层的实例。Part 5.5 的地图。 */
(function () {
  window.EBWidgets["vla-stack"] = function (root) {
    const layers = [
      { k: "Data", zh: "数据层", color: "accent",
        what: "所有原始供给：web 图文/VQA、真实机器人演示、仿真成功 rollout、结构化标注。它们格式各异、监督信号各异——这正是后面所有分层的原因。",
        pi: "π0.5：多本体数据 + ~400h 真实家庭移动操作 + 高层子任务标注 + web 数据。",
        lab: "LabVLA：Robointer-VQA、AgiBot World Beta、OXE-AugE、DROID + RoboGenesis 合成的 LabEmbodied-Data。" },
      { k: "Sample", zh: "样本层", color: "interactive",
        what: "把 episode 切成监督样本：(image, language, robot state) → action chunk（有动作标签时）或 → 文本答案（VQA/子任务时）。一条 rollout 切出 ~T 个样本。",
        pi: "π0.5：(o_t, q_t, ℓ) → a_{t:t+50}；高层数据切成 obs → subtask 文本。",
        lab: "LabVLA：同款切片，K=50；样本还带 subtask / object-state 等结构化标注字段。" },
      { k: "Repr", zh: "表示层", color: "rl",
        what: "同一个物理量可以有多种表示：text token、image token、离散 FAST action token、连续 action 向量。选哪种表示，决定了能用哪种 loss。",
        pi: "π0.5：预训练把动作过 FAST tokenizer 变离散 token；后训练用连续向量。",
        lab: "LabVLA：一样的双表示——FAST token（预训练）+ 连续 chunk（后训练），action 向量 pad 到 32 维。" },
      { k: "Model", zh: "模型层", color: "g103",
        what: "VLM backbone（大脑）+ action expert / DiT（小脑）+ projection + attention mask。前向时 expert 读 backbone 的 hidden states。",
        pi: "π0.5：PaliGemma 3B backbone + ~300M action expert（Transfusion 式双权重）。",
        lab: "LabVLA：Qwen3-VL-4B-Instruct backbone + DiT action expert。" },
      { k: "Train", zh: "训练层", color: "warn",
        what: "loss 与梯度路线的总开关：CE（文本/VQA/FAST token）→ backbone；flow matching → action expert；knowledge insulation 的 stop-gradient 决定谁的梯度许回谁。",
        pi: "π0.5：FAST CE 预训练 backbone → flow matching 后训练 expert（KI 论文：stop-gradient 挡回流）。",
        lab: "LabVLA：VLM pretraining 100k（全 CE）→ KI posttraining 80k（flow + stop-grad）→ finetuning 80k（delta 目标）。" },
      { k: "Infer", zh: "推理层", color: "accent",
        what: "部署时的解码路径：可选先离散解码高层 subtask，再连续积分出 action chunk，receding horizon 执行（执行前缀、replan）。",
        pi: "π0.5：先自回归吐 “pick up the plate” 再 flow 出 50 步 chunk（5-8 讲过）。",
        lab: "LabVLA：flow 出 K=50 的连续 chunk 直接驱动机器人。" },
      { k: "Eval", zh: "评测层", color: "interactive",
        what: "考试场：success/failure、ID/OOD、过程证据、失败原因。这一层不训练任何东西，但决定你能对模型下什么结论。",
        pi: "π0.5：进 104 个真实新场景做开放世界评测（5-8 讲过）。",
        lab: "LabVLA：LabUtopia 6 任务 × ID/OOD × 120 episodes；另有 Franka 真机 4 任务。" },
    ];
    let sel = 0;
    const c = (n) => EBW.c(n);

    const wrap = EBW.el("div", { style: "display:flex;gap:16px;flex-wrap:wrap;align-items:flex-start" });
    const stack = EBW.el("div", { style: "flex:0 0 190px;display:flex;flex-direction:column;gap:5px" });
    const panel = EBW.el("div", { style: "flex:1;min-width:250px;background:var(--surface-2);border:1px solid var(--border);border-radius:10px;padding:14px 16px" });

    const btns = layers.map((L, i) => {
      const b = EBW.el("button", {
        style: "text-align:left;border:1px solid var(--border-strong);border-radius:8px;padding:7px 11px;cursor:pointer;background:var(--surface);color:var(--ink);font-family:var(--sans);transition:.12s;position:relative",
      });
      b.innerHTML = `<span style="font-family:var(--mono);font-size:.68rem;color:var(--ink-faint);margin-right:7px">L${i + 1}</span><b style="font-size:.88rem">${L.k}</b> <span style="color:var(--ink-faint);font-size:.76rem">${L.zh}</span>`;
      b.addEventListener("click", () => { sel = i; render(); });
      stack.appendChild(b);
      if (i < layers.length - 1) {
        stack.appendChild(EBW.el("div", { style: "text-align:center;color:var(--ink-faint);font-size:.7rem;line-height:.7" }, "↓"));
      }
      return b;
    });

    function render() {
      const L = layers[sel];
      btns.forEach((b, i) => {
        const on = i === sel;
        b.style.borderColor = on ? c(layers[i].color) : c("border-strong");
        b.style.background = on ? c(layers[i].color) + "1a" : c("surface");
        b.style.boxShadow = on ? `inset 3px 0 0 ${c(layers[i].color)}` : "none";
      });
      panel.innerHTML =
        `<div style="font-family:var(--mono);font-size:.7rem;text-transform:uppercase;letter-spacing:.6px;color:${c(L.color)};margin-bottom:4px">L${sel + 1} · ${L.zh}</div>` +
        `<div style="font-weight:600;font-size:1.02rem;margin-bottom:8px">${L.k} layer</div>` +
        `<p style="margin:0 0 10px;color:var(--ink-soft);line-height:1.6;font-size:.9rem">${L.what}</p>` +
        `<div style="display:grid;grid-template-columns:auto 1fr;gap:6px 10px;font-size:.83rem;line-height:1.55">` +
        `<span style="font-family:var(--mono);color:var(--rl);white-space:nowrap">π0.5</span><span style="color:var(--ink-soft)">${L.pi.replace(/^π0\.5：/, "")}</span>` +
        `<span style="font-family:var(--mono);color:var(--g103);white-space:nowrap">LabVLA</span><span style="color:var(--ink-soft)">${L.lab.replace(/^LabVLA：/, "")}</span>` +
        `</div>`;
    }

    wrap.appendChild(stack); wrap.appendChild(panel);
    root.appendChild(wrap);
    render();
  };
})();
