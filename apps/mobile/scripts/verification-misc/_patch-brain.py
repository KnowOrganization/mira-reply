#!/usr/bin/env python3
# Replace agent CARDS with a central animated "Mira brain" + 6 orbiting agents (SMIL SVG).
# Mono+indigo, WKWebView-robust. Removes the dead `agents` vm too.
import os, shutil, math
D = os.path.dirname(__file__)
P = os.path.join(D, '..', 'design', 'Mira.dc.html')
shutil.copy(P, os.path.join(D, 'verification-misc', 'Mira.dc.html.pre-brain'))
s = open(P).read()
orig = s

CX, CY = 180, 130
AC = 'var(--accent)'

# ---- agents: (label, node_x, node_y, side) ----
AGENTS = [
    ('Sales Agent', 252, 58, 'r'),
    ('Analytics Agent', 256, 130, 'r'),
    ('Outreach Agent', 252, 202, 'r'),
    ('Comment Agent', 108, 58, 'l'),
    ('Guard Agent', 104, 130, 'l'),
    ('CRM Agent', 108, 202, 'l'),
]

P_ = []  # svg parts
P_.append('<svg viewBox="0 0 360 260" style="width:100%;height:auto;display:block;overflow:visible;">')
P_.append('<defs>'
          '<radialGradient id="bhalo"><stop offset="0%" stop-color="' + AC + '" stop-opacity="0.45"/>'
          '<stop offset="55%" stop-color="' + AC + '" stop-opacity="0.16"/>'
          '<stop offset="100%" stop-color="' + AC + '" stop-opacity="0"/></radialGradient>'
          '<filter id="bglow" x="-70%" y="-70%" width="240%" height="240%">'
          '<feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'
          '</defs>')

# 1. ambient halo (pulse)
P_.append(f'<circle cx="{CX}" cy="{CY}" r="74" fill="url(#bhalo)">'
          '<animate attributeName="opacity" values="0.22;0.4;0.22" dur="5s" repeatCount="indefinite"/></circle>')

# 2. rotating sunburst (Mira-logo varying-length spokes, faint graphite)
pat = [1, 0.62, 0.86, 0.7, 0.95, 0.66, 0.9, 0.74, 0.83, 0.6, 0.92, 0.68]
N = 36
sb = [f'<g stroke="#c4c4c8" stroke-width="1.4" stroke-linecap="round">'
      f'<animateTransform attributeName="transform" type="rotate" from="0 {CX} {CY}" to="360 {CX} {CY}" dur="84s" repeatCount="indefinite"/>']
for i in range(N):
    ang = math.radians(i * (360 / N))
    ln = pat[i % len(pat)]
    r0, r1 = 22, 22 + ln * 32
    x0, y0 = CX + r0 * math.cos(ang), CY + r0 * math.sin(ang)
    x1, y1 = CX + r1 * math.cos(ang), CY + r1 * math.sin(ang)
    op = 0.45 if i % 3 else 0.6
    sb.append(f'<line x1="{x0:.1f}" y1="{y0:.1f}" x2="{x1:.1f}" y2="{y1:.1f}" opacity="{op}"/>')
    if i % 3 == 0:
        sb.append(f'<rect x="{x1-1.6:.1f}" y="{y1-1.6:.1f}" width="3.2" height="3.2" fill="#c4c4c8" stroke="none" opacity="0.55"/>')
sb.append('</g>')
P_.append(''.join(sb))

# 3. agent spokes (dashed, flowing) + 4. nodes + 5. particles + 6. labels
for k, (lbl, nx, ny, side) in enumerate(AGENTS):
    dly = round(k * 0.45, 2)
    # spoke
    P_.append(f'<line x1="{CX}" y1="{CY}" x2="{nx}" y2="{ny}" stroke="{AC}" stroke-width="1.3" '
              f'stroke-dasharray="3 6" opacity="0.5"><animate attributeName="stroke-dashoffset" values="18;0" dur="1.2s" repeatCount="indefinite"/></line>')
    # particle core->agent (data binding)
    P_.append(f'<circle r="2.1" fill="{AC}" opacity="0">'
              f'<animate attributeName="cx" values="{CX};{nx}" dur="3s" begin="{dly}s" repeatCount="indefinite"/>'
              f'<animate attributeName="cy" values="{CY};{ny}" dur="3s" begin="{dly}s" repeatCount="indefinite"/>'
              f'<animate attributeName="opacity" values="0;0.9;0" dur="3s" begin="{dly}s" repeatCount="indefinite"/></circle>')
    # node: soft outer ring + core dot
    P_.append(f'<circle cx="{nx}" cy="{ny}" r="9" fill="{AC}" opacity="0.12"/>')
    P_.append(f'<circle cx="{nx}" cy="{ny}" r="5" fill="{AC}">'
              f'<animate attributeName="r" values="4.5;6;4.5" dur="2.6s" begin="{dly}s" repeatCount="indefinite"/></circle>')
    P_.append(f'<circle cx="{nx}" cy="{ny}" r="2" fill="#fff"/>')
    # label
    anchor = 'start' if side == 'r' else 'end'
    lx = nx + 12 if side == 'r' else nx - 12
    P_.append(f'<text x="{lx}" y="{ny+1}" text-anchor="{anchor}" fill="var(--text)" font-size="12.5" font-weight="500" '
              f'font-family="Inter, -apple-system, system-ui, sans-serif" letter-spacing="-0.01em">{lbl}</text>')
    P_.append(f'<text x="{lx}" y="{ny+13}" text-anchor="{anchor}" fill="var(--text-subtle)" font-size="9" '
              f'font-family="Inter, -apple-system, system-ui, sans-serif">running</text>')

