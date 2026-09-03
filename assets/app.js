/* LinkedIn Client Lab portal — shared behaviour */
(function () {
  "use strict";

  /* ---------- guarded storage ---------- */
  var store = {
    get: function (k, d) {
      try { var v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); }
      catch (e) { return d; }
    },
    set: function (k, v) {
      try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; }
    }
  };
  window.LCLstore = store;

  /* ---------- theme (default light) ---------- */
  var theme = store.get("lcl:theme", "light");
  document.documentElement.setAttribute("data-theme", theme);

  /* ---------- nav open/closed ---------- */
  if (store.get("lcl:nav", "open") === "closed") document.body.classList.add("nav-closed");

  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-act]");
    if (!t) return;
    var act = t.getAttribute("data-act");

    if (act === "theme") {
      theme = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", theme);
      store.set("lcl:theme", theme);
    }

    if (act === "nav") {
      document.body.classList.toggle("nav-closed");
      store.set("lcl:nav", document.body.classList.contains("nav-closed") ? "closed" : "open");
    }

    if (act === "copy") {
      var txt = t.getAttribute("data-copy") ||
        (t.closest("li") ? t.closest("li").querySelector(".ptext").textContent : "");
      copy(txt, t);
    }
  });

  /* ---------- toast + copy ---------- */
  var toastEl = null, toastT = null;
  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "toast";
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastT);
    toastT = setTimeout(function () { toastEl.classList.remove("show"); }, 1600);
  }
  window.LCLtoast = toast;

  function copy(text, btn) {
    var done = function () {
      if (btn) {
        btn.classList.add("done");
        setTimeout(function () { btn.classList.remove("done"); }, 1100);
      }
      toast("Copied");
    };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done, function () { fallback(text, done); });
    } else { fallback(text, done); }
  }
  function fallback(text, done) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.style.cssText = "position:fixed;opacity:0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); done(); } catch (e) { toast("Copy failed"); }
    document.body.removeChild(ta);
  }
  window.LCLcopy = copy;

  /* ---------- download helper ---------- */
  window.LCLdownload = function (filename, text) {
    var blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1200);
  };

  /* ---------- time helpers ---------- */
  function fmt(s) {
    s = Math.max(0, Math.floor(s));
    var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
    var p = function (n) { return n < 10 ? "0" + n : "" + n; };
    return h ? h + ":" + p(m) + ":" + p(ss) : m + ":" + p(ss);
  }

  /* ---------- video page: player + chapters ---------- */
  var cfg = window.LCL_VIDEO;
  if (!cfg) return;

  var KEY = "lcl:ch:" + cfg.id;
  function shipped() {
    return (cfg.chapters || []).map(function (c) { return { t: c[0], x: c[1] }; });
  }
  var rows = store.get(KEY, null);
  if (!rows || !rows.length) rows = shipped();
  if (!rows.length) rows = [{ t: null, x: "" }];

  var player = null, ready = false;
  var list = document.getElementById("chapList");

  window.onYouTubeIframeAPIReady = function () {
    player = new YT.Player("ytplayer", {
      videoId: cfg.id,
      playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
      events: { onReady: function () { ready = true; } }
    });
  };

  function save() { store.set(KEY, rows); }

  function render() {
    if (!list) return;
    list.innerHTML = "";
    rows.forEach(function (r, i) {
      var row = document.createElement("div");
      row.className = "chap-row";

      var b = document.createElement("button");
      b.type = "button";
      b.className = "stamp" + (r.t === null ? "" : " set");
      b.textContent = r.t === null ? "mark" : fmt(r.t);
      b.title = r.t === null ? "Set this to the current point in the video" : "Jump to " + fmt(r.t) + " (shift-click to clear)";
      b.setAttribute("aria-label", b.title);
      b.addEventListener("click", function (ev) {
        if (ev.shiftKey) { rows[i].t = null; save(); render(); return; }
        if (r.t === null) {
          if (!ready || !player) { toast("Start the video first"); return; }
          rows[i].t = Math.floor(player.getCurrentTime());
          save(); render();
        } else {
          if (!ready || !player) return;
          player.seekTo(r.t, true);
          player.playVideo();
        }
      });

      var tx = document.createElement("div");
      tx.className = "chap-topic";
      tx.contentEditable = "true";
      tx.setAttribute("role", "textbox");
      tx.setAttribute("data-ph", "Topic");
      tx.textContent = r.x;
      tx.addEventListener("input", function () { rows[i].x = tx.textContent.trim(); save(); });
      tx.addEventListener("keydown", function (ev) {
        if (ev.key === "Enter") { ev.preventDefault(); addRow(i + 1); }
      });

      var del = document.createElement("button");
      del.type = "button";
      del.className = "chap-del";
      del.innerHTML = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>';
      del.title = "Remove";
      del.setAttribute("aria-label", "Remove chapter");
      del.addEventListener("click", function () {
        rows.splice(i, 1);
        if (!rows.length) rows = [{ t: null, x: "" }];
        save(); render();
      });

      row.appendChild(b); row.appendChild(tx); row.appendChild(del);
      list.appendChild(row);
    });
  }

  function addRow(at) {
    rows.splice(at === undefined ? rows.length : at, 0, { t: null, x: "" });
    save(); render();
    var el = list.querySelectorAll(".chap-topic")[at === undefined ? rows.length - 1 : at];
    if (el) el.focus();
  }

  var addBtn = document.getElementById("chapAdd");
  if (addBtn) addBtn.addEventListener("click", function () { addRow(); });

  var sortBtn = document.getElementById("chapSort");
  if (sortBtn) sortBtn.addEventListener("click", function () {
    rows.sort(function (a, b) {
      if (a.t === null && b.t === null) return 0;
      if (a.t === null) return 1;
      if (b.t === null) return -1;
      return a.t - b.t;
    });
    save(); render(); toast("Sorted by time");
  });

  var copyBtn = document.getElementById("chapCopy");
  if (copyBtn) copyBtn.addEventListener("click", function () {
    var out = rows.filter(function (r) { return r.t !== null || r.x; })
      .map(function (r) { return (r.t === null ? "--:--" : fmt(r.t)) + "  " + r.x; }).join("\n");
    copy(out, null);
  });

  var resetBtn = document.getElementById("chapReset");
  if (resetBtn) resetBtn.addEventListener("click", function () {
    if (!confirm("Clear your marks and restore the starting topics for this video?")) return;
    rows = shipped();
    if (!rows.length) rows = [{ t: null, x: "" }];
    save(); render();
  });

  render();

  var tag = document.createElement("script");
  tag.src = "https://www.youtube.com/iframe_api";
  document.head.appendChild(tag);
})();
