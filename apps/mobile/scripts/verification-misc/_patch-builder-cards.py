#!/usr/bin/env python3
# Flow-builder trigger + step cards -> match Home bento aesthetic.
# Drop colored left rails, "DO" category tags, and the heavy bordered button row.
# Borderless white card (shadow only, radius 18), soft tinted icon tile, quiet ghost controls.
import os, shutil
D = os.path.dirname(__file__)
P = os.path.join(D, '..', 'design', 'Mira.dc.html')
shutil.copy(P, os.path.join(D, 'verification-misc', 'Mira.dc.html.pre-buildercards'))
s = open(P).read()
orig = s


def rep(old, new, n=1):
    global s
    c = s.count(old)
    assert c == n, f'expected {n}x {old[:55]!r}, got {c}'
    s = s.replace(old, new, n)


# 1. trigger card shell: drop warm border + left rail -> clean home-style card
rep('<div onClick="{{ builder.trigger.open }}" style="border:1px solid color-mix(in srgb,var(--st-warm) 40%,var(--border));background:var(--bg-elev);box-shadow:var(--shadow-card);border-radius:16px;padding:14px;display:flex;gap:12px;align-items:center;cursor:pointer;border-left:4px solid var(--st-warm);">',
    '<div onClick="{{ builder.trigger.open }}" style="border:none;background:var(--bg-elev);box-shadow:var(--shadow-card);border-radius:18px;padding:15px;display:flex;gap:12px;align-items:center;cursor:pointer;transition:transform .12s;" style-active="transform:scale(.99)">')

# 2. whole step card -> home-style; no rail, no DO tag, quiet ghost reorder/delete row
a = s.find('<div style="border:1px solid var(--border);background:var(--bg-elev);box-shadow:var(--shadow-card);border-radius:16px;padding:13px;border-left:4px solid {{ st.col }};">')
b = s.find('</div>\n              </div>\n            </sc-for>', a) + len('</div>\n              </div>')
assert a != -1 and b != -1 and s.count('border-left:4px solid {{ st.col }}') == 1
NEW_STEP = (
    '<div style="border:none;background:var(--bg-elev);box-shadow:var(--shadow-card);border-radius:18px;'
    'padding:15px;transition:transform .12s;" style-active="transform:scale(.99)">\n'
    '                <div onClick="{{ st.open }}" style="display:flex;gap:12px;align-items:center;cursor:pointer;">\n'
    '                  <div style="width:38px;height:38px;border-radius:11px;background:{{ st.iconbg }};'
    'color:{{ st.iconfg }};display:flex;align-items:center;justify-content:center;flex-shrink:0;">{{ st.icon }}</div>\n'
    '                  <div style="flex:1;min-width:0;">\n'
    '                    <div style="font-size:14.5px;font-weight:500;">{{ st.label }}</div>\n'
    '                    <div style="font-size:12px;color:var(--text-subtle);margin-top:2px;line-height:1.35;'
    'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">{{ st.summary }}</div>\n'
    '                  </div>\n'
    '                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-subtle)" '
    'stroke-width="2" stroke-linecap="round" style="flex-shrink:0;"><path d="m9 6 6 6-6 6"/></svg>\n'
    '                </div>\n'
    '                <div style="display:flex;align-items:center;gap:1px;margin-top:11px;padding-top:10px;'
    'border-top:1px solid var(--border-subtle);">\n'
    '                  <button onClick="{{ st.up }}" style="width:34px;height:30px;border:none;background:none;'
    'border-radius:8px;color:{{ st.upcol }};cursor:pointer;display:flex;align-items:center;justify-content:center;'
    'padding:0;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" '
    'stroke-linecap="round" stroke-linejoin="round"><path d="m6 15 6-6 6 6"/></svg></button>\n'
    '                  <button onClick="{{ st.down }}" style="width:34px;height:30px;border:none;background:none;'
    'border-radius:8px;color:{{ st.downcol }};cursor:pointer;display:flex;align-items:center;justify-content:center;'
    'padding:0;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" '
    'stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg></button>\n'
    '                  <button onClick="{{ st.del }}" style="margin-left:auto;width:34px;height:30px;border:none;'
    'background:none;border-radius:8px;color:var(--text-subtle);cursor:pointer;display:flex;align-items:center;'
    'justify-content:center;padding:0;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
    'stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13"/></svg></button>\n'
    '                </div>\n              </div>')
s = s[:a] + NEW_STEP + s[b:]

assert s != orig
open(P, 'w').write(s)
print(f'builder cards patched -- {len(orig)} -> {len(s)} chars')
