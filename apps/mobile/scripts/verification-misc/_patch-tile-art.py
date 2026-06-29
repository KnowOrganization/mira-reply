#!/usr/bin/env python3
# Give each Home bento tile a signature mini-visual (VIZART) via <img src>.
import os
D = os.path.dirname(__file__)
P = os.path.join(D, '..', 'design', 'Mira.dc.html')
s = open(P).read()
orig = s
vizart = open(os.path.join(D, '_tileart.js.snippet')).read().strip()


def rep(old, new, n=1):
    global s
    c = s.count(old)
    assert c == n, f'expected {n} of {old[:60]!r}, got {c}'
    s = s.replace(old, new, n)


# 1. inject VIZART const before the Component class
rep('\nclass Component extends DCLogic {', '\n' + vizart + '\nclass Component extends DCLogic {')

# 2. attach viz to each of the 6 tile objects (go: handlers are unique)
for key, go in [
    ('pipeline',    "go:this.setTab('opps')}"),
    ('automations', "go:this.setTab('auto')}"),
    ('guard',       "go:()=>this.push('guard')}"),
    ('orders',      "go:()=>this.push('orders')}"),
    ('catalog',     "go:()=>this.push('catalog')}"),
    ('analytics',   "go:()=>this.push('analytics')}"),
]:
    rep(go, f'viz:VIZART.{key}, ' + go)

# 3. tile template (2 occurrences: top + bottom rows)
#   a) drop the signature viz strip in right under the icon square
rep('color:{{ t.iconfg }};display:flex;align-items:center;justify-content:center;">{{ t.icon }}</div>',
    'color:{{ t.iconfg }};display:flex;align-items:center;justify-content:center;">{{ t.icon }}</div>'
    '<img src="{{ t.viz }}" style="width:100%;height:34px;object-fit:contain;object-position:left;display:block;margin-top:13px;" />',
    n=2)
#   b) give the tile a touch more height so the viz breathes
rep('min-height:120px;transition', 'min-height:142px;transition', n=2)

assert s != orig
open(P, 'w').write(s)
print(f'tile art wired -- {len(orig)} -> {len(s)} chars')
