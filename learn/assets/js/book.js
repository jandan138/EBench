/* =========================================================================
   book.js — 教程核心运行时
   职责：侧栏/导航渲染、主题切换、阅读进度、scroll-spy、搜索、
         上下页、代码复制+高亮、KaTeX 触发、widget 自动挂载。
   ========================================================================= */
(function () {
  "use strict";
  const ROOT = document.body.dataset.root || "";
  const SECTION_ID = document.body.dataset.section || null;
  const BOOK = window.EBOOK;

  /* ---------- 主题 ---------- */
  function initTheme() {
    const saved = localStorage.getItem("ebook-theme");
    if (saved) document.documentElement.dataset.theme = saved;
    const btn = document.getElementById("theme-toggle");
    if (btn) btn.addEventListener("click", () => {
      const cur = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = cur;
      localStorage.setItem("ebook-theme", cur);
      btn.textContent = cur === "dark" ? "☀︎" : "☾";
    });
    if (btn) btn.textContent = document.documentElement.dataset.theme === "dark" ? "☀︎" : "☾";
  }

  /* ---------- 侧栏 ---------- */
  function renderSidebar() {
    const el = document.getElementById("sidebar");
    if (!el || !BOOK) return;
    let html = "";
    BOOK.parts.forEach((p) => {
      html += `<div class="part"><div class="part-h">${p.label}</div><div class="part-t">${p.title}</div>`;
      p.sections.forEach((s) => {
        const active = s.id === SECTION_ID ? " active" : "";
        html += `<a class="sec${active}" href="${ROOT}${s.file}"><span class="num">${s.id}</span>${s.title}</a>`;
      });
      html += `</div>`;
    });
    el.innerHTML = html;
    const act = el.querySelector("a.sec.active");
    if (act) act.scrollIntoView({ block: "center" });
  }

  /* ---------- 上下页 ---------- */
  function renderPrevNext() {
    if (!SECTION_ID || !BOOK) return;
    const flat = BOOK.flat;
    const i = flat.findIndex((s) => s.id === SECTION_ID);
    if (i < 0) return;
    const art = document.querySelector(".article");
    if (!art) return;
    const prev = flat[i - 1], next = flat[i + 1];
    const wrap = document.createElement("div");
    wrap.className = "prevnext";
    if (prev) wrap.innerHTML += `<a class="prev" href="${ROOT}${prev.file}"><div class="pn-label">← 上一节</div><div class="pn-title">${prev.title}</div></a>`;
    if (next) wrap.innerHTML += `<a class="next" href="${ROOT}${next.file}"><div class="pn-label">下一节 →</div><div class="pn-title">${next.title}</div></a>`;
    art.appendChild(wrap);
  }

  /* ---------- 右栏 On this page + scroll-spy ---------- */
  function renderRail() {
    const rail = document.getElementById("rail");
    const art = document.querySelector(".article");
    if (!rail || !art) return;
    const heads = [...art.querySelectorAll("h2, h3")].filter((h) => h.id);
    if (!heads.length) { rail.style.display = "none"; return; }
    let html = `<div class="rail-h">On this page</div>`;
    heads.forEach((h) => {
      html += `<a class="${h.tagName === "H3" ? "h3" : ""}" href="#${h.id}">${h.textContent}</a>`;
    });
    rail.innerHTML = html;
    const links = [...rail.querySelectorAll("a")];
    const spy = () => {
      let cur = heads[0];
      const y = window.scrollY + 120;
      heads.forEach((h) => { if (h.offsetTop <= y) cur = h; });
      links.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === "#" + cur.id));
    };
    window.addEventListener("scroll", spy, { passive: true });
    spy();
  }

  /* ---------- 进度条 ---------- */
  function initProgress() {
    const bar = document.querySelector(".progress");
    if (!bar) return;
    const upd = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      bar.style.width = (max > 0 ? (h.scrollTop / max) * 100 : 0) + "%";
    };
    window.addEventListener("scroll", upd, { passive: true });
    upd();
  }

  /* ---------- 移动端菜单 ---------- */
  function initMenu() {
    const t = document.querySelector(".menu-toggle");
    const sb = document.getElementById("sidebar");
    const scrim = document.querySelector(".scrim");
    if (!t || !sb) return;
    const close = () => { sb.classList.remove("open"); if (scrim) scrim.classList.remove("open"); };
    t.addEventListener("click", () => { sb.classList.toggle("open"); if (scrim) scrim.classList.toggle("open"); });
    if (scrim) scrim.addEventListener("click", close);
    sb.addEventListener("click", (e) => { if (e.target.closest("a")) close(); });
  }

  /* ---------- 搜索 ---------- */
  function initSearch() {
    if (!BOOK) return;
    const overlay = document.getElementById("search-overlay");
    const input = document.getElementById("search-input");
    const results = document.getElementById("search-results");
    const openBtn = document.getElementById("search-btn");
    if (!overlay || !input || !results) return;
    let sel = 0, items = [];

    function render(q) {
      q = q.trim().toLowerCase();
      const list = !q ? BOOK.flat : BOOK.flat.filter((s) =>
        (s.title + " " + s.id + " " + (s.keywords || "") + " " + s.part).toLowerCase().includes(q));
      items = list;
      if (!list.length) { results.innerHTML = `<div class="search-empty">没有匹配的小节。</div>`; return; }
      results.innerHTML = list.map((s, idx) =>
        `<a href="${ROOT}${s.file}" class="${idx === 0 ? "sel" : ""}" data-i="${idx}">
           <div class="sr-part">${s.partLabel} · ${s.id}</div>
           <div class="sr-title">${s.title}</div></a>`).join("");
      sel = 0;
    }
    function open() { overlay.classList.add("open"); input.value = ""; render(""); input.focus(); }
    function close() { overlay.classList.remove("open"); }
    function move(d) {
      const links = [...results.querySelectorAll("a")];
      if (!links.length) return;
      links[sel] && links[sel].classList.remove("sel");
      sel = (sel + d + links.length) % links.length;
      links[sel].classList.add("sel");
      links[sel].scrollIntoView({ block: "nearest" });
    }
    if (openBtn) openBtn.addEventListener("click", open);
    input.addEventListener("input", () => render(input.value));
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
    document.addEventListener("keydown", (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); open(); }
      else if (e.key === "/" && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) { e.preventDefault(); open(); }
      else if (overlay.classList.contains("open")) {
        if (e.key === "Escape") close();
        else if (e.key === "ArrowDown") { e.preventDefault(); move(1); }
        else if (e.key === "ArrowUp") { e.preventDefault(); move(-1); }
        else if (e.key === "Enter") { const a = results.querySelector("a.sel"); if (a) location.href = a.href; }
      }
    });
  }

  /* ---------- 代码：复制 + 极简高亮 ---------- */
  const KW = /\b(def|class|return|if|elif|else|for|while|in|not|and|or|is|None|True|False|import|from|as|with|try|except|finally|raise|lambda|yield|async|await|self|export|const|let|var|function|await)\b/g;
  const BUILTIN = /\b(np|torch|print|len|range|list|dict|str|int|float|enumerate|zip|super|deque|dataclass)\b/g;
  function escapeHtml(s){return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}
  function highlight(raw, lang) {
    let s = escapeHtml(raw);
    // 注释（# 行 与 // 行）
    s = s.replace(/(^|\n)(\s*)(#.*?)(?=\n|$)/g, (m,a,b,c)=>`${a}${b}<span class="tok-com">${c}</span>`);
    s = s.replace(/(^|\n)(\s*)(\/\/.*?)(?=\n|$)/g, (m,a,b,c)=>`${a}${b}<span class="tok-com">${c}</span>`);
    // 字符串
    s = s.replace(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g, '<span class="tok-str">$1</span>');
    // 数字
    s = s.replace(/\b(\d+\.?\d*)\b/g, '<span class="tok-num">$1</span>');
    if (lang !== "text") {
      s = s.replace(KW, '<span class="tok-kw">$1</span>');
      s = s.replace(BUILTIN, '<span class="tok-builtin">$1</span>');
    }
    return s;
  }
  function initCode() {
    document.querySelectorAll(".code").forEach((box) => {
      const code = box.querySelector("code");
      if (code && !code.dataset.hl) {
        const lang = box.dataset.lang || "python";
        code.innerHTML = highlight(code.textContent, lang);
        code.dataset.hl = "1";
      }
      const cp = box.querySelector(".cp");
      if (cp) cp.addEventListener("click", () => {
        navigator.clipboard.writeText(code.textContent).then(() => {
          const t = cp.textContent; cp.textContent = "已复制 ✓";
          setTimeout(() => (cp.textContent = t), 1200);
        });
      });
    });
  }

  /* ---------- KaTeX ---------- */
  function renderMath() {
    if (window.renderMathInElement) {
      window.renderMathInElement(document.body, {
        delimiters: [
          { left: "$$", right: "$$", display: true },
          { left: "\\[", right: "\\]", display: true },
          { left: "$", right: "$", display: false },
          { left: "\\(", right: "\\)", display: false },
        ],
        throwOnError: false,
      });
    }
  }

  /* ---------- Widget 自动挂载（懒加载）---------- */
  function initWidgets() {
    const nodes = document.querySelectorAll("[data-widget]");
    if (!nodes.length) return;
    const mount = (el) => {
      const name = el.dataset.widget;
      const reg = window.EBWidgets || {};
      if (reg[name]) {
        try { reg[name](el); } catch (e) { console.error("widget", name, e); el.innerHTML = `<div class="search-empty">部件 ${name} 初始化失败。</div>`; }
      } else {
        el.innerHTML = `<div class="search-empty">未注册的部件：${name}</div>`;
      }
      el.dataset.mounted = "1";
    };
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting && !en.target.dataset.mounted) { mount(en.target); io.unobserve(en.target); }
        });
      }, { rootMargin: "200px" });
      nodes.forEach((n) => io.observe(n));
    } else {
      nodes.forEach(mount);
    }
  }

  /* ---------- init ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    initTheme();
    renderSidebar();
    renderPrevNext();
    renderRail();
    initProgress();
    initMenu();
    initSearch();
    initCode();
    initWidgets();
    renderMath();
  });
})();
