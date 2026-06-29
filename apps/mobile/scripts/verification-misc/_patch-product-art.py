#!/usr/bin/env python3
# Wire generated PRODART skincare mockups into every product thumbnail.
import os
D = os.path.dirname(__file__)
P = os.path.join(D, '..', 'design', 'Mira.dc.html')
s = open(P).read()
orig = s
prodart = open(os.path.join(D, '_prodart.js.snippet')).read().strip()

def rep(old, new, n=1):
    global s
    c = s.count(old)
    assert c == n, f"expected {n} of: {old[:70]!r}  got {c}"
    s = s.replace(old, new, n)

# 1. inject PRODART const just before the Component class
rep('\nclass Component extends DCLogic {', '\n' + prodart + '\nclass Component extends DCLogic {')

# 2. add img to the 4 product view-model builders
rep(".mono, available:p.available, ph:'linear-gradient(155deg,'+acc+'26,'+acc+'0a)', monoCol:acc, open:",
    ".mono, available:p.available, img:PRODART[p.mono], ph:'linear-gradient(155deg,'+acc+'26,'+acc+'0a)', monoCol:acc, open:")
rep("mono:sfp.mono, ph:'linear-gradient(155deg,'+acc+'2e,'+acc+'0d)', accent:acc,",
    "mono:sfp.mono, img:PRODART[sfp.mono], ph:'linear-gradient(155deg,'+acc+'2e,'+acc+'0d)', accent:acc,")
rep(".id!==s.products[0].id,\n      ph:'linear-gradient(150deg,var(--accent-soft)",
    ".id!==s.products[0].id, img:PRODART[p.mono],\n      ph:'linear-gradient(150deg,var(--accent-soft)")
rep("title:p.title, price:p.price, ph:'linear-gradient(150deg,'+acc+'22,'+acc+'0a)', monoCol:acc }));",
    "title:p.title, price:p.price, img:PRODART[p.mono], ph:'linear-gradient(150deg,'+acc+'22,'+acc+'0a)', monoCol:acc }));")

# 3. swap thumbnails to <img src> — NOT css background. dc-runtime runs every style
#    string through cssToObj() which splits on ';', shattering the data:...;base64 URI.
#    An <img src> attribute bypasses that entirely.
# A) Home shelf tile
rep('<div style="height:94px;border-radius:13px;background:{{ p.ph }};border:1px solid var(--border);box-shadow:inset 0 1px 0 rgba(255,255,255,.5);display:flex;align-items:center;justify-content:center;color:{{ p.monoCol }};font-weight:800;font-size:20px;letter-spacing:-.02em;">{{ p.mono }}</div>',
    '<img src="{{ p.img }}" style="width:100%;height:94px;object-fit:cover;border-radius:13px;border:1px solid var(--border);display:block;" />')

# B) Manage-store list row (48x58 button thumb)
rep('background:{{ p.ph }};display:flex;align-items:center;justify-content:center;flex-shrink:0;padding:0;"><span style="font-size:19px;font-weight:800;color:{{ p.monoCol }};letter-spacing:-.03em;">{{ p.mono }}</span>',
    'flex-shrink:0;padding:0;overflow:hidden;"><img src="{{ p.img }}" style="width:48px;height:58px;object-fit:cover;display:block;" />')

# C) Product grid tiles (3 identical: storefront + catalog)
rep('<div style="aspect-ratio:4/5;border-radius:13px;overflow:hidden;background:{{ p.ph }};display:flex;align-items:center;justify-content:center;"><span style="font-size:42px;font-weight:800;color:{{ p.monoCol }};opacity:.65;letter-spacing:-.04em;">{{ p.mono }}</span>',
    '<div style="aspect-ratio:4/5;border-radius:13px;overflow:hidden;"><img src="{{ p.img }}" style="width:100%;height:100%;object-fit:cover;display:block;" />',
    n=3)

# D) Product detail hero
rep('<div style="aspect-ratio:1;background:{{ sfDetail.ph }};display:flex;align-items:center;justify-content:center;"><span style="font-size:120px;font-weight:800;color:{{ sfDetail.accent }};opacity:.55;letter-spacing:-.05em;">{{ sfDetail.mono }}</span>',
    '<div style="aspect-ratio:1;overflow:hidden;"><img src="{{ sfDetail.img }}" style="width:100%;height:100%;object-fit:cover;display:block;" />')

assert s != orig
open(P, 'w').write(s)
print(f"product art wired -- {len(orig)} -> {len(s)} chars")
