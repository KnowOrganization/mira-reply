#!/usr/bin/env python3
# Follow-up tweaks: distinct Pipeline identity (funnel), a new opportunity, more top breathing room.
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


# 1. Pipeline tile icon -> funnel/filter (distinct from Automations' node graph)
rep("icon:tIcon('<path d=\\\"M4 19V5M4 19h16\\\"/><path d=\\\"M8 16v-4M13 16V8M18 16v-6\\\"/>')",
    "icon:tIcon('<path d=\\\"M4 6h16M7 12h10M10 18h4\\\"/>')")

# 2. New pipeline opportunity (big retailer wants to stock the catalog)
rep("      { id:6, name:'Vogue Spotlight', handle:'@vogue', initials:'VS', type:'Media', value:'₹90,000', conf:69, stage:1 },\n    ],",
    "      { id:6, name:'Vogue Spotlight', handle:'@vogue', initials:'VS', type:'Media', value:'₹90,000', conf:69, stage:1 },\n"
    "      { id:7, name:'Nykaa', handle:'@nykaabeauty', initials:'NY', type:'Wholesale', value:'₹2,50,000', conf:90, stage:0, av:'#52525b' },\n    ],")

# 3. More top breathing room on every page (was sitting under the Dynamic Island)
rep('padding:58px 18px', 'padding:80px 18px', n=4)                       # tab screens
rep('position:sticky;top:0;z-index:5;display:flex;align-items:center;gap:9px;padding:13px 18px;',
    'position:sticky;top:0;z-index:5;display:flex;align-items:center;gap:9px;padding:38px 18px 14px;')  # route header

# 4. swap the regenerated VIZART literal (pipeline viz is now a funnel)
viz = open(os.path.join(D, 'verification-misc', '_tileart.js.snippet')).read().strip()
i = s.index('const VIZART={')
j = s.index('};', i) + 2
s = s[:i] + viz + s[j:]

assert s != orig
open(P, 'w').write(s)
print(f'tweaks applied -- {len(orig)} -> {len(s)} chars')
