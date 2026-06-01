/* task-taxonomy — 26 个评测任务 × 3 个 family，点开看打分公式。
   数据取自 EBench docs 的 Task Showcase。 */
(function () {
  window.EBWidgets["task-taxonomy"] = function (root) {
    const data = {
      "Long-Horizon": [
        ["Bottle", "厨房台面", "每个瓶子满足目标区域谓词 +1/12，求和"],
        ["Detergent", "洗衣区", "每瓶洗衣液放进篮子 +1/3"],
        ["Dish", "餐厨", "每件 +1/5：碟+杯进大篮，勺进小篮"],
        ["Dishwasher", "厨房", "开门 1/2 + 两只碗各 1/6 + 关门 1/6"],
        ["Fruit", "厨房", "三个水果各 1/5 进容器 + 倒水 2/5"],
        ["Make Sandwich", "备餐台", "四层堆叠关系各 1/4，求和"],
        ["Microwave", "厨房", "开门 1/2 + 两个蛋挞各 1/6 + 关门 1/6"],
        ["Pen", "书桌", "每支笔满足最终摆放关系 +1/3"],
        ["Shop", "货架", "6 件进结账区(持续30步)各 1/6 + 6 件在左侧各 1/6"],
      ],
      "Pick-and-Place": [
        ["Utensils to Holder", "—", "勺 0.5 + 叉 0.5，顺序无关"],
        ["Bookmark on Book", "—", "重叠 ≥40% → 1.0，否则 0.0"],
        ["Soap to Dish", "—", "完成 1.0 / 否则 0.0"],
        ["Apple to Fruit Bowl", "—", "完成 1.0 / 否则 0.0"],
        ["Remote to Holder", "—", "重叠 ≥40% → 1.0"],
        ["Perfume to Cosmetics Rack", "—", "放上架 0.5 + 插入卡槽 0.5"],
        ["Salt to Spice Rack", "—", "完成 1.0 / 否则 0.0"],
        ["Apple from Shelf", "—", "移出货架栏杆 → 1.0"],
        ["Teacup to Saucer", "—", "茶杯上托 0.5 + 茶壶上盘 0.5，顺序无关"],
        ["Bowl to Plate", "—", "三只碗任一放到盘上 → 1.0"],
      ],
      "Dexterous & Precise": [
        ["Collect Coffee Beans", "—", "盖子对正盖上 0.5 + 7 颗豆各 0.5/7 进罐"],
        ["Flip Cup & Collect Cookies", "—", "杯口朝上(轴与世界 Z 夹角<10°) 0.5 + 5 块饼干各 0.5/5"],
        ["Frame Against Pen Holder", "—", "时序：cond1 相框高于阈值 1/3；cond2(仅在 cond1 后) 接触杯 1/3 + 直立倚靠 1/3"],
        ["Install Gear", "—", "齿轮上轴 0.5 + 与另两齿轮正确啮合 0.5"],
        ["Peg in Hole", "—", "拔出原孔 0.5 + 插入指定孔 0.5"],
        ["Put Glass in Glassbox", "—", "折叠两镜腿 1/3 + 合上镜盒 1/3 + 放入 1/3"],
        ["Tighten Nut", "—", "时序：cond1 螺母到顶 0.5；cond2(仅在 cond1 后) 拧紧 0.5"],
      ],
    };
    const families = Object.keys(data);
    const colorOf = { "Long-Horizon": "accent", "Pick-and-Place": "interactive", "Dexterous & Precise": "g103" };
    let fam = families[0], sel = 0;

    const wrap = EBW.el("div");
    const tabs = EBW.el("div", { class: "seg", style: "margin-bottom:12px;flex-wrap:wrap" });
    families.forEach((f) => {
      const b = EBW.el("button", f === fam ? { class: "on" } : null, `${f} (${data[f].length})`);
      b.addEventListener("click", () => { [...tabs.children].forEach((c) => c.classList.remove("on")); b.classList.add("on"); fam = f; sel = 0; render(); });
      tabs.appendChild(b);
    });
    const grid = EBW.el("div", { style: "display:grid;grid-template-columns:1fr 1.2fr;gap:14px" });
    const listEl = EBW.el("div", { style: "max-height:240px;overflow:auto;display:flex;flex-direction:column;gap:3px" });
    const detail = EBW.el("div", { class: "callout", style: "margin:0" });
    grid.appendChild(listEl); grid.appendChild(detail);

    function render() {
      const items = data[fam], col = colorOf[fam];
      listEl.innerHTML = "";
      items.forEach((it, i) => {
        const b = EBW.el("button", { class: "btn", style: `text-align:left;justify-content:flex-start;${i === sel ? "border-color:var(--" + col + ");color:var(--" + col + ")" : ""}` }, it[0]);
        b.addEventListener("click", () => { sel = i; render(); });
        listEl.appendChild(b);
      });
      const it = items[sel];
      detail.style.borderLeftColor = "var(--" + col + ")";
      detail.innerHTML = `<div class="c-h" style="color:var(--${col})">${it[0]}</div>
        ${it[1] !== "—" ? `<div style="font-size:.8rem;color:var(--ink-faint)">Location: ${it[1]}</div>` : ""}
        <p style="margin:.5em 0 0"><b>Score</b>：${it[2]}</p>`;
    }
    wrap.appendChild(tabs); wrap.appendChild(grid);
    root.appendChild(wrap); render();
  };
})();
