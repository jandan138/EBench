/* =========================================================================
   registry.js — widget 注册表 + 共享辅助
   每个 widget 文件向 window.EBWidgets[name] 注册一个 init(rootEl) 函数。
   book.js 扫描 [data-widget] 并在进入视口时挂载（懒加载）。
   ========================================================================= */
window.EBWidgets = window.EBWidgets || {};

window.EBW = {
  reduced: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  ns: "http://www.w3.org/2000/svg",
  // 读取主题色
  c(name) {
    return getComputedStyle(document.documentElement).getPropertyValue("--" + name).trim() || "#888";
  },
  el(tag, attrs, html) {
    const e = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      if (k === "class") e.className = attrs[k];
      else if (k === "style") e.style.cssText = attrs[k];
      else e.setAttribute(k, attrs[k]);
    }
    if (html != null) e.innerHTML = html;
    return e;
  },
  svg(tag, attrs) {
    const e = document.createElementNS(this.ns, tag);
    if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  },
  clamp(v, a, b) { return Math.max(a, Math.min(b, v)); },
  lerp(a, b, t) { return a + (b - a) * t; },
  // 简单确定性伪随机（避免 Math.random，保证可复现动画）
  rng(seed) {
    let s = seed % 2147483647; if (s <= 0) s += 2147483646;
    return () => (s = (s * 16807) % 2147483647) / 2147483647;
  },
  // 控件构造小工具
  slider(label, min, max, step, val, oninput) {
    const wrap = this.el("div", { class: "ctrl" });
    const lab = this.el("label", null, `<span>${label}</span><b>${val}</b>`);
    const inp = this.el("input", { type: "range", min, max, step, value: val });
    inp.addEventListener("input", () => { lab.querySelector("b").textContent = inp.value; oninput(parseFloat(inp.value)); });
    wrap.appendChild(lab); wrap.appendChild(inp);
    return { wrap, input: inp, setVal: (v) => { inp.value = v; lab.querySelector("b").textContent = v; } };
  },
  seg(options, val, onchange) {
    const wrap = this.el("div", { class: "seg" });
    options.forEach((o) => {
      const b = this.el("button", o.value === val ? { class: "on" } : null, o.label);
      b.addEventListener("click", () => {
        [...wrap.children].forEach((c) => c.classList.remove("on"));
        b.classList.add("on"); onchange(o.value);
      });
      wrap.appendChild(b);
    });
    return wrap;
  },
};
