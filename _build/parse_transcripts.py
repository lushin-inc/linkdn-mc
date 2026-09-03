#!/usr/bin/env python3
"""Parse the chapter-list files in ../../Transcripts into chapters.json entries."""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
TRANSCRIPTS = os.path.normpath(os.path.join(HERE, "..", "..", "Transcripts"))

# transcript filename fragment -> page slug
MAP = {
    "1.2": "1-2-linkedin-dm-masterclass",
    "1.3": "1-3-reverse-engineering-how-to-convey-yourself-t",
    "1.4": "1-4-reply-objection-handling",
    "1.5": "1-5-follow-up-dms",
    "1.6": "1-6-linkedin-content",
    "5.1": "5-1-how-to-dm-the-6-levels-of-prospect-warmth",
    "5.2": "5-2-live-answers",
    "5.3": "5-3-live-answers",
    "5.4": "5-4-live-answers",
    "5.5": "5-5-live-answers",
}

LINE = re.compile(r'^\s*(\d{1,2}:\d{2}(?::\d{2})?)\s*(?:—|-|–)?\s*(.+?)\s*$')

def secs(ts):
    parts = [int(p) for p in ts.split(":")]
    if len(parts) == 2:
        return parts[0] * 60 + parts[1]
    return parts[0] * 3600 + parts[1] * 60 + parts[2]

def main():
    out = {}
    for fn in sorted(os.listdir(TRANSCRIPTS)):
        if not fn.endswith(".txt"):
            continue
        m = re.search(r'Lab\s+(\d+\.\d+)', fn)
        if not m or m.group(1) not in MAP:
            continue
        slug = MAP[m.group(1)]
        chapters = []
        for line in open(os.path.join(TRANSCRIPTS, fn), encoding="utf-8"):
            mm = LINE.match(line)
            if not mm:
                continue
            title = mm.group(2).strip().strip("—-– ")
            if not title:
                continue
            chapters.append([secs(mm.group(1)), title])
        # de-dupe + sort by time
        seen, clean = set(), []
        for t, x in sorted(chapters, key=lambda c: c[0]):
            if t in seen:
                continue
            seen.add(t)
            clean.append([t, x])
        out[slug] = clean
        print(f"{m.group(1):>4}  {len(clean):>3} chapters  ->  {slug}")
    dest = os.path.join(HERE, "chapters_from_transcripts.json")
    json.dump(out, open(dest, "w", encoding="utf-8"), indent=1, ensure_ascii=False)
    print("\nwrote", dest)

main()
