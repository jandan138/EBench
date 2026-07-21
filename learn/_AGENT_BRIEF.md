# 章节写作 BRIEF（给章节写作 agent）

你在为 **EBench 交互式教程**写章节 HTML。先 Read 两个样板：
- 黄金参考：`chapters/00-orientation/0-1-why-ebench.html`（**严格模仿它的结构、语气、HTML 用法**）
- 骨架模板：`_template.html`
- 导航源（含所有章节 id/title/file/上下页顺序）：`content.js`

**重要**：现在教程新增了 **Part F · Foundations**（12 节），位于最前面。写任何涉及 Transformer、Attention、Token、回归、CE、Gym、概率分布的内容时，都要考虑是否需要加上“如果你对基础还不熟悉，建议先看 Part F 的 F-X”的提示。原则是**只加不减**，让读者可以根据需要来回学习。

## 受众与语气
- 读者有 **强化学习 (RL) 数学基础 + GAMES103（物理仿真）基础**，是 VLA 领域新人。
- 中文叙述，**娓娓道来**、有"为什么"，不流水账。**英文保留所有架构术语、命令名、性能指标、概念名**（符合论文阅读习惯）。
- 每节开头一句 `<p class="lede">` 导言；结尾用一个小标题收束并预告下一节。

## HTML 规则（务必遵守）
1. 每个文件是完整 HTML，**完整复制参考文件的 `<head>`、topbar、layout、search-overlay、底部 script 块**，只改：
   - `<title>`、`data-section="X-Y"`、`.eyebrow` 里的 `Part 标签 · 小节id`、`<h1>`。
   - `data-root="../../"` 对所有 `chapters/<dir>/*.html` 都适用（两级深度）。
2. **不要手写 prev/next 和侧栏**——`book.js` 会用 `content.js` 自动生成。侧栏 `<nav id="sidebar">`、右栏 `<aside id="rail">` 留空即可。
3. **每个 `<h2>`/`<h3>` 必须带唯一 `id`**（右栏 "On this page" 与 scroll-spy 依赖它）。
4. 术语：`<span class="term">English</span>` 高亮英文术语/命令/类名；`<span class="term-i">italic</span>` 用于强调。
5. 代码块：
   ```html
   <div class="code" data-lang="python"><div class="code-h"><span class="fn">baselines/X-VLA/run.py</span><button class="cp">复制</button></div><pre><code>...原样代码...</code></pre></div>
   ```
   `data-lang` 可为 `python`/`bash`/`json`/`text`。`<code>` 内不要 HTML 转义以外的标记（高亮由 book.js 做）。`&lt; &gt; &amp;` 需转义。
6. 数学：行内 `$...$`，行间 `$$...$$` 或放进 `<div class="math-block">$$...$$</div>`（KaTeX 渲染）。直觉 + 关键公式 + 推导要点，**不要堆满代数**。
7. callout：`<div class="callout note">`（提示）/`<div class="callout warn">`（坑）/`<div class="callout">`（中性）。内部 `<div class="c-h">标题</div>` + `<p>`。
8. **两座桥**（尽量在引入新概念时使用）：
   - `<div class="bridge rl"><div class="c-h"><span class="tag">从 RL 看</span> 标题</div><p>…</p></div>`
   - `<div class="bridge g103"><div class="c-h"><span class="tag">从 GAMES103 看</span> 标题</div><p>…</p></div>`
9. 表格用普通 `<table>`。
10. 章节间交叉引用用相对链接，例如 `<a href="../05-theory/5-2-flow-matching.html">5.2</a>`（按 content.js 的 file 路径）。

