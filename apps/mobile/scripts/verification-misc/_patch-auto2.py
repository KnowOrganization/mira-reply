#!/usr/bin/env python3
# Automations: "Create automation" -> directly opens Templates page (no inline chooser).
# Bigger, squarish button. Templates page gets a "Create blank" card at top.
# Result: template = 2 clicks, blank = 2 clicks.
import os, shutil
D = os.path.dirname(__file__)
P = os.path.join(D, '..', 'design', 'Mira.dc.html')
shutil.copy(P, os.path.join(D, 'verification-misc', 'Mira.dc.html.pre-auto2'))
s = open(P).read()
orig = s


def rep(old, new, n=1):
    global s
    c = s.count(old)
    assert c == n, f'expected {n}x {old[:55]!r}, got {c}'
    s = s.replace(old, new, n)


# 1. Replace the dotted button + inline chooser sc-if with one big squarish button
#    that pushes the templates page directly.
a = s.find('<button onClick="{{ toggleAutoMenu }}"')
b = s.find('</sc-if>\n            <sc-for list="{{ flows }}"') + len('</sc-if>')
assert a != -1 and b != -1
block = s[a:b]
assert block.count('toggleAutoMenu') == 1 and block.count('pickScratch') == 1

new_btn = (
    '<button onClick="{{ openTemplates }}" style="width:100%;border:1.5px dashed var(--border-strong);'
    'background:transparent;border-radius:20px;padding:24px 22px;display:flex;flex-direction:column;'
    'align-items:center;gap:14px;cursor:pointer;font-family:inherit;margin-bottom:14px;'
    'transition:transform .15s ease;" style-active="transform:scale(.985)">'
    '<div style="width:60px;height:60px;border-radius:18px;background:var(--text);color:var(--bg-elev);'
    'display:flex;align-items:center;justify-content:center;flex-shrink:0;">'
    '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" '
    'stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></div>'
    '<div style="text-align:center;"><div style="font-size:16px;font-weight:500;color:var(--text);">'
    'Create automation</div><div style="font-size:13px;color:var(--text-subtle);margin-top:3px;">'
    'Start from a template or build your own</div></div></button>'
)
s = s[:a] + new_btn + s[b:]

# 2. Templates page: "Create blank" card at top, before the template list.
rep('<sc-for list="{{ templates }}" as="t" hint-placeholder-count="5">',
    '<button onClick="{{ newFlow }}" style="width:100%;border:1px solid var(--border);'
    'background:var(--bg-elev);box-shadow:var(--shadow-card);border-radius:16px;padding:14px;'
    'display:flex;align-items:center;gap:12px;cursor:pointer;font-family:inherit;text-align:left;'
    'margin-bottom:11px;transition:transform .15s ease;" style-active="transform:scale(.985)">'
    '<div style="width:38px;height:38px;border-radius:11px;background:var(--text);color:var(--bg-elev);'
    'display:flex;align-items:center;justify-content:center;flex-shrink:0;">'
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" '
    'stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></div>'
    '<div style="flex:1;min-width:0;"><div style="font-size:14.5px;font-weight:500;color:var(--text);">'
    'Create blank</div><div style="font-size:12px;color:var(--text-subtle);margin-top:1px;">'
    'Start with an empty canvas</div></div>'
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-subtle)" '
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;">'
    '<path d="m9 18 6-6-6-6"/></svg></button>\n'
    '          <sc-for list="{{ templates }}" as="t" hint-placeholder-count="5">')

assert s != orig
open(P, 'w').write(s)
print(f'auto2 patched -- {len(orig)} -> {len(s)} chars')
