#!/usr/bin/env python3
# (1) Lock document so the WebView can't be pulled/rubber-banded like a webpage.
# (2) Move the brain panel INTO the deal-feed scroll so it scrolls with the page.
import os, shutil
D = os.path.dirname(__file__)
P = os.path.join(D, '..', 'design', 'Mira.dc.html')
shutil.copy(P, os.path.join(D, 'verification-misc', 'Mira.dc.html.pre-scrolllock'))
s = open(P).read()
orig = s

# 1a. lock html/body — no document-level scroll/overscroll bounce
rep_body = "body{font-family:'Inter',-apple-system,BlinkMacSystemFont,'SF Pro Text',system-ui,sans-serif;-webkit-font-smoothing:antialiased;}"
assert s.count(rep_body) == 1
s = s.replace(rep_body,
              "html,body{margin:0;height:100%;width:100%;overflow:hidden;position:fixed;overscroll-behavior:none;-webkit-overflow-scrolling:auto;touch-action:pan-y;}\n  " + rep_body, 1)

# 1b. root frame: 100vh -> 100% so it fits the locked body exactly (no overflow to bounce)
assert s.count('<div style="min-height:100vh;width:100%;display:flex;align-items') == 1
s = s.replace('<div style="min-height:100vh;width:100%;display:flex;align-items',
              '<div style="height:100%;width:100%;display:flex;align-items', 1)

# 2. move brain panel into the deal-feed scroll (top), so it scrolls with content
brain_anchor = '<div style="padding:2px 18px 0;flex-shrink:0;"><div style="font-size:11.5px;font-weight:500;color:var(--text-subtle);display:flex;align-items:center;gap:7px;"><span style="width:6px;height:6px;border-radius:50%;background:var(--accent);animation:glow 2s ease-out infinite;"></span>Mira brain'
feed_open = '<div class="scroll" style="flex:1;overflow-y:auto;padding:8px 18px 116px;">'
a = s.index(brain_anchor)
f = s.index(feed_open, a)
assert s.count(feed_open) == 1
panel = s[a:f]                     # brain panel + trailing whitespace
fe = f + len(feed_open)
s = s[:a] + feed_open + panel + s[fe:]   # feed opens first, brain becomes its first child

assert s != orig
open(P, 'w').write(s)
print(f'scrolllock patched -- {len(orig)} -> {len(s)} chars')
