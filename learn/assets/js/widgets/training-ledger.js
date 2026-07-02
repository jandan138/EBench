/* training-ledger — π0.5 / LabVLA 训练账本。
   切模型、点阶段：看这一阶段输入什么、监督什么、什么 loss、更新谁。 */
(function () {
  window.EBWidgets["training-ledger"] = function (root) {
    const MODELS = {
      pi05: {
        name: "π0.5",
        note: "π0.5 论文 + KI 论文（2505.23705）口径；openpi 开源实现目前只带 flow matching head。",
        stages: [
          {
            k: "Pretraining", zh: "预训练 · co-training", steps: "—",
            input: "多本体机器人数据 + ~400h 真实家庭移动操作 + 高层子任务标注 + 物体检测 + web 图文",
            target: "text token / 高层 subtask 文本 / FAST 离散 action token",
            loss: [{ t: "cross-entropy（next-token）", c: "rl" }],
            update: [{ t: "VLM backbone（PaliGemma 3B）", on: true }, { t: "action expert", on: false, why: "此阶段动作走离散 token，不经过连续 expert" }],
            goal: "让 backbone「懂机器人动作语义」，同时保住 web 知识——离散监督稳定、与语言机制同构。",
          },
          {
            k: "Posttraining", zh: "后训练 · flow matching", steps: "—",
            input: "机器人轨迹数据（obs → 连续 action chunk，H=50）",
            target: "flow matching 的速度场（chunk 的连续去噪方向）",
            loss: [{ t: "flow matching MSE", c: "interactive" }, { t: "离散 CE（KI：继续监督 backbone）", c: "rl" }],
            update: [{ t: "action expert（~300M，随机初始化）", on: true }, { t: "VLM backbone", on: "partial", why: "KI：flow 梯度 stop-gradient 不回流；backbone 只被离散 CE 温和更新" }],
            goal: "获得实时连续控制能力（10 步 Euler 积分），同时不让随机初始化 expert 的乱梯度冲坏 backbone。",
          },
          {
            k: "Inference", zh: "推理 · 分层解码", steps: "无训练",
            input: "当前观测 + 指令",
            target: "先离散自回归解码高层 subtask（\u201cpick up the plate\u201d），再 flow 积分出低层 action chunk",
            loss: [],
            update: [{ t: "任何参数", on: false, why: "推理没有梯度——KI 是训练时机制" }],
            goal: "「说出来再做出来」：语义规划借 web 知识，连续控制走 flow。",
          },
        ],
      },
      labvla: {
        name: "LabVLA",
        note: "LabVLA 论文（2606.13578）口径：正文讲 two-stage recipe，附录超参表给出 100k/80k/80k 三列——第三列是任务微调。",
        stages: [
          {
            k: "VLM pretraining", zh: "预训练", steps: "100k steps",
            input: "Robointer-VQA + AgiBot World Beta + OXE-AugE（LeRobot 子集 ≈572k trajectories）+ DROID",
            target: "VQA 答案 / language subtask / FAST 离散 action token（absolute action targets）",
            loss: [{ t: "cross-entropy（全部监督共用）", c: "rl" }],
            update: [{ t: "Qwen3-VL-4B backbone", on: true }, { t: "DiT action expert", on: false, why: "此阶段 DiT 根本没实例化" }],
            goal: "让 visual-language prefix 先「对动作语义敏感」，再接连续动作头。",
          },
          {
            k: "KI posttraining", zh: "后训练 · KI", steps: "80k steps",
            input: "OXE-AugE + LabEmbodied-Data（RoboGenesis 合成的实验室 rollout）",
            target: "连续 action chunk（K=50）的 flow 速度场（absolute action targets）",
            loss: [{ t: "flow matching MSE（只在活跃 action 维平均）", c: "interactive" }, { t: "annotation CE（继续更新 backbone）", c: "rl" }],
            update: [{ t: "DiT action expert + projection", on: true }, { t: "VLM backbone", on: "partial", why: "stop-gradient：flow loss 不回传 backbone；backbone 仍被 CE 类监督更新" }],
            goal: "学连续控制 + 吸收实验室分布，同时隔离连续梯度对 backbone 的污染。",
          },
          {
            k: "Finetuning", zh: "任务微调", steps: "80k steps",
            input: "下游任务 / 具体机器人 schema 数据",
            target: "delta action targets（增量动作）",
            loss: [{ t: "flow matching MSE", c: "interactive" }],
            update: [{ t: "VLA policy（适配任务）", on: true }],
            goal: "对齐具体任务、具体本体、具体 action schema——论文附录：warmstart checkpoint 的数据构成比架构/学习率影响更大。",
          },
        ],
      },
    };

    let model = "pi05", sel = 0;
    const c = (n) => EBW.c(n);

    const segRow = EBW.el("div", { class: "ctrl-row" });
    segRow.appendChild(EBW.seg(
      [{ label: "π0.5", value: "pi05" }, { label: "LabVLA", value: "labvla" }], model,
      (v) => { model = v; sel = 0; render(); }
    ));
    const noteEl = EBW.el("div", { style: "font-size:.76rem;color:var(--ink-faint);margin:2px 0 10px" });

    const tabs = EBW.el("div", { style: "display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px" });
    const panel = EBW.el("div", { style: "background:var(--surface-2);border:1px solid var(--border);border-radius:10px;padding:14px 16px" });

    function render() {
      const M = MODELS[model];
      noteEl.textContent = M.note;
      tabs.innerHTML = "";
      M.stages.forEach((S, i) => {
        const b = EBW.el("button", {
          style: `border:1px solid ${i === sel ? c("interactive") : c("border-strong")};border-radius:8px;padding:6px 12px;cursor:pointer;` +
            `background:${i === sel ? c("interactive") : c("surface")};color:${i === sel ? "#fff" : "var(--ink-soft)"};font-family:var(--sans);font-size:.82rem`,
        }, `${i + 1}. ${S.k}${S.steps !== "—" && S.steps !== "无训练" ? ` <span style="opacity:.75;font-size:.72rem">${S.steps}</span>` : ""}`);
        b.addEventListener("click", () => { sel = i; render(); });
        tabs.appendChild(b);
        if (i < M.stages.length - 1) tabs.appendChild(EBW.el("span", { style: "align-self:center;color:var(--ink-faint);font-size:.8rem" }, "→"));
      });

      const S = M.stages[sel];
      const lossHtml = S.loss.length
        ? S.loss.map((l) => `<span style="display:inline-block;font-family:var(--mono);font-size:.76rem;color:${c(l.c)};background:${c(l.c)}1a;border:1px solid ${c(l.c)};border-radius:5px;padding:1px 7px;margin:2px 4px 2px 0">${l.t}</span>`).join("")
        : `<span style="color:var(--ink-faint);font-size:.82rem">（无——不训练）</span>`;
      const updHtml = S.update.map((u) => {
        const mark = u.on === true ? "✅ 更新" : u.on === "partial" ? "◑ 部分" : "🚫 不更新";
        const col = u.on === true ? c("interactive") : u.on === "partial" ? c("warn") : c("ink-faint");
        return `<div style="display:flex;gap:8px;align-items:baseline;margin:2px 0"><span style="font-family:var(--mono);font-size:.74rem;color:${col};white-space:nowrap">${mark}</span><span style="font-size:.84rem">${u.t}${u.why ? ` <span style="color:var(--ink-faint)">— ${u.why}</span>` : ""}</span></div>`;
      }).join("");

      panel.innerHTML =
        `<div style="font-weight:650;font-size:1rem;margin-bottom:2px">${S.k} <span style="color:var(--ink-faint);font-weight:400;font-size:.84rem">${S.zh}${S.steps !== "—" ? " · " + S.steps : ""}</span></div>` +
        `<div style="display:grid;grid-template-columns:auto 1fr;gap:7px 12px;font-size:.86rem;line-height:1.55;margin-top:10px">` +
        `<span style="font-family:var(--mono);font-size:.74rem;color:var(--ink-faint);white-space:nowrap">输入</span><span>${S.input}</span>` +
        `<span style="font-family:var(--mono);font-size:.74rem;color:var(--ink-faint);white-space:nowrap">监督目标</span><span>${S.target}</span>` +
        `<span style="font-family:var(--mono);font-size:.74rem;color:var(--ink-faint);white-space:nowrap">loss</span><span>${lossHtml}</span>` +
        `<span style="font-family:var(--mono);font-size:.74rem;color:var(--ink-faint);white-space:nowrap">更新谁</span><span>${updHtml}</span>` +
        `<span style="font-family:var(--mono);font-size:.74rem;color:var(--ink-faint);white-space:nowrap">目的</span><span style="color:var(--ink-soft)">${S.goal}</span>` +
        `</div>`;
    }

    root.appendChild(segRow);
    root.appendChild(noteEl);
    root.appendChild(tabs);
    root.appendChild(panel);
    render();
  };
})();
