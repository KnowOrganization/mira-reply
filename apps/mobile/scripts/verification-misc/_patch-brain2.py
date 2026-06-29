#!/usr/bin/env python3
# Brain v2: (1) move stage filter chips ABOVE the brain panel.
# (2) less static -> speed up sunburst spin + add an orbiting signal ring circling the core.
import os, shutil
D = os.path.dirname(__file__)
P = os.path.join(D, '..', 'design', 'Mira.dc.html')
shutil.copy(P, os.path.join(D, 'verification-misc', 'Mira.dc.html.pre-brain2'))
s = open(P).read()
orig = s

# 1. speed up the rotating sunburst (84s reads as static)
assert s.count('dur="84s"') == 1
s = s.replace('dur="84s"', 'dur="30s"', 1)

# 2. orbiting signal ring (dotted path + 3 dots circling) — inserted after the ambient halo
HALO = '<circle cx="180" cy="130" r="74" fill="url(#bhalo)"><animate attributeName="opacity" values="0.22;0.4;0.22" dur="5s" repeatCount="indefinite"/></circle>'
assert s.count(HALO) == 1
ORBIT = (HALO +
         '<circle cx="180" cy="130" r="62" fill="none" stroke="var(--accent)" stroke-width="0.8" stroke-dasharray="1 7" opacity="0.3"/>'
         '<g><animateTransform attributeName="transform" type="rotate" from="0 180 130" to="360 180 130" dur="13s" repeatCount="indefinite"/>'
         '<circle cx="180" cy="68" r="2.8" fill="var(--accent)" opacity="0.85"/>'
         '<circle cx="242" cy="130" r="2.4" fill="var(--accent)" opacity="0.55"/>'
         '<circle cx="180" cy="192" r="2.2" fill="var(--accent)" opacity="0.4"/>'
         '<circle cx="118" cy="130" r="2.4" fill="var(--accent)" opacity="0.5"/></g>')
s = s.replace(HALO, ORBIT, 1)

# 3. reorder: chips block BEFORE the brain panel
brain_anchor = '<div style="padding:2px 18px 0;flex-shrink:0;"><div style="font-size:11.5px;font-weight:500;color:var(--text-subtle);display:flex;align-items:center;gap:7px;"><span style="width:6px;height:6px;border-radius:50%;background:var(--accent);animation:glow 2s ease-out infinite;"></span>Mira brain'
chips_anchor = '<div class="scroll" style="display:flex;gap:8px;padding:10px 18px 4px;overflow-x:auto;flex-shrink:0;">'
feed_anchor = '<div class="scroll" style="flex:1;overflow-y:auto;padding:8px 18px 11'
a = s.index(brain_anchor)
c = s.index(chips_anchor, a)
b = s.index(feed_anchor, c)
panel = s[a:c]          # brain panel (+ trailing whitespace)
chips = s[c:b]          # chips block (+ trailing whitespace)
assert '{{ oppChips }}' in chips and 'Mira brain' in panel
s = s[:a] + chips + panel + s[b:]

assert s != orig
open(P, 'w').write(s)
print(f'brain2 patched -- {len(orig)} -> {len(s)} chars')
