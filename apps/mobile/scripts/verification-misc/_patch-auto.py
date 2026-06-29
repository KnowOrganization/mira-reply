#!/usr/bin/env python3
# Automations page: remove header Templates+plus, add a big dotted "Create automation"
# button at top that reveals two options (template / from scratch).
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


# 1. remove the header right-side controls (Templates button + small + button)
start = '<div style="display:flex;align-items:center;gap:8px;flex-shrink:0;"><button onClick="{{ openTemplates }}"'
i = s.index(start)
j = s.index('</svg></button></div>', i) + len('</svg></button></div>')
assert s.count(start) == 1
s = s[:i] + s[j:]

# 2. big dotted create button + two-option chooser, at the top of the flows scroll
rep('<div class="scroll" style="flex:1;overflow-y:auto;padding:6px 18px 116px;">\n            <sc-for list="{{ flows }}"',
    '<div class="scroll" style="flex:1;overflow-y:auto;padding:6px 18px 116px;">\n'
    '            <button onClick="{{ toggleAutoMenu }}" style="width:100%;border:1.5px dashed var(--border-strong);background:transparent;border-radius:16px;padding:16px;display:flex;align-items:center;gap:13px;cursor:pointer;font-family:inherit;margin-bottom:12px;transition:transform .15s ease;" style-active="transform:scale(.99)">'
    '<div style="width:42px;height:42px;border-radius:12px;background:var(--text);color:var(--bg-elev);display:flex;align-items:center;justify-content:center;flex-shrink:0;"><svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></div>'
    '<div style="text-align:left;flex:1;min-width:0;"><div style="font-size:15px;font-weight:500;color:var(--text);">Create automation</div><div style="font-size:12.5px;color:var(--text-subtle);margin-top:1px;">Start from a template or build your own</div></div>'
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-subtle)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;transform:{{ autoChevron }};transition:transform .2s ease;"><path d="m6 9 6 6 6-6"/></svg>'
    '</button>\n'
    '            <sc-if value="{{ autoMenu }}" hint-placeholder-val="{{ false }}">\n'
    '              <div style="display:flex;gap:10px;margin-bottom:14px;">\n'
    '                <button onClick="{{ pickTemplate }}" style="flex:1;border:1px solid var(--border);background:var(--bg-elev);box-shadow:var(--shadow-card);border-radius:14px;padding:14px;display:flex;flex-direction:column;gap:10px;cursor:pointer;font-family:inherit;text-align:left;transition:transform .15s ease;" style-active="transform:scale(.97)">'
    '<div style="width:38px;height:38px;border-radius:11px;background:var(--bg-inset);color:var(--text);display:flex;align-items:center;justify-content:center;"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7.5" height="7.5" rx="1.6"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.6"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.6"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.6"/></svg></div>'
    '<div><div style="font-size:14px;font-weight:500;color:var(--text);">Start from template</div><div style="font-size:11.5px;color:var(--text-subtle);margin-top:2px;">Proven, ready-made flows</div></div></button>\n'
    '                <button onClick="{{ pickScratch }}" style="flex:1;border:1px solid var(--border);background:var(--bg-elev);box-shadow:var(--shadow-card);border-radius:14px;padding:14px;display:flex;flex-direction:column;gap:10px;cursor:pointer;font-family:inherit;text-align:left;transition:transform .15s ease;" style-active="transform:scale(.97)">'
    '<div style="width:38px;height:38px;border-radius:11px;background:var(--bg-inset);color:var(--text);display:flex;align-items:center;justify-content:center;"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18M3 12h18"/></svg></div>'
    '<div><div style="font-size:14px;font-weight:500;color:var(--text);">Build from scratch</div><div style="font-size:11.5px;color:var(--text-subtle);margin-top:2px;">Blank canvas, your rules</div></div></button>\n'
    '              </div>\n'
    '            </sc-if>\n'
    '            <sc-for list="{{ flows }}"')

# 3. state flag
rep("tab: 'home', route: null, routeOpen: false,",
    "tab: 'home', route: null, routeOpen: false, autoMenu: false,")

# 4. handlers (after openTemplates def)
rep("openTemplates = () => this.push('templates');",
    "openTemplates = () => this.push('templates');\n"
    "  toggleAutoMenu = () => this.setState({autoMenu:!this.state.autoMenu});\n"
    "  pickTemplate = () => { this.setState({autoMenu:false}); this.push('templates'); };\n"
    "  pickScratch = () => { this.setState({autoMenu:false}); this.newFlow(); };")

# 5. expose to template (renderVals return)
rep("flowsActive, flowsCount:s.flows.length, newFlow:this.newFlow,",
    "flowsActive, flowsCount:s.flows.length, newFlow:this.newFlow,"
    " autoMenu:s.autoMenu, toggleAutoMenu:this.toggleAutoMenu, pickTemplate:this.pickTemplate,"
    " pickScratch:this.pickScratch, autoChevron:s.autoMenu?'rotate(180deg)':'rotate(0deg)',")

assert s != orig
open(P, 'w').write(s)
print(f'automations page patched -- {len(orig)} -> {len(s)} chars')
