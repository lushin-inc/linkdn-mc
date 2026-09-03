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

  /* ---------- video page: player + chapters (read-only, click to jump) ---------- */
  var cfg = window.LCL_VIDEO;
  if (!cfg) return;

  var chapters = (cfg.chapters || []).slice().sort(function (a, b) { return a[0] - b[0]; });
  var list = document.getElementById("chapList");
  var player = null, ready = false, btns = [], activeIdx = -1, tick = null;

  window.onYouTubeIframeAPIReady = function () {
    player = new YT.Player("ytplayer", {
      videoId: cfg.id,
      playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
      events: {
        onReady: function () { ready = true; },
        onStateChange: function (e) {
          if (e.data === YT.PlayerState.PLAYING) {
            clearInterval(tick);
            tick = setInterval(follow, 1000);
            follow();
          } else {
            clearInterval(tick);
          }
        }
      }
    });
  };

  function follow() {
    if (!ready || !player || !player.getCurrentTime) return;
    var t = player.getCurrentTime(), i = -1;
    for (var k = 0; k < chapters.length; k++) {
      if (chapters[k][0] <= t + 0.4) i = k; else break;
    }
    if (i === activeIdx) return;
    if (btns[activeIdx]) btns[activeIdx].classList.remove("playing");
    activeIdx = i;
    if (btns[activeIdx]) btns[activeIdx].classList.add("playing");
  }

  function jump(sec) {
    if (!ready || !player) return;
    player.seekTo(sec, true);
    player.playVideo();
    var top = document.querySelector(".player-wrap");
    if (top && top.getBoundingClientRect().top < 0) {
      top.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  if (list) {
    list.innerHTML = "";
    chapters.forEach(function (c) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "chap";
      b.innerHTML = '<span class="chap-t"></span><span class="chap-x"></span>';
      b.querySelector(".chap-t").textContent = fmt(c[0]);
      b.querySelector(".chap-x").textContent = c[1];
      b.setAttribute("aria-label", "Jump to " + fmt(c[0]) + " — " + c[1]);
      b.addEventListener("click", function () { jump(c[0]); });
      btns.push(b);
      list.appendChild(b);
    });
  }

  var tag = document.createElement("script");
  tag.src = "https://www.youtube.com/iframe_api";
  document.head.appendChild(tag);
})();