## 交互部件（widget）
所有部件脚本已在底部 script 块加载。需要时这样嵌入（放在合适的讲解位置）：
```html
<div class="lab">
  <div class="lab-h"><span class="lab-tag">interactive</span><span class="lab-t">标题</span></div>
  <div class="lab-body" data-widget="WIDGET_NAME"></div>
  <div class="lab-cap">一句说明怎么玩 / 看什么。</div>
</div>
```
可用 `WIDGET_NAME`：
- `flow-matching-ode` —— noise→action chunk 的 Euler 积分动画；rectified vs diffusion。用于 **5.5/5.6**。
- `mode-averaging` —— 回归动作均值化的多模态陷阱。用于 **5.3**。
- `action-chunking` —— receding horizon：H / exec / 扰动。用于 **5.1**（或 4.4）。
- `eval-flow` —— client↔server 时序，chunk vs step。用于 **4.1 或 4.4**。
- `action-dissector` —— 19-D action 向量解剖 + 各 baseline 映射。用于 **4.3**（6.4 可复用）。
- `capability-radar` —— 多轴能力画像（示意）。用于 **3.1**（0-1 已用过一次）。
- `task-taxonomy` —— 26 任务 × 3 family + 打分。用于 **3.3**。
- `moe-attention` —— action expert 的 token 路由与 attention mask。用于 **5.7**。
- `aggregation-pitfall` —— 指标聚合、加权与 Simpson's paradox。用于 **8.5**。
- `eval-anatomy` —— 评测系统五层骨架与隐式/显式实现对照。用于 **8.2**。
- `vla-stack` —— VLA 训练系统七层总图（数据→样本→表示→模型→训练→推理→评测），点层看详情。用于 **5b-1**。
- `episode-slicer` —— episode 时间轴 → (obs_t, action chunk) 训练样本切片；拖 t、调 H。用于 **5b-1**。
- `training-ledger` —— π0.5 / LabVLA 训练账本：点阶段看输入/监督/loss/更新谁。用于 **5b-3**。
- `data-loss-map` —— 数据源 → loss → 更新模块的通路高亮图。用于 **5b-4**。
- `ki-gradient` —— knowledge insulation 计算图：开关 stop-gradient 看梯度回流路径变化。用于 **5b-5**。
- `task-head-switcher` —— 同一份 hidden state 矩阵切换 GPT/BERT/VLM/VLA，看各任务头读哪些行。用于 **f-9**。
- `peft-gradient` —— 同一 backbone 上全量微调 / Adapter / LoRA 三种参数更新制度，看冻结与梯度路径。用于 **f-12**。
每个部件**全书只在最相关的那一节用一次**（capability-radar 在 0-1 已用，3.1 可再用一次但换角度）。不要滥用。
注意：Part 8 之后的章节（含 Part 5.5）底部 script 块只加载 registry.js + 本页实际用到的 widget 脚本（参照 8-2 的做法），不必带全量清单。

---

# 事实库（FACTS）—— 只用这里 + 你 Read 到的真实代码，不要臆造数字

## 口径差异（重要，全书统一处理）
- README/paper（**愿景**语言）：5-axis atomic diagnostic（Scene·Atomic Skill·Horizon·Precision·Mobility）、4-axis generalization（Object·Background·Instruction·Mixed）、794 task instances、Test-Mini、Specialist vs Generalist track。
- 线上 docs（**可验证事实**）：3 tracks（`mobile_manip`/`table_top_manip`/`generalist`）× 3 splits（`val_train`/`val_unseen`/`test`）、26 tasks、数据集 6,600 episodes；split 细分与每 track episode 数标注 **WIP**。
- 处理：讲愿景时标注「README/paper 愿景」，讲机制时用 docs/代码事实。诊断报告的 radar/heatmap/transfer curve 出现在 README 与线上平台，docs challenge 页未列出——如实说明。

## EBench 总览
- 全称 Elemental Mobile Manipulation Benchmark，Shanghai AI Laboratory / InternRobotics。基于 **NVIDIA Isaac Sim** 的室内 VLA manipulation benchmark。
- **client–server**：server 跑 Isaac Sim，把仿真当黑盒；client 是极简包 `genmanip-client`，装进模型自己的 env，避免依赖冲突。
- repo 星座：本 repo（EBench，前门：baselines + scripts）；`InternRobotics/GenManip`（Isaac Sim server + 任务配置）；`InternRobotics/genmanip-client`（`gmp` CLI + `EvalClient`）；🤗 `InternRobotics/EBench-Assets`（场景/物体/任务资产）；🤗 `InternRobotics/EBench-Dataset`（LeRobot 格式训练轨迹）；docs `internrobotics.github.io/EBench-doc`；leaderboard `internrobotics.shlab.org.cn/eval`。
- 验证一次 full pass ≈ **30 分钟 / 8× RTX 4090**。
- baseline：π0、π0.5、X-VLA、InternVLA-A1。

## 本体 lift2（docs）
- dual-arm + 移动底盘，4 个 480×640 相机视角：`top`、`left`、`right`、`overlook`。录制 15 fps。
- 观测 modality：`state.joints`(12)、`state.gripper`(4)、`state.base`(3, x/y/theta)、`state.ee_pose`([[pos,quat]×2]=14)、`video.{cam}_view`(480,640,3 uint8)、`instruction`(str)、`timestep`(int)、`reset`(bool)。

## 数据集（docs Asset & Dataset）
- 三个子集（均 LeRobot v2.1）：
  - `long_horizon`（rule-based/GenManip 脚本）：9 任务 ×200 = **1,800** episodes，≈3.6M frames，eval track: mobile_manip+generalist。
  - `simple_pnp`（rule-based）：10 任务 ×200 = **2,000** episodes，≈0.96M frames，mobile_manip+generalist。
  - `teleop_tasks`（人类遥操作）：7 任务 ×400 = **2,800** episodes，≈5.3M frames，table_top_manip+generalist。动作可能抖动/迟疑/停顿。
  - 合计 **6,600 episodes，≈9.86M frames，26 tasks**。