# 7. core: expanding rings + glowing core + Mira spark
P_.append(f'<circle cx="{CX}" cy="{CY}" r="13" fill="none" stroke="{AC}" stroke-width="1.5">'
          '<animate attributeName="r" values="13;33" dur="2.6s" repeatCount="indefinite"/>'
          '<animate attributeName="opacity" values="0.7;0" dur="2.6s" repeatCount="indefinite"/></circle>')
P_.append(f'<circle cx="{CX}" cy="{CY}" r="13" fill="none" stroke="{AC}" stroke-width="1.5">'
          '<animate attributeName="r" values="13;33" dur="2.6s" begin="1.3s" repeatCount="indefinite"/>'
          '<animate attributeName="opacity" values="0.7;0" dur="2.6s" begin="1.3s" repeatCount="indefinite"/></circle>')
P_.append(f'<circle cx="{CX}" cy="{CY}" r="14" fill="{AC}" filter="url(#bglow)">'
          '<animate attributeName="r" values="12.5;15;12.5" dur="2.4s" repeatCount="indefinite"/></circle>')
# Mira spark (4-point star), white
sp = 8
star = (f'M{CX} {CY-sp} L{CX+sp*0.3:.1f} {CY-sp*0.3:.1f} L{CX+sp} {CY} L{CX+sp*0.3:.1f} {CY+sp*0.3:.1f} '
        f'L{CX} {CY+sp} L{CX-sp*0.3:.1f} {CY+sp*0.3:.1f} L{CX-sp} {CY} L{CX-sp*0.3:.1f} {CY-sp*0.3:.1f} Z')
P_.append(f'<path d="{star}" fill="#fff"><animate attributeName="opacity" values="0.85;1;0.85" dur="2.4s" repeatCount="indefinite"/></path>')
P_.append('</svg>')
SVG = ''.join(P_)

PANEL = ('<div style="padding:2px 18px 0;flex-shrink:0;">'
         '<div style="font-size:11.5px;font-weight:500;color:var(--text-subtle);display:flex;align-items:center;gap:7px;">'
         '<span style="width:6px;height:6px;border-radius:50%;background:' + AC + ';animation:glow 2s ease-out infinite;"></span>'
         'Mira brain · 6 agents live</div></div>\n'
         '          <div style="padding:8px 12px 6px;flex-shrink:0;">' + SVG + '</div>\n          ')

# ---- splice out old label+cards strip, insert brain panel ----
label_anchor = '<div style="padding:2px 18px 0;flex-shrink:0;">\n            <div style="font-size:11.5px;font-weight:500;color:var(--text-subtle);display:flex;align-items:center;gap:7px;"><span style="width:6px;height:6px;border-radius:50%;background:var(--accent);animation:glow 2s ease-out infinite;"></span>Agents working for you</div>'
chips_anchor = '<div class="scroll" style="display:flex;gap:8px;padding:10px 18px 4px;overflow-x:auto;flex-shrink:0;">\n            <sc-for list="{{ oppChips }}"'
a = s.index(label_anchor)
b = s.index(chips_anchor, a)
assert s.count(label_anchor) == 1 and s.count(chips_anchor) == 1
s = s[:a] + PANEL + s[b:]

# ---- remove dead vm agents block + return token ----
vm = "\n    const agentAv=['#3f3f46','#52525b','#6b6b70','#71717a'];\n    const agents=[ {name:'Scout', role:'Sourcing new leads', stat:'12 found today', init:'SC'},\n      {name:'Sage', role:'Scoring buyer intent', stat:'7 qualified', init:'SG'},\n      {name:'Closer', role:'Advancing warm deals', stat:'3 moved up', init:'CL'},\n      {name:'Echo', role:'Following up on time', stat:'5 nudged', init:'EC'} ].map((a,i)=>Object.assign({},a,{av:agentAv[i%agentAv.length]}));"
assert s.count(vm) == 1
s = s.replace(vm, '')
s = s.replace('oppSummary, oppChips, agents, feed,', 'oppSummary, oppChips, feed,', 1)

assert s != orig
open(P, 'w').write(s)
print(f'brain patched -- {len(orig)} -> {len(s)} chars')
