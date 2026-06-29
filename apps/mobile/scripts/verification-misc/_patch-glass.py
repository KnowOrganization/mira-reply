#!/usr/bin/env python3
# Haze v2: smoked liquid glass on chrome/sheets/Send + cool indigo micro-accent.
import os
D = os.path.dirname(__file__)
P = os.path.join(D, '..', 'design', 'Mira.dc.html')
s = open(P).read()
orig = s


def rep(old, new, n=1):
    global s
    c = s.count(old)
    assert c == n, f'expected {n}x {old[:55]!r}, got {c}'
    s = s.replace(old, new, n)


# reusable inline glass recipes
BAR = ("background:var(--glass-smoke-bg);backdrop-filter:blur(var(--glass-blur)) saturate(140%);"
       "-webkit-backdrop-filter:blur(var(--glass-blur)) saturate(140%);")
SMOKE = (BAR + "border:.5px solid var(--glass-border);box-shadow:var(--glass-shadow),var(--glass-highlight);")
LIGHT = ("background:var(--glass-light-bg);backdrop-filter:blur(14px) saturate(130%);"
         "-webkit-backdrop-filter:blur(14px) saturate(130%);border:.5px solid rgba(255,255,255,.7);"
         "box-shadow:0 6px 18px rgba(60,50,95,.10),inset 0 1px 0 rgba(255,255,255,.7);")

# ---- 1. tokens: indigo accent + glass tokens --------------------------------
rep("--accent:#d9477a; --accent-fg:#ffffff; --accent-soft:#fae9ef; --accent-deep:#b0335f;",
    "--accent:#5A5FE0; --accent-fg:#ffffff; --accent-soft:#ECEDFC; --accent-deep:#4346C0;"
    " --glass-smoke-bg:rgba(236,236,245,.45); --glass-light-bg:rgba(255,255,255,.72);"
    " --glass-border:rgba(255,255,255,.55); --glass-shadow:0 8px 24px rgba(60,50,95,.12);"
    " --glass-highlight:inset 0 1px 0 rgba(255,255,255,.55); --glass-text:#2C2C3C; --glass-blur:16px;")

# ---- 2. glass classes + focus ring (before body{) ---------------------------
rep("body{font-family:'Inter'",
    ".glass-smoke{background:var(--glass-smoke-bg);backdrop-filter:blur(var(--glass-blur)) saturate(140%);"
    "-webkit-backdrop-filter:blur(var(--glass-blur)) saturate(140%);border:.5px solid var(--glass-border);"
    "box-shadow:var(--glass-shadow),var(--glass-highlight);color:var(--glass-text);transition:transform .15s ease,background .15s ease;}"
    ".glass-light{background:var(--glass-light-bg);backdrop-filter:blur(14px) saturate(130%);"
    "-webkit-backdrop-filter:blur(14px) saturate(130%);border:.5px solid rgba(255,255,255,.7);"
    "box-shadow:0 6px 18px rgba(60,50,95,.10),inset 0 1px 0 rgba(255,255,255,.7);color:var(--glass-text);transition:transform .15s ease,background .15s ease;}"
    ".glass-smoke:active,.glass-light:active{transform:scale(.98);}"
    "@supports not ((backdrop-filter:blur(1px)) or (-webkit-backdrop-filter:blur(1px))){.glass-smoke{background:rgba(240,240,247,.92);}.glass-light{background:rgba(255,255,255,.95);}}"
    ":focus-visible{outline:2px solid var(--accent);outline-offset:2px;}"
    "body{font-family:'Inter'")

# ---- 3. apply glass to floating / over-content controls ---------------------
# bottom nav bar
rep("background:color-mix(in srgb,var(--bg) 78%,transparent);backdrop-filter:blur(26px) saturate(1.5);-webkit-backdrop-filter:blur(26px) saturate(1.5);border-top:.5px solid var(--border);",
    BAR + "border-top:.5px solid var(--glass-border);")
# route back-header
rep("border-bottom:1px solid var(--border);background:color-mix(in srgb,var(--bg) 85%,transparent);backdrop-filter:blur(20px);",
    BAR + "border-bottom:.5px solid var(--glass-border);")
# storefront shop header
rep("background:color-mix(in srgb,var(--bg) 88%,transparent);backdrop-filter:blur(14px);border-bottom:.5px solid var(--border);",
    BAR + "border-bottom:.5px solid var(--glass-border);")
# settings-gear FAB
rep("border:1px solid var(--border);background:linear-gradient(150deg,var(--accent),var(--accent-deep));color:#fff;",
    LIGHT + "color:var(--glass-text);")
# new-flow FAB
rep("width:40px;height:40px;border-radius:12px;border:none;background:var(--text);color:var(--bg-elev);",
    "width:40px;height:40px;border-radius:12px;" + LIGHT + "color:var(--glass-text);")
# sign-in "Continue with Google" CTA (over ambient)
rep("border:1px solid var(--border-strong);background:var(--bg-elev);color:var(--text);font-family:inherit;font-size:15px",
    SMOKE + "color:var(--glass-text);font-family:inherit;font-size:15px")
# composer Send button
rep("border:none;background:{{ sendBtnBg }};color:#fff;", LIGHT + "color:var(--glass-text);")
# bottom sheets (settings / builder / +1) -> smoked
rep("background:var(--bg);border-radius:26px 26px 0 0;",
    BAR + "border-radius:26px 26px 0 0;", n=3)

# ---- 4. strict-micro accent: active states -> ink ---------------------------
rep("?A:'var(--border-strong)'", "?'var(--text)':'var(--border-strong)'", n=9)   # toggles + intro dots
rep("bg:on?A:'var(--bg-elev)'", "bg:on?'var(--text)':'var(--bg-elev)'", n=2)
rep("bd:on?A:'var(--border)'", "bd:on?'var(--text)':'var(--border)'", n=2)
rep("fg:on?A:'var(--text-muted)'", "fg:on?'var(--text)':'var(--text-muted)'", n=2)
rep("active?A:'var(--text-subtle)'", "active?'var(--text)':'var(--text-subtle)'")
rep("line-height:.82;color:var(--accent);", "line-height:.82;color:var(--text);")
rep("box-shadow:0 0 0 2px rgba(217,71,122,.35)", "box-shadow:0 0 0 2px rgba(90,95,224,.35)")

# ---- 5. type: viewport-fit + cap weights to <=500 ---------------------------
rep('<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">')
s = s.replace('font-weight:600', 'font-weight:500')   # global cap (was 197)

# ---- 6. swap regenerated monochrome VIZART literal --------------------------
viz = open(os.path.join(D, 'verification-misc', '_tileart.js.snippet')).read().strip()
i = s.index('const VIZART={')
j = s.index('};', i) + 2
s = s[:i] + viz + s[j:]

assert s != orig
open(P, 'w').write(s)
print(f'glass v2 applied -- {len(orig)} -> {len(s)} chars')
