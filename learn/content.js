/*
 * content.js — 导航单一真相源 (single source of truth)
 * 驱动：左侧 TOC 树、上下页导航、封面目录、客户端搜索。
 * 每个 section: { id, title, file, keywords }
 * file 路径相对于 learn/ 根目录。
 */
window.EBOOK = {
  title: "EBench",
  subtitle: "一本娓娓道来的交互式教程",
  parts: [
    {
      id: "p0",
      label: "Part 0",
      title: "序章 · Orientation",
      sections: [
        { id: "0-1", title: "从 success rate 到 capability profile", file: "chapters/00-orientation/0-1-why-ebench.html",
          keywords: "why ebench capability profile success rate benchmark 愿景 多轴诊断" },
        { id: "0-2", title: "The repo constellation", file: "chapters/00-orientation/0-2-constellation.html",
          keywords: "repo genmanip genmanip-client assets dataset docs leaderboard 架构地图" },
        { id: "0-3", title: "怎么读这本书 · 两座桥", file: "chapters/00-orientation/0-3-how-to-read.html",
          keywords: "how to read bridge RL games103 受众 阅读指南" },
      ],
    },
    {
      id: "p1",
      label: "Part 1",
      title: "问题域 · Manipulation & VLA",
      sections: [
        { id: "1-1", title: "从 RL 到 behavior cloning：生成式策略", file: "chapters/01-problem/1-1-rl-to-bc.html",
          keywords: "reinforcement learning behavior cloning imitation generative policy 模仿学习 策略" },
        { id: "1-2", title: "什么是 VLA：VLM backbone + action", file: "chapters/01-problem/1-2-what-is-vla.html",
          keywords: "vla vision language action vlm paligemma backbone 多模态" },
        { id: "1-3", title: "本体 lift2：双臂 + 移动底盘 + 4 相机", file: "chapters/01-problem/1-3-lift2-embodiment.html",
          keywords: "lift2 embodiment dual arm mobile base camera state joints gripper 本体" },
      ],
    },
    {
      id: "p2",
      label: "Part 2",
      title: "仿真地基 · Simulation Stack",
      sections: [
        { id: "2-1", title: "Isaac Sim = USD + PhysX + RTX", file: "chapters/02-sim/2-1-isaac-sim.html",
          keywords: "isaac sim usd physx rtx omniverse 仿真 渲染 物理 games103" },
        { id: "2-2", title: "cuRobo：GPU 运动规划与 IK", file: "chapters/02-sim/2-2-curobo.html",
          keywords: "curobo motion planning inverse kinematics collision GPU 轨迹优化" },
        { id: "2-3", title: "GenManip：把仿真做成黑盒服务器", file: "chapters/02-sim/2-3-genmanip.html",
          keywords: "genmanip server llm scene generation black box 仿真服务器" },
        { id: "2-4", title: "LeRobot 数据格式与 EBench 数据集", file: "chapters/02-sim/2-4-lerobot-dataset.html",
          keywords: "lerobot dataset parquet mp4 episodes modality 数据集 teleop rule-based" },
      ],
    },
    {
      id: "p3",
      label: "Part 3",
      title: "Benchmark 方法论",
      sections: [
        { id: "3-1", title: "Capability profile 的愿景", file: "chapters/03-methodology/3-1-capability-profile.html",
          keywords: "capability profile 5-axis diagnostic scene skill horizon precision mobility 愿景" },
        { id: "3-2", title: "3 tracks × 3 splits 与训练/测试隔离", file: "chapters/03-methodology/3-2-tracks-splits.html",
          keywords: "tracks splits mobile_manip table_top_manip generalist val_train val_unseen test isolation" },
        { id: "3-3", title: "26 个任务与打分规则", file: "chapters/03-methodology/3-3-tasks-scoring.html",
          keywords: "26 tasks long horizon pick place dexterous scoring partial credit temporal subgoal 打分" },
        { id: "3-4", title: "泛化轴：Object/Background/Instruction/Mixed", file: "chapters/03-methodology/3-4-generalization.html",
          keywords: "generalization object background instruction mixed ood 泛化" },
        { id: "3-5", title: "指标与诊断报告（愿景 vs 现实）", file: "chapters/03-methodology/3-5-metrics-report.html",
          keywords: "metrics task score leaderboard radar heatmap transfer curve 诊断报告 指标" },
      ],
    },
    {
      id: "p4",
      label: "Part 4",
      title: "评测引擎 · Client–Server",
      sections: [
        { id: "4-1", title: "为什么是 client–server：依赖隔离", file: "chapters/04-engine/4-1-client-server.html",
          keywords: "client server dependency isolation black box 依赖隔离 架构" },
        { id: "4-2", title: "EvalClient 契约：reset/step/close 与 obs", file: "chapters/04-engine/4-2-evalclient.html",
          keywords: "evalclient reset step close observation schema worker_id 契约 观测" },
        { id: "4-3", title: "Action 向量解剖：16/19-D 与 base_motion", file: "chapters/04-engine/4-3-action-vector.html",
          keywords: "action vector 16 19 base_motion is_rel base_is_rel ee_pose control_type 动作" },
        { id: "4-4", title: "Chunk vs step、receding horizon 与并行", file: "chapters/04-engine/4-4-chunk-step.html",
          keywords: "chunk step mode receding horizon worker parallel replan 并行 重规划" },
        { id: "4-5", title: "gmp CLI 与 online challenge", file: "chapters/04-engine/4-5-gmp-cli.html",
          keywords: "gmp cli submit eval status plot visualize online challenge token leaderboard" },
      ],
    },
    {
      id: "p5",
      label: "Part 5",
      title: "VLA 理论 · The Engine Inside",
      sections: [
        { id: "5-1", title: "Compounding error → action chunking (ACT)", file: "chapters/05-theory/5-1-action-chunking.html",
          keywords: "compounding error covariate shift action chunking act horizon 模仿误差 分块" },
        { id: "5-2", title: "回归与 MSE：最基础的「拟合」", file: "chapters/05-theory/5-2-regression-mse.html",
          keywords: "regression 回归 mse mean squared error 均方误差 拟合 最小二乘 监督学习 loss" },
        { id: "5-3", title: "为什么「回归动作本身」会平均化", file: "chapters/05-theory/5-3-mode-averaging.html",
          keywords: "behavior cloning mode averaging 平均化 多模态 multimodal 回归动作 撞墙 绕路" },
        { id: "5-4", title: "生成模型的思路：从噪声到答案", file: "chapters/05-theory/5-4-generative-idea.html",
          keywords: "generative model 生成模型 diffusion 去噪 denoise noise distribution 分布 采样 sample" },
        { id: "5-5", title: "Flow Matching：回归「流动方向」", file: "chapters/05-theory/5-5-flow-matching.html",
          keywords: "flow matching 流动方向 vector field 向量场 probability path 概率路径 conditional 速度" },
        { id: "5-6", title: "Rectified Flow：把流拉直 = 回归速度场", file: "chapters/05-theory/5-6-rectified-flow.html",
          keywords: "rectified flow 拉直 速度场 velocity ode euler 积分 少步 inference 推理" },
        { id: "5-7", title: "Action expert：Transfusion 与 MoE", file: "chapters/05-theory/5-7-action-expert.html",
          keywords: "action expert transfusion mixture of experts attention mask 专家" },
        { id: "5-8", title: "离散 vs 连续、FAST、knowledge insulation", file: "chapters/05-theory/5-8-discrete-continuous.html",
          keywords: "discrete continuous fast tokenizer knowledge insulation stop gradient 离散 连续" },
      ],
    },
    {
      id: "p6",
      label: "Part 6",
      title: "Baseline 全链路",
      sections: [
        { id: "6-1", title: "π0 / π0.5（openpi）", file: "chapters/06-baselines/6-1-openpi.html",
          keywords: "pi0 pi05 openpi config ebench inputs outputs websocket serve_policy 相对底盘" },
        { id: "6-2", title: "X-VLA：soft prompt + domain_id", file: "chapters/06-baselines/6-2-xvla.html",
          keywords: "xvla soft prompt domain_id cross embodiment proprio scaling gripper gating run.py" },
        { id: "6-3", title: "InternVLA-A1：MoT + visual foresight", file: "chapters/06-baselines/6-3-internvla-a1.html",
          keywords: "internvla a1 mixture of transformers visual foresight qwen3-vl action queue temporal pair" },
        { id: "6-4", title: "三个策略，一个契约：对比", file: "chapters/06-baselines/6-4-compare.html",
          keywords: "compare baselines contract differences base motion gripper 对比" },
      ],
    },
    {
      id: "p7",
      label: "Part 7",
      title: "实战 · Capstone",
      sections: [
        { id: "7-1", title: "接入自己的模型：最小 ModelClient", file: "chapters/07-capstone/7-1-custom-model.html",
          keywords: "custom model modelclient get_action get_action_chunk integrate 接入" },
        { id: "7-2", title: "本地 vs online，读懂诊断报告", file: "chapters/07-capstone/7-2-local-vs-online.html",
          keywords: "local online challenge submit token diagnostic report 报告" },
        { id: "7-3", title: "追踪一个 episode 的全程", file: "chapters/07-capstone/7-3-trace-episode.html",
          keywords: "trace episode obs model action sim score end to end 全程" },
      ],
    },
    {
      id: "p8",
      label: "Part 8",
      title: "评测系统通论 · The Science of Evaluation",
      sections: [
        { id: "8-1", title: "评测到底在度量什么：construct validity", file: "chapters/08-eval-systems/8-1-what-we-measure.html",
          keywords: "evaluation benchmark construct validity success rate proxy 度量 跑分 测能力 假设 measurement" },
        { id: "8-2", title: "评测系统的解剖学：Spec/State/Runtime/Metric/Report", file: "chapters/08-eval-systems/8-2-anatomy.html",
          keywords: "anatomy spec world state runtime metric report layer 五层 骨架 architecture 解剖" },
        { id: "8-3", title: "契约即架构：abstraction boundary", file: "chapters/08-eval-systems/8-3-contracts.html",
          keywords: "contract abstraction boundary coupling composability interface extensibility 契约 耦合 组合 边界" },
        { id: "8-4", title: "可复现与可信：seed/versioning/claim boundary", file: "chapters/08-eval-systems/8-4-reproducibility.html",
          keywords: "reproducibility seed versioning provenance claim boundary overclaiming 复现 可信 版本 证据" },
        { id: "8-5", title: "指标与聚合的陷阱：no single scalar", file: "chapters/08-eval-systems/8-5-metrics-aggregation.html",
          keywords: "metric aggregation single scalar partial credit weighting simpson paradox 聚合 加权 平均 陷阱" },
        { id: "8-6", title: "泛化怎么评：train/test isolation 与 leakage", file: "chapters/08-eval-systems/8-6-generalization.html",
          keywords: "generalization train test isolation ood out of distribution data leakage split 泛化 隔离 泄漏" },
      ],
    },
    {
      id: "pa",
      label: "Appendix",
      title: "附录 · Reference",
      sections: [
        { id: "a-1", title: "术语表 Glossary", file: "chapters/appendix/a-1-glossary.html",
          keywords: "glossary terms 术语表 词汇" },
        { id: "a-2", title: "Repo & 链接地图", file: "chapters/appendix/a-2-links.html",
          keywords: "links repo map references 链接 仓库" },
        { id: "a-3", title: "速查：obs / action / gmp", file: "chapters/appendix/a-3-cheatsheet.html",
          keywords: "cheatsheet observation action gmp 速查表" },
        { id: "a-4", title: "参考文献 References", file: "chapters/appendix/a-4-references.html",
          keywords: "references papers arxiv 参考文献 论文" },
      ],
    },
  ],
};

/* 扁平化：供上下页导航与搜索使用 */
window.EBOOK.flat = (function () {
  const out = [];
  window.EBOOK.parts.forEach((p) => {
    p.sections.forEach((s) => out.push(Object.assign({ part: p.title, partLabel: p.label }, s)));
  });
  return out;
})();
