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

  /* ---------- track filter (All / Listen / Desk), shared by every page ---------- */
  var track = store.get("lcl:track", "all");
  document.documentElement.setAttribute("data-track", track);
  function setTrack(t){
    track = t;
    document.documentElement.setAttribute("data-track", t);
    store.set("lcl:track", t);
    document.querySelectorAll(".trk-btn").forEach(function (b) {
      b.classList.toggle("on", b.dataset.track === t);
      b.setAttribute("aria-pressed", b.dataset.track === t ? "true" : "false");
    });
    if (window.LCLprogress) window.LCLprogress();
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest(".trk-btn");
    if (b) setTrack(b.dataset.track);
  });
  document.querySelectorAll(".trk-btn").forEach(function (b) {
    b.classList.toggle("on", b.dataset.track === track);
  });

  /* ---------- what's been worked through ---------- */
  var done = store.get("lcl:done", {});
  function isDone(vid, t){ return !!(done[vid] && done[vid].indexOf(t) !== -1); }
  function toggleDone(vid, t){
    if (!done[vid]) done[vid] = [];
    var i = done[vid].indexOf(t);
    if (i === -1) done[vid].push(t); else done[vid].splice(i, 1);
    store.set("lcl:done", done);
  }
  function counts(vid, chapters){
    var inTrack = chapters.filter(function (c) { return track === "all" || c[2] === track; });
    var n = inTrack.filter(function (c) { return isDone(vid, c[0]); }).length;
    return { done: n, total: inTrack.length };
  }
  window.LCLcounts = counts;

  /* ---------- home tiles: progress per video ---------- */
  if (window.LCL_TOTALS) {
    (function () {
      function paint(){
        document.querySelectorAll(".tile[data-vid]").forEach(function (tile) {
          var vid = tile.dataset.vid, ch = window.LCL_TOTALS[vid];
          if (!ch) return;
          var c = counts(vid, ch), el = tile.querySelector(".tile-prog");
          if (!el) return;
          el.textContent = c.total ? c.done + " / " + c.total : "";
          var bar = tile.querySelector(".tile-bar span");
          if (bar) bar.style.width = (c.total ? (c.done / c.total * 100) : 0) + "%";
        });
      }
      window.LCLprogress = paint;
      paint();
    })();
  }

  /* ---------- video page: player + chapters ---------- */
  var cfg = window.LCL_VIDEO;
  if (!cfg) return;

  var chapters = (cfg.chapters || []).slice().sort(function (a, b) { return a[0] - b[0]; });
  var list = document.getElementById("chapList");
  var player = null, ready = false, rows = [], activeIdx = -1, tick = null;

  window.onYouTubeIframeAPIReady = function () {
    player = new YT.Player("ytplayer", {
      videoId: cfg.id,
      playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
      events: {
        onReady: function () { ready = true; },
        onStateChange: function (e) {
          if (e.data === YT.PlayerState.PLAYING) {
            clearInterval(tick); tick = setInterval(follow, 1000); follow();
          } else { clearInterval(tick); }
        }
      }
    });
  };

  function follow(){
    if (!ready || !player || !player.getCurrentTime) return;
    var t = player.getCurrentTime(), i = -1;
    for (var k = 0; k < chapters.length; k++) {
      if (chapters[k][0] <= t + 0.4) i = k; else break;
    }
    if (i === activeIdx) return;
    if (rows[activeIdx]) rows[activeIdx].classList.remove("playing");
    activeIdx = i;
    if (rows[activeIdx]) rows[activeIdx].classList.add("playing");
  }

  function jump(sec){
    if (!ready || !player) return;
    player.seekTo(sec, true);
    player.playVideo();
    var top = document.querySelector(".player-wrap");
    if (top && top.getBoundingClientRect().top < 0) top.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function paintProgress(){
    var c = counts(cfg.id, chapters);
    var el = document.getElementById("chapProg");
    if (el) el.textContent = c.done + " / " + c.total;
    var bar = document.querySelector("#chapBar span");
    if (bar) bar.style.width = (c.total ? (c.done / c.total * 100) : 0) + "%";
  }
  window.LCLprogress = paintProgress;

  if (list) {
    list.innerHTML = "";
    chapters.forEach(function (c) {
      var row = document.createElement("div");
      row.className = "chap-row";
      row.dataset.track = c[2] || "listen";

      var tk = document.createElement("button");
      tk.type = "button";
      tk.className = "chap-tick";
      tk.setAttribute("aria-label", "Mark “" + c[1] + "” as worked through");
      tk.setAttribute("aria-pressed", isDone(cfg.id, c[0]) ? "true" : "false");
      if (isDone(cfg.id, c[0])) row.classList.add("done");
      tk.addEventListener("click", function () {
        toggleDone(cfg.id, c[0]);
        var d = isDone(cfg.id, c[0]);
        row.classList.toggle("done", d);
        tk.setAttribute("aria-pressed", d ? "true" : "false");
        paintProgress();
      });

      var b = document.createElement("button");
      b.type = "button";
      b.className = "chap";
      b.innerHTML = '<span class="chap-t"></span><span class="chap-x"></span>' +
                    '<span class="tk tk-' + (c[2] || "listen") + '"></span>';
      b.querySelector(".chap-t").textContent = fmt(c[0]);
      b.querySelector(".chap-x").textContent = c[1];
      b.querySelector(".tk").textContent = (c[2] === "desk" ? "Desk" : "Listen");
      b.setAttribute("aria-label", "Jump to " + fmt(c[0]) + " — " + c[1]);
      b.addEventListener("click", function () { jump(c[0]); });

      row.appendChild(tk); row.appendChild(b);
      rows.push(row); list.appendChild(row);
    });
    paintProgress();
  }

  var tag = document.createElement("script");
  tag.src = "https://www.youtube.com/iframe_api";
  document.head.appendChild(tag);
})();
