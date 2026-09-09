# -*- coding: utf-8 -*-
"""Rebuild the portal around the four combined section videos.

Edit chapters_new.py (times + titles) and re-run:  python3 build_site.py
Pages are generated, never hand-edited.
"""
import json, os, re, glob, shutil, html
import chapters_new as C

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
V, SEC, TOOLS = ROOT+"/v", ROOT+"/sections", ROOT+"/tools"

CHEV = ('<span class="chev"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" '
        'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg></span>')
CLOCK = ('<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8" '
         'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3 2"/></svg>')
LINKOUT = ('<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" '
           'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 4h6v6"/><path d="M20 4 10 14"/>'
           '<path d="M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6"/></svg>')

def dot(g): return f'<span class="dot" style="background:linear-gradient(135deg,{g[0]},{g[1]})"></span>'

# ---------- 1. per-topic content carried over from the old sub-pages ----------
def harvest():
    """Notes links and reference panels rescued from the per-topic pages that
    the combined videos replaced. Stored in carryover.json so the build stays
    reproducible now that those pages are gone."""
    p = os.path.join(os.path.dirname(os.path.abspath(__file__)), "carryover.json")
    if not os.path.exists(p): p = "carryover.json"
    if not os.path.exists(p): return {}, {}
    data = json.load(open(p, encoding="utf-8"))
    notes = {k: [tuple(x) for x in v["notes"]] for k, v in data.items()}
    panels = {k: [tuple(x) for x in v["panels"]] for k, v in data.items()}
    return notes, panels

# ---------- 2. nav ----------
def build_nav(depth, current=None):
    """depth: '' for root, '../' for pages one level down."""
    p = depth
    CUR = ' class="current"'
    out = ['<nav class="sidebar" aria-label="Course sections">']
    for s in C.SECTIONS:
        cur = CUR if current == s["slug"] else ''
        out.append('<a class="nav-head nav-direct"%s href="%sv/%s.html">%s%s</a>'
                   % (cur, p, s["slug"], dot(s["g"]), s["nav"]))
    tools = [("ai-content-bot","AI Content Bot"),("acceptance-checklist","50%+ Acceptance Rate Checklist"),
             ("lab-resources","Lab Resources"),("tuesday-training","Tuesday Training Vault")]
    openr = ' open' if current in [t[0] for t in tools] else ''
    li = ''.join('<li><a href="%stools/%s.html"%s>%s</a></li>' % (p, sl, CUR if current==sl else '', html.escape(t)) for sl, t in tools)
    out.append('<details class="nav-group"%s><summary class="nav-head">%sResources%s</summary>'
               '<ul class="nav-list"><li><a href="%ssections/resources.html">All resources</a></li>%s</ul></details>'
               % (openr, dot(("#4A4E7A","#6E4A86")), CHEV, p, li))
    out.append('</nav>')
    return ''.join(out)

# ---------- 3. the four video pages ----------
def chapters_panel():
    return (f'<details class="panel" open><summary>{CHEV}Chapters</summary>'
            f'<div class="panel-body"><div class="chapters" id="chapList"></div></div></details>')

def notes_panel(items):
    if not items: return ""
    rows = ''.join(f'<a class="notelink" href="{u}" target="_blank" rel="noopener">{LINKOUT}<span>{html.escape(t)}</span></a>'
                   for t, u in items)
    return (f'<details class="panel"><summary>{CHEV}Ty’s notes</summary>'
            f'<div class="panel-body"><div class="notegrid">{rows}</div></div></details>')

def extra_panels(items):
    return ''.join(f'<details class="panel"><summary>{CHEV}{html.escape(lab)}</summary>'
                   f'<div class="panel-body">{body}</div></details>' for lab, body in items)