- 帧字段含 `*_delta`（增量通道）：`action.joints`/`action.joints_delta`(12)、`action.gripper`(4)、`action.ee_pose`/`_delta`(14)、`action.base`/`_delta`(3)。视频 AV1-MP4。`meta/modality.json`、`meta/tasks.jsonl`（多套指令释义）。
- 下载：`huggingface-cli download InternRobotics/EBench-Assets --local-dir saved --repo-type dataset`；`... EBench-Dataset --local-dir saved/dataset --repo-type dataset`。
- 训练提示：teleop 抖动会被学进去；要平滑可调高 GenManip(rule-based) 子集权重。

## 仿真栈
- **Isaac Sim**：基于 Omniverse 的机器人仿真应用。三件套：**USD**（统一场景描述格式，资产交换）、**PhysX SDK**（GPU 并行物理：刚体、接触、articulation、contact sensor）、**RTX Renderer**（RTX GPU 光追实时 PBR，合成相机/LiDAR）。循环：USD Physics schema 解析成 PhysX 对象 → 每步推进 → 状态写回 USD → RL/渲染器读取。GAMES103 桥：这就是你学的刚体/约束时间步进，只是 GPU 并行到上千 env。Isaac Sim 版本 4.1.0；CUDA 12.1；`torch==2.4.0`。
- **cuRobo**（NVlabs）：CUDA 加速运动生成。GPU 并行 FK/IK、碰撞检测、轨迹优化。IK ~37,000/s（比 TracIK 快 23×）；碰撞-free IK 7,600/s；机器人用球近似；world 用 cuboid/mesh/depth/ESDF；优化器 L-BFGS/MPPI；整条 motion-gen ≈30ms@RTX4090（minimum-jerk）。用于在 Isaac Sim 场景里生成专家/遥操轨迹。
- **GenManip**（CVPR'25，arXiv 2506.10966）：基于 Isaac Sim 的 LLM 驱动 instruction-following manipulation 仿真平台。10,000 标注 3D 物体库；GenManip-Bench 200 任务；黑盒统一 API；曾压测 1,500 并发 Isaac Sim 实例 / 500× RTX4090。EBench 的 server 端就来自 GenManip。
- **LeRobot**（huggingface）：机器人学习数据标准格式。Parquet（低维高频信号）+ MP4（相机）+ metadata（task 文本、robot type、fps、episode 边界）。`LeRobotDataset("...")` → PyTorch tensor。解决数据碎片化。v3 支持百万轨迹/十亿帧、StreamingLeRobotDataset。

## 评测引擎与契约（docs custom-model / run-benchmark / gmp-cli）
- server 起：`python ray_eval_server.py --host 0.0.0.0 --port 8087 --no_save_process`。
- 提交：`gmp submit ebench/<track>/<split> --run_id my_first_run`；track∈{mobile_manip,table_top_manip,generalist}，split∈{val_train,val_unseen,test}。可提交 `ebench`(全部)/单 track/单任务（`ebench/table_top_manip/test/collect_coffee_beans`）。
- 跑 client worker：`gmp eval -a r5a -g lift2 --worker_ids 0`；查 `gmp status` → 结果 `saved/eval_results/<task>/<run_id>/`。跨机加 `--host <ip> --port <port>`。
- `gmp` 命令：`submit`/`status`/`eval`/`plot`/`clean`(`--dry-run`/`--all`)/`visualize`(Rerun HTTPS viewer，Py3.11+，`[visualize]` extra)。选项：`--run_id`/`--host`/`--port`(默认127.0.0.1:8087)/`--worker_ids`/`--frame_save_interval`/`--chunk_size`。
- **ModelClient 接口**：`model_client.get_action(obs) -> action`，一次推理一次调用。chunk 模式实现 `get_action_chunk(obs)` 返回长度 `chunk_size` 的 list；server 内部执行整段、只回 re-inference 点观测，省网络往返（需 server `--no_save_process`）。
- **观测**（按 worker_id）：`obs["worker_id"]["obs"]` = {`instruction`(str), `state.joints`(12), `state.gripper`(4), `state.base`(3), `state.ee_pose`([[pos,quat]×2]), `video.{cam}_view`(480,640,3 uint8), `timestep`(int), `reset`(bool 首步 True)}。
- **动作**：`{"0": {"action": (16,) = 6左关节+2左夹+6右关节+2右夹, "base_motion": (3,) Δx,Δy,Δyaw, "control_type": "joint_position", "is_rel": False(臂相对则True), "base_is_rel": True}}`。或 `control_type="ee_pose"` 提供 `[pos,quat,gripper]`。
- **EvalClient** 用法：
  ```python
  from genmanip_client.eval_client import EvalClient
  client = EvalClient(base_url="http://127.0.0.1:8087", worker_ids=["0"], run_id="my_eval")
  obs = client.reset()
  eval_finished = False
  while not eval_finished:
      if obs[worker_ids]["obs"]["reset"]:
          model.reset()
      action = model.get_action(obs)
      obs, eval_finished = client.step(action)
  client.close()
  ```
