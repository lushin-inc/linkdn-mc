#!/usr/bin/env python3
"""
Stamp chapter data + the Chapters panel into every video page.

To add or fix timestamps: edit chapters.json (seconds, title), then run:
    python3 _build/build_chapters.py
Pages are never hand-edited.
"""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, ".."))
V = os.path.join(ROOT, "v")

CHEV = ('<span class="chev"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" '
        'stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" '
        'aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg></span>')
PANEL = ('<details class="panel" open><summary>' + CHEV + 'Chapters</summary>'
         '<div class="panel-body"><div class="chapters" id="chapList"></div></div></details>')


def strip_panel(html):
    """Remove any existing Chapters panel (old editable widget or previous build)."""
    i = html.find('id="chapList"')
    if i == -1:
        return html, False
    start = html.rfind("<details", 0, i)
    end = html.find("</details>", i)
    if start == -1 or end == -1:
        return html, False
    return html[:start] + html[end + len("</details>"):], True


def main():
    data = json.load(open(os.path.join(HERE, "chapters.json"), encoding="utf-8"))
    changed = with_ch = without = 0

    for slug, rec in sorted(data.items()):
        path = os.path.join(V, slug + ".html")
        if not os.path.exists(path):
            print("  !! missing page:", slug); continue
        html = open(path, encoding="utf-8").read()
        before = html

        chapters = sorted(rec.get("chapters", []), key=lambda c: c[0])

        # 1. data block
        payload = json.dumps({"id": rec["id"], "chapters": chapters})
        html = re.sub(r'window\.LCL_VIDEO=\{.*?\};',
                      lambda m: "window.LCL_VIDEO=" + payload + ";", html, count=1, flags=re.S)

        # 2. markup — always rebuilt from scratch
        html, _ = strip_panel(html)
        if chapters:
            k = html.find('<nav class="pager"')
            if k == -1:
                k = html.find("</main>")
            html = html[:k] + PANEL + html[k:]
            with_ch += 1
        else:
            without += 1

        if html != before:
            open(path, "w", encoding="utf-8").write(html)
            changed += 1

    print(f"pages written: {changed}")
    print(f"with chapters: {with_ch}   still empty: {without}")

main()
