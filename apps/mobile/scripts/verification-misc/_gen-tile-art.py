#!/usr/bin/env python3
# Signature mini-visual per Home bento tile -> percent-encoded utf8 SVG data-URIs.
# Served via <img src> (NOT css background: dc-runtime cssToObj splits on ';').
# Output: scripts/_tileart.js.snippet  ->  const VIZART={...};
import os
from urllib.parse import quote

# Haze v2: fully monochrome — ink highlight, graphite secondary, light track. No chromatic accent.
ROSE  = '#18181b'   # ink highlight (pipeline fill/nodes, guard ticks, orders stamp, analytics dot)
ACC   = '#18181b'   # ink highlight (pipeline fill/nodes, automations trigger, catalog lead)
ACCD  = '#18181b'   # ink (caps)
RED   = '#18181b'   # ink (guard shield/check)
WARM  = '#6b6b70'   # graphite (orders receipt body)
GREEN = '#18181b'   # ink (pipeline won-check)
GRAPHITE = '#6b6b70'
INK   = '#18181b'
GREY  = '#e7e7ea'   # light track / muted
SUB   = '#9c9ca1'

VB = 'viewBox="0 0 200 60"'
OPEN = f'<svg xmlns="http://www.w3.org/2000/svg" {VB} fill="none">'
CLOSE = '</svg>'


def pipeline():
    # sales FUNNEL: stacked bars narrowing top->bottom (leads -> won). Distinct from
    # automations' horizontal node-flow. Rose, last stage = ink (closed/won).
    cx = 62
    # (y, half-width, fill, opacity)
    rows = [
        (10, 62, ROSE, 1.0),
        (24, 46, ROSE, 0.80),
        (38, 30, ROSE, 0.55),
        (52, 16, INK, 1.0),
    ]
    parts = [OPEN]
    for y, hw, col, op in rows:
        parts.append(f'<rect x="{cx-hw}" y="{y-5}" width="{hw*2}" height="10" rx="5" fill="{col}" opacity="{op}"/>')
    parts.append(CLOSE)
    return ''.join(parts)


def automations():
    # connected flow: trigger -> action -> action, first node filled, pulse ring, arrow
    parts = [OPEN]
    parts.append(f'<line x1="26" y1="30" x2="100" y2="30" stroke="{GRAPHITE}" stroke-width="2.6" stroke-linecap="round"/>')
    parts.append(f'<line x1="100" y1="30" x2="172" y2="30" stroke="{GRAPHITE}" stroke-width="2.6" stroke-linecap="round"/>')
    # pulse ring on trigger (the single rose accent)
    parts.append(f'<circle cx="26" cy="30" r="13" fill="{ROSE}" opacity="0.12"/>')
    parts.append(f'<circle cx="26" cy="30" r="8" fill="{ROSE}"/>')
    parts.append(f'<path d="M22.5 30l2.4 2.4 4.6-5" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>')
    # mid + end nodes outline (graphite)
    parts.append(f'<circle cx="100" cy="30" r="8" fill="#fff" stroke="{GRAPHITE}" stroke-width="2.6"/>')
    parts.append(f'<rect x="96" y="26" width="8" height="8" rx="1.6" fill="{GRAPHITE}"/>')
    parts.append(f'<circle cx="172" cy="30" r="8" fill="#fff" stroke="{GRAPHITE}" stroke-width="2.6"/>')
    parts.append(f'<path d="M169 30h6M172 27v6" stroke="{GRAPHITE}" stroke-width="2" stroke-linecap="round"/>')
    parts.append(CLOSE)
    return ''.join(parts)


def guard():
    # shield (red) + 3 severity tick bars
    parts = [OPEN]
    parts.append(f'<path d="M34 8l20 7v13c0 11-8.6 19.5-20 23-11.4-3.5-20-12-20-23V15l20-7Z" fill="{RED}" fill-opacity="0.10" stroke="{RED}" stroke-width="2.4" stroke-linejoin="round"/>')
    parts.append(f'<path d="M25 30l6 6 12-13" stroke="{RED}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>')
    # severity bars
    bars = [(96, 78, 1.0), (96, 60, 0.62), (96, 42, 0.34)]
    ys = [20, 30, 40]
    for (x, w, op), y in zip(bars, ys):
        parts.append(f'<rect x="{x}" y="{y-3}" width="{w}" height="6" rx="3" fill="{ROSE}" opacity="{op}"/>')
    parts.append(CLOSE)
    return ''.join(parts)


