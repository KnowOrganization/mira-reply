#!/usr/bin/env python3
# Agent cards -> "Tony Stark" treatment: animated neural particle field behind content
# + spinning conic energy-ring orb avatar. All CSS/SVG (WebKit-safe), mono + indigo.
import os, shutil
D = os.path.dirname(__file__)
P = os.path.join(D, '..', 'design', 'Mira.dc.html')
shutil.copy(P, os.path.join(D, 'verification-misc', 'Mira.dc.html.pre-stark'))
s = open(P).read()
orig = s


def rep(old, new, n=1):
    global s
    c = s.count(old)
    assert c == n, f'expected {n}x {old[:55]!r}, got {c}'
    s = s.replace(old, new, n)


# 1. keyframes: twinkle, float, flowing dashes (after glow)
GLOW = '@keyframes glow{0%,100%{box-shadow:0 0 0 0 color-mix(in srgb,var(--accent) 55%,transparent);}50%{box-shadow:0 0 0 7px color-mix(in srgb,var(--accent) 0%,transparent);}}'
rep(GLOW, GLOW + '\n  @keyframes tw{0%,100%{opacity:.12;}50%{opacity:.85;}}'
    '\n  @keyframes flo{0%,100%{transform:translateY(0);}50%{transform:translateY(-4px);}}'
    '\n  @keyframes dash{to{stroke-dashoffset:-32;}}')

# 2. particle-field SVG (reused per card). transform-box so SVG nodes can translate.
NODES = [  # cx, cy, r, dur, delay
    (26, 28, 2.1, 3.4, 0), (74, 52, 1.6, 2.8, .4), (122, 34, 2.3, 3.8, .9),
    (150, 88, 1.7, 3.0, .2), (44, 100, 2.0, 4.2, .6), (98, 110, 1.5, 3.2, 1.1),
    (134, 116, 1.9, 3.6, .3), (60, 78, 1.4, 2.6, .8),
]
LINES = [(26,28,74,52),(74,52,122,34),(122,34,150,88),(74,52,44,100),(122,34,98,110),(44,100,98,110),(98,110,134,116),(74,52,60,78)]
svg = '<svg viewBox="0 0 172 140" preserveAspectRatio="xMidYMid slice" style="position:absolute;inset:0;width:100%;height:100%;opacity:.6;pointer-events:none;z-index:0;">'
svg += '<g stroke="var(--accent)" stroke-width="0.7" opacity="0.3" stroke-linecap="round">'
for k, (x1, y1, x2, y2) in enumerate(LINES):
    svg += f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke-dasharray="2.5 5" style="animation:dash {1.4+0.18*k:.1f}s linear infinite;"/>'
svg += '</g><g fill="var(--accent)">'
for cx, cy, r, dur, dl in NODES:
    svg += (f'<circle cx="{cx}" cy="{cy}" r="{r}" style="transform-box:fill-box;transform-origin:center;'
            f'animation:tw {dur}s ease-in-out infinite, flo {dur+1.5:.1f}s ease-in-out infinite;animation-delay:{dl}s,{dl}s;"/>')
svg += '</g></svg>'

# 3. spinning energy-ring orb avatar
ORB = ('<div style="position:relative;width:38px;height:38px;flex-shrink:0;">'
       '<div style="position:absolute;inset:-3px;border-radius:50%;background:conic-gradient(from 0deg,transparent 0deg,var(--accent) 95deg,transparent 210deg);animation:spin 2.6s linear infinite;opacity:.8;"></div>'
       '<div style="position:absolute;inset:1px;border-radius:50%;background:{{ a.av }};color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:500;letter-spacing:.02em;box-shadow:0 0 0 2px var(--bg-elev);">{{ a.init }}</div>'
       '</div>')

# 4. replace card markup
OLD_CARD = ('<div style="flex:0 0 auto;width:172px;border:1px solid var(--border);border-radius:18px;background:var(--bg-elev);box-shadow:0 1px 2px rgba(24,24,27,.04),0 8px 22px rgba(60,50,95,.09);padding:14px;">\n'
            '                <div style="display:flex;align-items:center;justify-content:space-between;">\n'
            '                  <div style="width:36px;height:36px;border-radius:50%;background:{{ a.av }};color:#fff;display:flex;align-items:center;justify-content:center;font-size:12.5px;font-weight:500;letter-spacing:.02em;">{{ a.init }}</div>\n'
            '                  <span style="width:7px;height:7px;border-radius:50%;background:var(--accent);animation:glow 2s ease-out infinite;flex-shrink:0;"></span>\n'
            '                </div>\n'
            '                <div style="font-size:14.5px;font-weight:500;color:var(--text);margin-top:11px;">{{ a.name }}</div>\n'
            '                <div style="font-size:11.5px;color:var(--text-subtle);margin-top:2px;line-height:1.3;">{{ a.role }}</div>\n'
            '                <div style="font-size:11.5px;font-weight:500;color:var(--text);margin-top:9px;">{{ a.stat }}</div>\n'
            '              </div>')
NEW_CARD = ('<div style="position:relative;overflow:hidden;flex:0 0 auto;width:172px;border:1px solid var(--border);border-radius:18px;background:var(--bg-elev);box-shadow:0 1px 2px rgba(24,24,27,.04),0 8px 22px rgba(60,50,95,.09);padding:14px;">\n'
            '                ' + svg + '\n'
            '                <div style="position:relative;z-index:1;">\n'
            '                  <div style="display:flex;align-items:center;justify-content:space-between;">\n'
            '                    ' + ORB + '\n'
            '                    <span style="width:7px;height:7px;border-radius:50%;background:var(--accent);animation:glow 2s ease-out infinite;flex-shrink:0;"></span>\n'
            '                  </div>\n'
            '                  <div style="font-size:14.5px;font-weight:500;color:var(--text);margin-top:11px;">{{ a.name }}</div>\n'
            '                  <div style="font-size:11.5px;color:var(--text-subtle);margin-top:2px;line-height:1.3;">{{ a.role }}</div>\n'
            '                  <div style="font-size:11.5px;font-weight:500;color:var(--text);margin-top:9px;">{{ a.stat }}</div>\n'
            '                </div>\n'
            '              </div>')
rep(OLD_CARD, NEW_CARD)

assert s != orig
open(P, 'w').write(s)
print(f'stark patched -- {len(orig)} -> {len(s)} chars')