def page(s, notes, panels, prev, nxt):
    payload = json.dumps({"id": s["vid"], "chapters": s["chapters"]})
    pager = '<nav class="pager" aria-label="Previous and next">'
    if prev: pager += f'<a href="{prev[0]}"><span class="pg-lab">← Previous</span><span class="pg-t">{html.escape(prev[1])}</span></a>'
    if nxt:  pager += f'<a class="right" href="{nxt[0]}"><span class="pg-lab">Next →</span><span class="pg-t">{html.escape(nxt[1])}</span></a>'
    pager += '</nav>'
    return f'''<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{html.escape(s["name"])} — LinkedIn Client Lab</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../assets/style.css">
<style>:root{{--g1:{s["g"][0]};--g2:{s["g"][1]}}}</style>
<script>window.LCL_VIDEO={payload};</script>
</head>
<body>
<script>(function(){{try{{var t=JSON.parse(localStorage.getItem("lcl:theme")||'"light"');document.documentElement.setAttribute("data-theme",t);var n=JSON.parse(localStorage.getItem("lcl:nav")||'"open"');if(n==="closed")document.documentElement.classList.add("pre-nav-closed");}}catch(e){{}}}})();</script>
<header class="topbar">
  <button class="iconbtn" data-act="nav" aria-label="Toggle navigation"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18"/></svg></button>
  <a class="brand" href="../index.html">LinkedIn Client Lab</a>
  <button class="iconbtn" data-act="theme" aria-label="Switch light or dark"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.4v2M12 19.6v2M4.2 4.2l1.5 1.5M18.3 18.3l1.5 1.5M2.4 12h2M19.6 12h2M4.2 19.8l1.5-1.5M18.3 5.7l1.5-1.5"/></svg></button>
</header>
<div class="shell">
{build_nav("../", s["slug"])}
<main class="main">
<div class="wrap"><p class="eyebrow">LinkedIn Client Lab</p><h1 class="title"><span class="title-grad">{html.escape(s["name"])}</span></h1><p class="meta">{CLOCK} {s["dur"]}</p><div class="player-wrap"><div id="ytplayer"></div></div>{chapters_panel()}{notes_panel(notes)}{extra_panels(panels)}{pager}</div>
</main>
</div>
<script>if(document.documentElement.classList.contains("pre-nav-closed"))document.body.classList.add("nav-closed");</script>
<script src="../assets/app.js"></script>

</body>
</html>
'''

def main():
    notes, panels = harvest()

    # remove the old per-topic pages and their section pages
    removed = 0
    for f in glob.glob(V+"/*.html"):
        b = os.path.basename(f)
        if b.split("-")[0] in ("1","2","3","4","5") and b[:-5] not in [x["slug"] for x in C.SECTIONS]:
            os.remove(f); removed += 1
    for n in ("masterclasses","training","macro-dm","micro-dm","answer-sessions"):
        p = f"{SEC}/{n}.html"
        if os.path.exists(p): os.remove(p); removed += 1

    # write the four combined pages
    order = [(s["slug"], s["name"]) for s in C.SECTIONS]
    for i, s in enumerate(C.SECTIONS):
        prev = (order[i-1][0]+".html", order[i-1][1]) if i > 0 else None
        nxt  = (order[i+1][0]+".html", order[i+1][1]) if i < len(order)-1 else None
        pre = s["old_prefix"][0]
        open(f'{V}/{s["slug"]}.html', "w", encoding="utf-8").write(
            page(s, notes.get(pre, []), panels.get(pre, []), prev, nxt))

    # rewrite nav everywhere else
    touched = 0
    for f in glob.glob(ROOT+"/*.html") + glob.glob(SEC+"/*.html") + glob.glob(TOOLS+"/*.html"):
        s = open(f, encoding="utf-8").read()
        depth = "" if os.path.dirname(f) == ROOT else "../"
        cur = os.path.basename(f)[:-5]
        new = re.sub(r'<nav class="sidebar".*?</nav>', lambda m: build_nav(depth, cur), s, count=1, flags=re.S)
        # home tiles / any link into the deleted section pages -> the combined video
        for sec in C.SECTIONS:
            old = sec["slug"].split("-", 1)[1]
            old = {"masterclass":"masterclasses","training":"training","macro-dm":"macro-dm","micro-dm":"micro-dm","answers":"answer-sessions"}[old]
            new = new.replace(f'href="{depth}sections/{old}.html"', f'href="{depth}v/{sec["slug"]}.html"')
            new = new.replace(f'href="sections/{old}.html"', f'href="v/{sec["slug"]}.html"')
        # the answer-session pages' pagers must not point at deleted pages
        # any surviving link to a retired per-topic page -> its combined video
        for sec in C.SECTIONS:
            pre = sec["old_prefix"][0]
            new = re.sub(r'((?:\.\./)?)v/' + pre + r'-[a-z0-9-]+\.html',
                         lambda m, sl=sec["slug"]: m.group(1) + "v/" + sl + ".html", new)
        if new != s:
            open(f, "w", encoding="utf-8").write(new); touched += 1

    # tile label: "Masterclasses" -> "Masterclass" on the home page
    ix = ROOT+"/index.html"; s = open(ix, encoding="utf-8").read()
    s = s.replace('<span class="tile-name">Masterclasses</span>', '<span class="tile-name">Masterclass</span>')
    open(ix, "w", encoding="utf-8").write(s)

    print(f"removed {removed} old pages")
    print(f"wrote   {len(C.SECTIONS)} combined video pages")
    print(f"nav rewritten on {touched} pages")
    for s_ in C.SECTIONS:
        pre = s_["old_prefix"][0]
        print(f'  {s_["name"]:<12} {len(s_["chapters"]):>3} chapters | {len(notes.get(pre,[]))} notes links | {len(panels.get(pre,[]))} reference panels')

main()
