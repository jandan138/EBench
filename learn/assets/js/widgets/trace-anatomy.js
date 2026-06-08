/* trace-anatomy — EOS 的 EpisodeTrace 是唯一的"证据单元"。
   点高亮的字段看它为什么在这里：复现元数据、防特权泄漏、claim boundary。 */
(function () {
  window.EBWidgets["trace-anatomy"] = function (root) {
    const c = (n) => EBW.c(n);
    const fields = {
      episode_id: "这条轨迹的唯一 id。一条 trace = 一个 episode = 一份自包含证据。",
      seed: "随机种子。配合 versions 一起，让这条轨迹可被逐字节复现。",
      versions: "复现三件套：repo_commit + task_spec + scene_spec。回答「这分是用哪版代码/任务/场景跑出来的」。",
      backend_components: "记录实际用的 platform/physics/renderer，而非笼统一句『Isaac』。跨后端比较时这是归因依据。",
      privileged_state_policy: "默认 model_input_excludes_privileged_state：声明模型没看过特权信息（真值姿态等）。防作弊的元数据。",
      claim_boundary: "这条证据能宣称什么、不能宣称什么。例如『仅 trace 证据，不含真实世界安全结论』。防 overclaim 的核心。",
      steps: "逐步 TraceStep 序列：observation / action / canonical_physical_state / task_world_state / prediction / metric_results / privileged_state_visible_to_model。",
      episode_metrics: "本 episode 聚合后的指标（task_success 等）。由 Evaluator 写入。",
    };
    const lines = [
      ["{", null, 0],
      ['"episode_id": "ep-7f3a…",', "episode_id", 1],
      ['"task_id": "pickup_tube_v1",', null, 1],
      ['"scenario_pack": "scientific_lab",', null, 1],
      ['"seed": 42,', "seed", 1],
      ['"versions": { "repo_commit": "abc123", "task_spec": "…", "scene_spec": "…" },', "versions", 1],
      ['"backend_components": { "physics": "mujoco", "renderer": "blender_cycles" },', "backend_components", 1],
      ['"privileged_state_policy": "model_input_excludes_privileged_state",', "privileged_state_policy", 1],
      ['"claim_boundary": "Trace evidence only; no real-world safety claim.",', "claim_boundary", 1],
      ['"steps": [ { step_index, observation, action, canonical_physical_state, … } ],', "steps", 1],
      ['"episode_metrics": { "task_success": true }', "episode_metrics", 1],
      ["}", null, 0],
    ];
    const pre = EBW.el("div", { style: "font-family:var(--mono);font-size:.82rem;line-height:1.7;background:var(--surface-2);border:1px solid var(--border);border-radius:10px;padding:14px 16px;overflow:auto" });
    const panel = EBW.el("div", { style: "margin-top:10px;min-height:48px;background:var(--accent-soft);border-left:3px solid var(--accent);border-radius:8px;padding:10px 14px;font-size:.86rem;line-height:1.6;color:var(--ink)" });
    panel.innerHTML = "点击下方<b>高亮字段</b>，看它在「可复现 / 防泄漏 / 不过度宣称」上各扮演什么角色。";

    let active = null;
    lines.forEach(([txt, key, indent]) => {
      const row = EBW.el("div", { style: `padding-left:${indent * 18}px;white-space:pre-wrap` });
      if (key) {
        const span = EBW.el("span", { style: "cursor:pointer;border-radius:4px;padding:0 3px;background:var(--interactive-soft);color:var(--interactive);transition:.12s" }, txt);
        span.addEventListener("click", () => {
          if (active) { active.style.background = "var(--interactive-soft)"; active.style.color = c("interactive"); }
          active = span; span.style.background = c("interactive"); span.style.color = "#fff";
          panel.innerHTML = `<b style="font-family:var(--mono)">${key}</b> — ${fields[key]}`;
        });
        row.appendChild(span);
      } else { row.appendChild(document.createTextNode(txt)); row.style.color = c("ink-faint"); }
      pre.appendChild(row);
    });
    root.appendChild(pre); root.appendChild(panel);
  };
})();
