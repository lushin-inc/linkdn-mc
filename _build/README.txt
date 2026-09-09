How to change the timestamps
----------------------------
1. Open chapters_new.py and edit the list for the section you want.
   Each line is ("m:ss" or "h:mm:ss", "Chapter title").
2. Run:  python3 _build/build_site.py     (from the folder above _build)
   Every page is regenerated. Never hand-edit the HTML.

Adding section 5 as a combined video later: add a dict to SECTIONS in
chapters_new.py with its slug, YouTube id, duration, gradient and chapters.