def orders():
    # receipt: rounded-top card with zigzag bottom + content lines + paid stamp
    parts = [OPEN]
    # body
    parts.append(f'<path d="M22 12a4 4 0 0 1 4-4h44a4 4 0 0 1 4 4v34l-7-4-7 4-7-4-7 4-7-4-7 4-3-2Z" fill="#fff" stroke="{WARM}" stroke-width="2.2" stroke-linejoin="round"/>')
    # content lines
    parts.append(f'<rect x="30" y="18" width="30" height="4" rx="2" fill="{WARM}" opacity="0.85"/>')
    parts.append(f'<rect x="30" y="27" width="22" height="3.5" rx="1.75" fill="{WARM}" opacity="0.4"/>')
    parts.append(f'<rect x="30" y="35" width="26" height="3.5" rx="1.75" fill="{WARM}" opacity="0.4"/>')
    # paid stamp + amount chip on right (the single rose accent)
    parts.append(f'<circle cx="120" cy="22" r="13" fill="{ROSE}" fill-opacity="0.12" stroke="{ROSE}" stroke-width="2"/>')
    parts.append(f'<path d="M114 22l4 4 7-8" stroke="{ROSE}" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/>')
    parts.append(f'<rect x="100" y="40" width="56" height="11" rx="5.5" fill="{ROSE}" opacity="0.85"/>')
    parts.append(CLOSE)
    return ''.join(parts)


def _bottle(cx, tint):
    # mini dropper bottle centred on cx, baseline ~52
    return (
        f'<rect x="{cx-13}" y="20" width="26" height="32" rx="6" fill="{tint}"/>'
        f'<rect x="{cx-4}" y="13" width="8" height="6" rx="1.5" fill="{tint}"/>'
        f'<rect x="{cx-7}" y="6" width="14" height="9" rx="3" fill="{ACCD}"/>'
        f'<rect x="{cx-7}" y="32" width="14" height="9" rx="2" fill="#fff" opacity="0.85"/>'
    )


def catalog():
    # tiny shelf of 3 product bottles
    parts = [OPEN]
    tints = [ROSE, '#a1a1aa', '#d4d4d8']  # one rose lead, rest graphite (mono shelf)
    for cx, t in zip([28, 78, 128], tints):
        parts.append(_bottle(cx, t))
    parts.append(f'<line x1="10" y1="55" x2="150" y2="55" stroke="{GREY}" stroke-width="2.5" stroke-linecap="round"/>')
    parts.append(CLOSE)
    return ''.join(parts)


def analytics():
    # rising area sparkline (real 14-day series), green, end dot
    raw = [8, 12, 6, 14, 10, 18, 22, 16, 24, 19, 28, 21, 30, 26]
    mx = max(raw)
    x0, x1, ytop, ybot = 12, 188, 12, 50
    n = len(raw)
    pts = []
    for i, v in enumerate(raw):
        x = x0 + (x1 - x0) * i / (n - 1)
        y = ybot - (ybot - ytop) * (v / mx)
        pts.append((round(x, 1), round(y, 1)))
    line = 'M' + ' L'.join(f'{x} {y}' for x, y in pts)
    area = line + f' L{pts[-1][0]} 56 L{pts[0][0]} 56 Z'
    parts = [OPEN]
    parts.append(f'<path d="{area}" fill="{ROSE}" fill-opacity="0.12"/>')
    parts.append(f'<path d="{line}" stroke="{GRAPHITE}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>')
    ex, ey = pts[-1]
    parts.append(f'<circle cx="{ex}" cy="{ey}" r="6" fill="{ROSE}" opacity="0.18"/>')
    parts.append(f'<circle cx="{ex}" cy="{ey}" r="3.4" fill="{ROSE}"/>')
    parts.append(CLOSE)
    return ''.join(parts)


VIZ = {
    'pipeline': pipeline(),
    'automations': automations(),
    'guard': guard(),
    'orders': orders(),
    'catalog': catalog(),
    'analytics': analytics(),
}

out = {k: 'data:image/svg+xml,' + quote(v, safe='') for k, v in VIZ.items()}
js = 'const VIZART={' + ','.join(f'{k}:"{v}"' for k, v in out.items()) + '};'
dest = os.path.join(os.path.dirname(__file__), '_tileart.js.snippet')
open(dest, 'w').write(js)
# also dump raw svgs for local preview
for k, v in VIZ.items():
    open(os.path.join('/tmp', f'viz_{k}.svg'), 'w').write(v)
print(f'wrote {dest} ({len(js)} chars, {len(out)} tiles)')
