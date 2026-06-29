#!/usr/bin/env python3
# Bottom nav -> Option C: floating glass capsule bar with a sliding labeled ink pill.
# Active tab grows into an ink capsule + label (CSS cross-grow); inactives are icon-only.
import os, shutil
D = os.path.dirname(__file__)
P = os.path.join(D, '..', 'design', 'Mira.dc.html')
shutil.copy(P, os.path.join(D, 'verification-misc', 'Mira.dc.html.pre-navc'))
s = open(P).read()
orig = s


def rep(old, new, n=1):
    global s
    c = s.count(old)
    assert c == n, f'expected {n}x {old[:50]!r}, got {c}'
    s = s.replace(old, new, n)


# 1. tabs view-model: uniform tabs w/ label + active capsule styling (drop center-special)
OLD_MAP = ("const tabs=navDefs.map(d=>{ if(d.center){ return { isCenter:true, normal:false, "
           "go:d.go, icon:this.icFill(d.p,23), centerBg:'var(--text)', centerFg:'var(--bg)', "
           "badge:s.drafts.length>0 }; }\n      const active = d.k==='profile'? s.sheetMounted : "
           "s.tab===d.k;\n      return { isCenter:false, normal:true, go:d.go, icon:this.icN(d.p,26), "
           "col: active?'var(--text)':'var(--text-subtle)' }; });")
NEW_MAP = ("const tabLabels={home:'Home',opps:'Pipeline',inbox:'Inbox',auto:'Flows',profile:'You'};\n"
           "    const tabs=navDefs.map(d=>{\n"
           "      const active = d.k==='profile'? s.sheetMounted : s.tab===d.k;\n"
           "      return { go:d.go, label:tabLabels[d.k], icon:this.icN(d.p,23),\n"
           "        btnFlex: active?'0 1 auto':'1 1 0',\n"
           "        btnBg: active?'var(--text)':'transparent',\n"
           "        btnFg: active?'var(--bg)':'var(--text-subtle)',\n"
           "        btnPad: active?'0 15px':'0',\n"
           "        lblMax: active?'90px':'0', lblOp: active?'1':'0',\n"
           "        badge: d.k==='inbox' && s.drafts.length>0 }; });")
rep(OLD_MAP, NEW_MAP)

# 2. tab-bar markup: floating glass pill + sliding capsule buttons
OLD_BAR = ('<!-- ===== TAB BAR ===== -->\n        <div style="position:absolute;left:0;right:0;bottom:0;height:86px;z-index:30;background:var(--glass-smoke-bg);backdrop-filter:blur(var(--glass-blur)) saturate(140%);-webkit-backdrop-filter:blur(var(--glass-blur)) saturate(140%);border-top:.5px solid var(--glass-border);display:flex;align-items:flex-start;padding:14px 22px 0;">\n          <sc-for list="{{ tabs }}" as="t" hint-placeholder-count="5">\n            <sc-if value="{{ t.isCenter }}" hint-placeholder-val="{{ false }}">\n              <button onClick="{{ t.go }}" style="flex:1;display:flex;justify-content:center;border:none;background:none;cursor:pointer;font-family:inherit;padding:0;">\n                <div style="position:relative;width:52px;height:38px;border-radius:13px;background:{{ t.centerBg }};display:flex;align-items:center;justify-content:center;color:{{ t.centerFg }};box-shadow:0 5px 16px -5px rgba(0,0,0,.35);transition:transform .14s;" style-active="transform:scale(.9)">{{ t.icon }}<sc-if value="{{ t.badge }}" hint-placeholder-val="{{ false }}"><div style="position:absolute;top:-3px;right:-3px;width:11px;height:11px;border-radius:50%;background:var(--st-blocked);border:2px solid var(--bg);"></div></sc-if></div>\n              </button>\n            </sc-if>\n            <sc-if value="{{ t.normal }}" hint-placeholder-val="{{ true }}">\n              <button onClick="{{ t.go }}" style="flex:1;display:flex;justify-content:center;align-items:center;height:38px;border:none;background:none;cursor:pointer;color:{{ t.col }};font-family:inherit;transition:transform .14s,color .18s;" style-active="transform:scale(.86)">{{ t.icon }}</button>\n            </sc-if>\n          </sc-for>\n        </div>')
NEW_BAR = ('<!-- ===== TAB BAR (Option C: floating sliding-capsule) ===== -->\n'
           '        <div style="position:absolute;left:16px;right:16px;bottom:30px;height:60px;z-index:30;'
           'background:var(--glass-smoke-bg);backdrop-filter:blur(var(--glass-blur)) saturate(140%);'
           '-webkit-backdrop-filter:blur(var(--glass-blur)) saturate(140%);border:.5px solid var(--glass-border);'
           'border-radius:23px;box-shadow:var(--glass-shadow),var(--glass-highlight);'
           'display:flex;align-items:center;gap:3px;padding:0 7px;box-sizing:border-box;">\n'
           '          <sc-for list="{{ tabs }}" as="t" hint-placeholder-count="5">\n'
           '            <button onClick="{{ t.go }}" style="flex:{{ t.btnFlex }};display:flex;align-items:center;'
           'justify-content:center;gap:7px;height:46px;min-width:46px;padding:{{ t.btnPad }};box-sizing:border-box;'
           'border:none;background:{{ t.btnBg }};color:{{ t.btnFg }};border-radius:15px;cursor:pointer;'
           'font-family:inherit;overflow:hidden;transition:flex-grow .32s cubic-bezier(.4,0,.2,1),'
           'background-color .3s cubic-bezier(.4,0,.2,1),color .25s ease,padding .3s cubic-bezier(.4,0,.2,1);" '
           'style-active="transform:scale(.95)">\n'
           '              <span style="display:flex;flex-shrink:0;position:relative;">{{ t.icon }}'
           '<sc-if value="{{ t.badge }}" hint-placeholder-val="{{ false }}">'
           '<span style="position:absolute;top:-2px;right:-3px;width:8px;height:8px;border-radius:50%;'
           'background:var(--st-blocked);border:1.5px solid var(--glass-smoke-bg);"></span></sc-if></span>\n'
           '              <span style="max-width:{{ t.lblMax }};opacity:{{ t.lblOp }};overflow:hidden;'
           'white-space:nowrap;font-size:13.5px;font-weight:500;letter-spacing:-.01em;'
           'transition:max-width .32s cubic-bezier(.4,0,.2,1),opacity .22s ease;">{{ t.label }}</span>\n'
           '            </button>\n'
           '          </sc-for>\n        </div>')
rep(OLD_BAR, NEW_BAR)

assert s != orig
open(P, 'w').write(s)
print(f'nav-C patched -- {len(orig)} -> {len(s)} chars')