- 多 worker：不同进程不同 `worker_id`。
- **scoring**：每 episode task score ∈ [0,1]，满足 goal 给满分否则 0；很多任务给**部分分**（子目标求和）与**时序条件**（前置满足后才评后续）。track score = 该 track/split 所有 episode 的平均；leaderboard 聚合 track score。
- **online challenge**：登录 `internrobotics.shlab.org.cn/eval` 拿 token；`gmp online submit --base_url https://internrobotics.shlab.org.cn/eval --token $T --benchmark_set ebench_generalist --model_name ... --model_type VLA ...`（当前仅允许 `ebench_generalist`）；返回 `task_id`(当 run_id) + `endpoint`；用 `EvalClient(base_url=endpoint, token=..., run_id=task_id, worker_ids=["0"])` 跑；**最多 16 并发 worker**；10 分钟无活动断连；同 task_id 可续跑。`gmp online stop` 结束。

## 26 个任务与打分（task-taxonomy widget 已含全部数据，正文点到即可）
- Long-Horizon 9：Bottle/Detergent/Dish/Dishwasher/Fruit/Make Sandwich/Microwave/Pen/Shop。
- Pick-and-Place 10：Utensils to Holder/Bookmark on Book/Soap to Dish/Apple to Fruit Bowl/Remote to Holder/Perfume to Cosmetics Rack/Salt to Spice Rack/Apple from Shelf/Teacup to Saucer/Bowl to Plate。
- Dexterous & Precise 7：Collect Coffee Beans/Flip Cup & Collect Cookies/Frame Against Pen Holder/Install Gear/Peg in Hole/Put Glass in Glassbox/Tighten Nut。

## VLA 理论
### VLA 总览
- VLA = 拿预训练 **VLM**（vision-language model）骨干，加上输出 **robot action** 的能力。π0 用 **PaliGemma**（3B VLM；SigLIP 视觉≈400M + Gemma LM≈2.6B 是背景知识，paper 只说 3B）。早期 VLA（RT-2/OpenVLA）把动作离散成 token 自回归输出；π0 主张这不适合高频灵巧控制 → 用 flow matching。

### Action chunking（来自 ACT）
- 一次预测 H 个未来动作，而非每步一个。源自 **ACT（Action Chunking with Transformers）**（ALOHA, Tony Zhao）。目的：对抗 **compounding error / covariate shift**——单步误差把机器人推到没见过的状态，误差滚雪球；预测 chunk 缩短有效决策 horizon，决策点更少、动作更平滑。
- π0 H=50，控制达 50Hz；π0.5 H=49/50；openpi benchmark 微调用更短：`pi05_libero` H=10，`pi05_droid` H=16 action_dim=32。
- **开环执行 + replan（receding horizon）**：π0 试过 ACT 的 temporal ensembling 反而变差，故 chunk 开环执行后 replan。20Hz 机器人执行 16/50 后每 0.8s 重推；50Hz 执行 25 后每 0.5s。tradeoff：长 chunk 更平滑但不反应；短 chunk 反应快但 covariate shift 多。

### Flow matching / rectified flow（5.2 重点，直觉+关键公式+推导要点）
- 这是**生成式、分布式策略**（不是 value-based）。无 Q、无 critic、无 Bellman；用**模仿/behavior cloning** 训练，采样自 p(A_t | o_t)。flow matching 让单一策略表达**多模态**连续动作分布（多种正确做法），而非回归到均值。
- action chunk A_t = [a_t,…,a_{t+H-1}]（π0 H=50）；观测 o_t=[I¹..Iⁿ, ℓ_t, q_t]（多相机图、语言 token、关节角 state）。
- π0 用 **conditional flow matching** + 线性高斯（OT）概率路径 = **rectified flow**。两个时间轴：机器人步 t（下标），flow 时间 τ∈[0,1]（上标）。
  - 采样噪声 ε∼N(0,I)；噪声动作 $A_t^\tau = \tau A_t + (1-\tau)\varepsilon$；
  - 训练网络向量场 $v_\theta(A_t^\tau, o_t)$ 去匹配目标去噪场 $u(A_t^\tau|A_t)=\varepsilon - A_t$。
  - 损失：$L^\tau(\theta)=\mathbb{E}\,\lVert v_\theta(A_t^\tau,o_t)-(\varepsilon-A_t)\rVert^2$。τ 从偏向小值（更噪）的 beta 分布采。
- 与 diffusion 关系：paper 称 flow matching 是 diffusion 的一个变体；rectified flow 训练近**直线**路径，故推理可**极少步**积分（实时控制关键）。
- 推理 = 解 ODE：$A_t^0\sim N(0,I)$，forward Euler $A_t^{\tau+\delta}=A_t^\tau+\delta\,v_\theta(A_t^\tau,o_t)$；π0 用 **10 步**（δ=0.1）。把观测前缀 o_t 的 KV cache 一次，10 步只重算 action token。
- RL 桥：最接近的类比是 stochastic actor，但用 flow-matching 去噪损失（behavior cloning）训练，不是 policy gradient / TD。
- GAMES103 桥：解 ODE 的 forward Euler 积分、向量场，正是数值积分那套；rectified flow 的"直线路径"就像积分一条几乎匀速的轨迹，步长少也准。

### Action expert（5.3）
- π0 follow **Transfusion**（一个 transformer，混合目标：连续 token 用 flow-matching loss，离散 token 用交叉熵）。在此之上，**机器人相关 token（action+state）用一套独立权重** = action expert。"类似两元 mixture-of-experts：一元处理 image/text，一元处理 robotics 输入输出。"
- image/text token 走 PaliGemma(3B) 权重；state/action token 走 action-expert 权重；二者**共享一次 attention**（通过 attention 交互），但各用自己的 MLP/投影。action token 用 **full bidirectional** mask（chunk 内互相 attend）。action expert 从零初始化、**300M** 参数；π0 共 **3.3B**。π0-small 消融 470M。

### 离散 vs 连续、FAST、knowledge insulation（5.4）
- π0.5（arXiv 2504.16054）基于 π0，面向 **open-world generalization**（进全新的家）。
  - (a) **co-training** 异构数据：多本体 + ~400h 真实家庭移动操作 + 实验室 + 高层语义子任务预测 + 物体检测 + web 数据。
  - (b) **分层推理**：先离散自回归解码**高层语义子任务**（如"pick up the plate"），再用连续 flow matching 解**低层 action chunk**。同模型含两条解码路径。
  - (c) 训练两阶段：预训练把动作用 **FAST action tokenizer** 离散化、交叉熵 next-token（快/稳，让 VLM 用语言那套学控制表示）；后训练切到 flow matching 做实时连续控制。离散适合训练/知识迁移但不适合实时；flow matching 适合快速连续推理。
  - (d) **knowledge insulation**（arXiv 2505.23705）：给预训练 VLM 接**随机初始化**的 action expert 并把其梯度回传 backbone，会**损害训练速度与知识迁移**；做法 = 用离散(FAST) next-token 微调 backbone，同时训练 flow-matching action expert 但**停止其梯度回流 backbone**（stop-gradient）。保住 web 知识、训练更快、推理仍快。openpi 目前只支持 flow matching head。
  - (e) 结果：在全新家清厨房/卧室、铺床、挂毛巾，多阶段任务 10–15 分钟；场景从 3→104 个，泛化约需 ~100。

### baseline 代码事实（Read 真实代码核对；忽略 third_party/）
- 三者共享契约：init EvalClient(base_url, token, run_id, worker_ids) → `obs=reset()` → 推理 → `obs,done=step(action)` → 出错重建 client → `close()`。
- **openpi（π0/π0.5）**：`scripts/launch_pi_onlineeval.sh` 起 N 个 model server（`scripts/serve_policy.py`，端口 8000,8002,…，`CUDA_VISIBLE_DEVICES=i/2`）+ 并行 `scripts/pi_eval_client_online.py`。client `Pi0Client` 经 `WebsocketClientPolicy.infer()` 拿 actions。`prep_input` 把 obs 映射成 `images/head|hand_left|hand_right`、`states/joint|gripper|base`、`prompt`。`prep_output` 重排 joint 顺序、`base_motion = action[16:19] - last`、`base_is_rel=True`。配置 `pi05_ebench_all/mobile/tabletop`（及 pi0_*），`EBenchInputs/EBenchOutputs`（generalist 输出 action[:,:19]；fixedbase 16）。env 变量：GENMANIP_PATH/NUM_CLIENTS/RUN_ID/POLICY_CFG/POLICY_PATH/Horizon/TOKEN/URL。
- **X-VLA**：`baselines/X-VLA/run.py`。`AutoModel.from_pretrained(model_path, trust_remote_code=True)`+`AutoProcessor`。`model.inference_api(payload={proprio, language_instruction, image0/1/2, domain_id:0, steps:10}, processor)`。proprio=[joints(6), base 缩放(p[:2]*=10,p[2]/=10)(3), gripper*20(4)]；输出 chunk 还原 `[:,12:14]/=10,[:,14]*=10,[:,15:19]/=20`；gripper 阈值门控(<0.001→-0.01)；`base_is_rel=False`(绝对，独一份)；`--step_mode chunk|step`、`--used_chunk_size 30`、`--client_reinit_retries/backoff`。`scripts/run_xvla_eval.sh` 每 WORKER_ID 一进程，`GPU_IDS` round-robin。env：MODEL_PATH/BASE_URL/RUN_ID/TOKEN/WORKER_IDS/GPU_IDS/STEP_MODE/LOG_DIR。
- **InternVLA-A1**：`baselines/InternVLA-A1/inference.py`，`QwenA1PolicyWrapper`。**有状态 action 队列**：`action_plan` deque 空了才 `_plan_action`，否则 popleft。temporal image pair：`image_history_interval`(默认15) 决定 [past,current] 两帧。state 把 base 置零再拼。`predict_action_chunk(...)`→取 `[0,:infer_horizon,:19]`→`unnormalize_fn`(stats_key 如 lift2)→delta 模式 action[:,:12]+=init_state。gripper 离散化 <0.005→0.0 else 0.044。`_pack_action_fields` 重排 [j0-5,gripL,j6-11,gripR]。base：`target=chunk_start_base+predicted_rel_base`，`base_is_rel=True`。args：ckpt_path/stats_key/resize_size(224)/image_history_interval/action_mode(delta)/infer_horizon(50)/action_horizon_size(30)/worker_ids/url/token/run_id。`eval_pjsim.sh` 包一层。
  - 模型层：InternVLA-A1（arXiv 2601.02456，InternRobotics）= 统一 Understanding/Generation/Action 的 **Mixture-of-Transformers**，三专家共享一次 unified masked self-attention：understanding(InternVL3 / Qwen3-VL)、generation（预测未来视觉状态 = **visual foresight** 世界模型想象）、action（flow matching 出 chunk）。3B 版基于 **Qwen3-VL-2B**（对应 `QwenA1Policy`）。`decode_image` 大概率切换是否解码 generation expert 预测的未来帧。预训练 692M 帧（真实+合成+人类视频）。~13Hz with torch.compile。
- **X-VLA 模型层**（arXiv 2510.10274）：flow-matching VLA，纯 soft-prompted 标准 Transformer encoder（24 层 hidden 1024）。**soft prompt**：每个数据源一套可学习 embedding（embodiment-specific），让共享骨干吸收异构性、其余学 embodiment-agnostic 策略。**domain_id**=选哪套 soft-prompt（一般训练默认 0）。VL encoder=Florence-Large。两阶段：预训练 0.9B / 290K episodes / 7 平台；新机器人加新 prompt + 冻结骨干微调。PEFT 仅 ~9M(~1%) 参数即近 SOTA。

## Part 5.5（VLA 训练系统）新增事实 —— 来源：LabVLA 论文（arXiv 2606.13578）、LabUtopia（2505.22634）、AutoBio（2505.14030）、RDT-1B（2410.07864）、π0.5（2504.16054）
### 训练样本与切片（5b-1）
- VLA 监督样本 = (o_t, q_t, instruction) → A_t = a_{t:t+H}。一条成功 episode 从每个时刻 t 切出一个样本：obs_0→action_0:H、obs_1→action_1:1+H…… 一条 rollout 贡献 ~T 个样本，不是一个。
- 监督信号不是「最终成功画面」，是每个时刻起往后 H 步的专家动作。EBench-Dataset 即此形态（LeRobot：Parquet 低维 + MP4 帧 + meta；见 2-4 的 `*_delta` 通道）。
- H 参考值：π0/π0.5 H=50；RDT 预测 64 步；LabVLA K=50（附录超参表）；openpi 微调 pi05_libero H=10、pi05_droid H=16。
### VLA 三层定义（5b-2）
- 接口定义：Vision+Language+state→action。π0/π0.5/LabVLA/RDT/OpenVLA/RT-2 都满足。
- 架构定义（窄）：pretrained VLM backbone + action expert/head。π0.5、LabVLA 典型；**RDT 不同**：RDT-1B（arXiv 2410.07864，清华 TSAIL）= 1.2B **Diffusion Transformer** 作为策略本体（图像/语言是条件，不是「VLM 大脑+动作小脑」），预训练 46 数据集 1M+ episodes，预测 64 步 action chunk，Physically Interpretable Unified Action Space 统一异构本体。
- recipe 定义：π0.5 与 LabVLA 共享「FAST 离散预训练 → flow matching 后训练 + KI → 任务微调」谱系；RT-2/OpenVLA = action-as-token 自回归；RDT = 扩散去噪训练。
### 训练账本（5b-3，LabVLA 论文口径）
- LabVLA：Qwen3-VL-4B-Instruct backbone + DiT action expert（flow matching）。正文口径两阶段：(1) VLM pretraining——数据 Robointer-VQA + AgiBot World Beta + OXE-AugE + DROID，监督 VQA answer/language subtask/离散 FAST action token，全部 cross-entropy，更新 backbone；(2) posttraining——OXE-AugE + LabEmbodied-Data，DiT 出连续 action chunk，flow matching loss + stop-gradient（KI）不回 VLM。附录超参表三列：VLM pretraining 100k steps / KI posttraining 80k / finetuning 80k；pretraining+posttraining 用 absolute action targets，finetuning 用 delta action targets。action horizon K=50，action 向量 pad 到 32 维（单臂常只 8 维活跃；flow loss 只在活跃维平均——padded 维计入分母曾把梯度缩小 4×，是论文附录踩坑实录）。
- OXE-AugE 只用其 LeRobot 格式子集（6 源合并 ≈572k trajectories）。
- π0.5 对应账本：pretraining = 异构 co-training（多本体+~400h 家庭移动操作+高层子任务+检测+web），动作经 FAST 离散化走 next-token CE，更新 backbone；posttraining = flow matching action expert 实时连续控制（KI 论文：离散 CE 监督 backbone + flow 梯度 stop-gradient）。推理 = 先离散解码高层 subtask，再 flow 出低层 chunk。
- 分阶段原因：CE/离散稳定（语言那套机制）；连续 flow 梯度早期大而乱、会冲坏 backbone 语义空间 →「先离散后连续、先语义后控制、先大脑后小脑、连续 loss 小心回传」。
### 多源数据（5b-4）
- 类型×监督：VQA/语义（Robointer-VQA、web VQA）→ CE → backbone；高层子任务文本（π0.5）→ CE；真实机器人轨迹（DROID/AgiBot/OXE）→ FAST CE 或 flow；仿真成功 rollout（LabEmbodied-Data）→ FAST CE 或 flow；web 图文（caption/detection）→ CE。
- 原则：**没有 action 标签的样本不硬塞全零动作**——统一 batch schema + mask 标记有效字段，有什么监督训什么 loss。LabVLA 论文附录的「flow loss 只在活跃 action 维平均」正是该原则的工程体现。
### KI 梯度（5b-5）
- 前向：image/text/state → VLM backbone → hidden prefix → action expert(DiT) → chunk → flow loss。action expert 前向**读得到** VLM hidden states。
- 反向：VQA/language CE → 更新 backbone；FAST action-token CE → 更新 backbone；flow matching loss → 只更新 action expert + projection，**stop-gradient 挡住回 backbone 的路**。
- KI ≠ 冻结 backbone：backbone 仍被 CE/FAST/annotation loss 更新；KI 只是阻断连续动作 loss 的直接污染。误解表：不是推理技巧（训练时机制）；action expert 并非「看不到」VLM（前向可读）；连续训练不一定更强（不稳，需 FAST/KI 辅助）。
### 生态位（5b-6）
- 三层：**数据引擎**（生成训练数据：造场景→执行任务→过滤成功 rollout→导出）/ **benchmark**（考试场+评分器：reset、让模型尝试、算分）/ **model recipe**（backbone、head、loss、阶段、数据混合的规定）。
- RoboGenesis（LabVLA 论文）= 基于 Isaac Sim 的 workflow+data engine，三阶段：environment building（text-to-image + TRELLIS 2.0 重建造 3D 资产库 → 组装验证场景，10 项 validation check + 0-100 质量分；LabAssetLibrary + 1,000+ 纹理 LabTextureLibrary → 已生成 10,000 场景）；agentic workflow generation（自然语言指令 → 原子技能有序序列 Pick→Pour→Place→Press，16 robot platforms 跨本体实例化 + 六轴 domain randomization）；structured export（按执行成功过滤 + 多种 annotation 流）。产物 = LabEmbodied-Data（多相机+指令+state+action+结构化标注，四 task family：单臂 primitives/多步 procedures/双臂/移动操作）。**不需要预录专家轨迹，但需要可执行专家逻辑**（资产、robot profile、skill library、workflow executor、success checker、exporter）。
- LabUtopia（arXiv 2505.22634，NeurIPS'25 D&B）= LabSim（Isaac Sim 高保真多物理/化学交互）+ LabScene（程序化场景生成，200+ 资产）+ LabBench（5 层级 30 任务，atomic→long-horizon mobile）。定位 = 实验室 benchmark/考试场。
- AutoBio（arXiv 2505.14030）= 生物实验室仿真器+benchmark：仪器数字化管线、螺纹/棘轮等专用物理插件、透明液体 PBR 渲染；三难度层级任务；拿现有 VLA baseline 评测。定位 = 「造更真实的生物实验考场看现有 VLA 能考多少」，与 LabVLA「造训练流水线养自己的实验室 VLA」互补。
- 类比锚点：RoboGenesis 之于 LabEmbodied-Data ≈ GenManip rule-based 管线之于 EBench-Dataset（2-3/2-4 已讲）；LabUtopia 之于 LabVLA ≈ EBench 之于其 baseline。EBench 自己 = benchmark 层（GenManip server + gmp + scoring），其数据管线 = 引擎层。
### Case study π0.5 vs LabVLA（5b-7，各自论文口径）
- 共性 recipe：VLM backbone + FAST 离散预训练 + 连续 action expert + flow matching 后训练 + KI + H/K=50。
- 差异：目标场景（开放世界家庭 vs 实验室固定 protocol）；backbone（PaliGemma 3B vs Qwen3-VL-4B-Instruct）；expert（π0 系 300M action expert vs DiT）；高层语义（subtask 预测 vs protocol/skill annotation）；数据引擎（π0.5 无 RoboGenesis 类引擎，靠真实 co-training ~400h 家庭数据；LabVLA 核心贡献就是引擎）。
- LabUtopia 评测（LabVLA 论文 Table 2）：6 任务（Pick Up/Press Button/Open Door/Pour Liquid/Heat Beaker/Transport Beaker）× ID/OOD × 120 episodes/setting（合计 1440/模型）。**所有 baseline 用 public checkpoint 接入 LabUtopia harness（适配 action/state schema），未在 LabEmbodied-Data 上微调**；LabVLA 平均最高（ID 71.1% / OOD 70.0%，次优 π0 63.3%/63.2%；π0.5 52.4%/52.1%；Pour Liquid 全场 <50% 未解）。LabVLA ID→OOD 只降 1.1pp（domain randomization 之效）。
- 正确解读：这说明 lab-specific 数据/训练很有用，**不是** same-data architecture ablation，不能推出「LabVLA 架构本身强于 π0.5 架构」。佐证数据价值的迁移实验（Table 3）：X-VLA + LabEmbodied-Data 微调，5 任务平均 ID +15.0pp / OOD +19.3pp——监督不绑定 LabVLA 架构。
- 真机（Table 4）：Franka 平台 4 任务（Shake Liquid/Pour Liquid/Magnetic Stir/Stopper Plug-Unplug，各 2-4 skill，每任务 30-50 demos，50 rollouts/setting），LabVLA 与 DreamZero 相当、均稳超 π0.5。
### 公平比较（5b-8）
- 评测前 10 问：public checkpoint 还是 benchmark 数据微调过？见过同类任务/资产/仿真器？用过同批专家轨迹？action space/obs schema 一致？外接 planner/wrapper/safety critic？ID/OOD 怎么定义？成绩是单标量还是有失败阶段/过程证据？
- 模型状态五档：zero-shot public checkpoint / same-domain fine-tuned / same-benchmark fine-tuned（必须披露）/ system-enhanced VLA（不可当裸 VLA 报）/ oracle-scripted expert（只作数据生成或上限）。
- 更公平的对照设计：双方 public checkpoint 对比 + 双方 same-data fine-tune 对比 + same tasks/scenes/held-out/schema/gradient steps/eval harness。
- 与 Part 8 关系：8-1 construct validity、8-4 claim boundary、8-6 leakage 的 VLA 实例化；EBench 报告模板（model_card/training_exposure/system_components/metrics）为**设计建议**，非现有代码事实。
### 口径与诚实标注（贯穿 Part 5.5）
- LabVLA 正文口径「two-stage」（pretraining/posttraining）与附录超参口径「100k/80k/80k 三列（VLM pretraining/KI posttraining/finetuning）」并存——如实指出，处理成「正文讲 recipe 骨架、附录多一列任务微调」。
- 不同论文数据量单位不可直接比：小时（π0.5 ~400h）vs trajectories（OXE-AugE ≈572k）vs episodes（EBench 6,600）vs frames vs steps。
- beaker/hot plate 一类 lab 例子在 5b-6/5b-7/5b-8 使用（LabVLA 语境）；5b-1~5b-5 通用机制处优先用 EBench 自己的任务/数据集做例子，保持读者锚点连续。

# 参考文献（appendix 用）
- π0 arXiv:2410.24164；π0.5 arXiv:2504.16054；Knowledge Insulation arXiv:2505.23705；X-VLA arXiv:2510.10274；InternVLA-A1 arXiv:2601.02456；GenManip arXiv:2506.10966。
- Part 5.5 新增：LabVLA arXiv:2606.13578；RDT-1B arXiv:2410.07864；LabUtopia arXiv:2505.22634（NeurIPS'25 D&B）；AutoBio arXiv:2505.14030；ACT arXiv:2304.13705；FAST arXiv:2501.09747。
- openpi github.com/Physical-Intelligence/openpi；cuRobo github.com/NVlabs/curobo；LeRobot github.com/huggingface/lerobot；Isaac Sim developer.nvidia.com/isaac/sim。
- EBench docs internrobotics.github.io/EBench-doc；leaderboard internrobotics.shlab.org.cn/eval。

# 输出
直接用 Write 写出指派给你的每个 HTML 文件到正确路径。每节目标 ~700–1400 字中文正文 + 合适的代码/公式/callout/桥/（指定的）widget。写完回报：写了哪些文件、各用了哪个 widget、有无存疑事实。
