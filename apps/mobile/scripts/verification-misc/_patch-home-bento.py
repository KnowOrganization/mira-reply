#!/usr/bin/env python3
# Redesign the Home screen into a SwiftUI-style bento card layout.
# Atomic: writes only after all asserts pass.
import os
P = os.path.join(os.path.dirname(__file__), '..', 'design', 'Mira.dc.html')
s = open(P).read()
orig = s

# ---------- 1. renderVals view-models (insert before routeTitles) ----------
TILES = """    // ── home bento tiles ──
    const tIcon=(p)=>this.ic(p,18);
    const homeTilesTop=[
      {label:'Pipeline', sub:'open value', metric:oppSummary.pipeline, metricCol:A, iconbg:'var(--accent-soft)', iconfg:'var(--accent-deep)', icon:tIcon('<path d=\\"M4 19V5M4 19h16\\"/><path d=\\"M8 16v-4M13 16V8M18 16v-6\\"/>'), go:this.setTab('opps')},
      {label:'Automations', sub:'active flows', metric:String(flowsActive), metricCol:A, iconbg:'var(--accent-soft)', iconfg:'var(--accent-deep)', icon:tIcon('<circle cx=\\"6\\" cy=\\"6\\" r=\\"2.3\\"/><circle cx=\\"18\\" cy=\\"18\\" r=\\"2.3\\"/><circle cx=\\"18\\" cy=\\"6\\" r=\\"2.3\\"/><path d=\\"M8.3 6H15M18 8.3v7.4M16.1 16.1 9 8.4\\"/>'), go:this.setTab('auto')},
      {label:'Guard', sub:'flagged', metric:String(s.flagged.length), metricCol:s.flagged.length?'var(--st-blocked)':'var(--text)', iconbg:'color-mix(in srgb,var(--st-blocked) 13%,transparent)', iconfg:'var(--st-blocked)', icon:tIcon('<path d=\\"M12 2 4 5v6c0 5 3.4 8.5 8 10 4.6-1.5 8-5 8-10V5l-8-3Z\\"/>'), go:()=>this.push('guard')},
      {label:'Orders', sub:'new orders', metric:orderSummary.open, metricCol:'var(--st-warm)', iconbg:'color-mix(in srgb,var(--st-warm) 15%,transparent)', iconfg:'var(--st-warm)', icon:tIcon('<path d=\\"M6 8h12l-1 11.5a1 1 0 0 1-1 .9H8a1 1 0 0 1-1-.9Z\\"/><path d=\\"M9 8a3 3 0 0 1 6 0\\"/>'), go:()=>this.push('orders')},
    ];
    const homeTilesBottom=[
      {label:'Catalog', sub:sf.inStock+' in stock', metric:String(sf.productCount), metricCol:A, iconbg:'var(--accent-soft)', iconfg:'var(--accent-deep)', icon:tIcon('<rect x=\\"3\\" y=\\"3\\" width=\\"7.5\\" height=\\"7.5\\" rx=\\"1.6\\"/><rect x=\\"13.5\\" y=\\"3\\" width=\\"7.5\\" height=\\"7.5\\" rx=\\"1.6\\"/><rect x=\\"3\\" y=\\"13.5\\" width=\\"7.5\\" height=\\"7.5\\" rx=\\"1.6\\"/><rect x=\\"13.5\\" y=\\"13.5\\" width=\\"7.5\\" height=\\"7.5\\" rx=\\"1.6\\"/>'), go:()=>this.push('catalog')},
      {label:'Analytics', sub:'this week', metric:'+12%', metricCol:'var(--st-done)', iconbg:'color-mix(in srgb,var(--st-done) 14%,transparent)', iconfg:'var(--st-done)', icon:tIcon('<path d=\\"M4 19V5M4 19h16\\"/><path d=\\"M7 15l4-5 3 3 4-6\\"/>'), go:()=>this.push('analytics')},
    ];
    const inboxPeek=s.drafts.slice(0,3).map(d=>({ initials:d.initials, av:d.av }));
"""
anchor = "    const routeTitles={ contacts:'Contacts',"
assert s.count(anchor) == 1, "routeTitles anchor not unique"
s = s.replace(anchor, TILES + anchor, 1)

# return keys
ret = "      modes, modeDesc, dash, todayRows, jumps, tabs,"
assert s.count(ret) == 1, "return anchor not unique"
s = s.replace(ret, ret + "\n      homeTilesTop, homeTilesBottom, inboxPeek, inboxCount:s.drafts.length, goInbox:this.setTab('inbox'),", 1)

# ---------- 2. Home markup: replace coverage-hero..safety-desc with bento ----------
START = '<div style="border-radius:18px;background:var(--bg-elev);padding:20px 20px 18px;position:relative;overflow:hidden;animation:slideup .4s ease both;box-shadow:0 1px 3px rgba(20,21,26,.05);">'
END = 'Every reply is uniqueness-checked &amp; paced — no bursts. Sends are jittered to stay human.</div>'
assert s.count(START) == 1 and s.count(END) == 1, "home markup anchors not unique"
i = s.index(START); j = s.index(END) + len(END)

TILE = lambda arr: f"""        <div style="display:flex;flex-wrap:wrap;gap:11px;margin-top:11px;">
          <sc-for list="{{{{ {arr} }}}}" as="t" hint-placeholder-count="2">
            <button onClick="{{{{ t.go }}}}" style="flex:1 1 calc(50% - 6px);min-width:0;text-align:left;border:none;border-radius:18px;cursor:pointer;font-family:inherit;background:var(--bg-elev);box-shadow:var(--shadow-card);padding:15px;display:flex;flex-direction:column;min-height:120px;transition:transform .12s;" style-active="transform:scale(.97)">
              <div style="width:38px;height:38px;border-radius:11px;background:{{{{ t.iconbg }}}};color:{{{{ t.iconfg }}}};display:flex;align-items:center;justify-content:center;">{{{{ t.icon }}}}</div>
              <div style="margin-top:auto;padding-top:14px;">
                <div style="font-size:23px;font-weight:800;letter-spacing:-.03em;color:{{{{ t.metricCol }}}};line-height:1;">{{{{ t.metric }}}}</div>
                <div style="font-size:13.5px;font-weight:700;margin-top:6px;">{{{{ t.label }}}}</div>
                <div style="font-size:12px;color:var(--text-subtle);margin-top:1px;">{{{{ t.sub }}}}</div>
              </div>
            </button>
          </sc-for>
        </div>"""

BENTO = """<div style="border-radius:20px;background:var(--bg-elev);padding:20px 20px 18px;position:relative;overflow:hidden;animation:slideup .4s ease both;box-shadow:var(--shadow-card);">
              <div style="position:absolute;inset:0;background:radial-gradient(80% 95% at 96% 0%,color-mix(in srgb,var(--accent) 12%,transparent),transparent 62%);pointer-events:none;"></div>
              <div style="position:relative;">
                <div style="font-size:12.5px;color:var(--text-subtle);font-weight:500;">Here's how Mira is handling things</div>
                <div style="display:flex;align-items:flex-end;gap:11px;margin-top:6px;">
                  <div style="font-size:60px;font-weight:800;letter-spacing:-.05em;line-height:.82;color:var(--accent);">{{ dash.coverage }}%</div>
                  <div style="padding-bottom:9px;font-size:13px;line-height:1.25;color:var(--text-muted);">of comments<br>covered</div>
                </div>
                <div style="display:flex;gap:22px;margin-top:16px;font-size:12.5px;color:var(--text-muted);">
                  <div><b style="color:var(--text);">{{ dash.replies }}</b> replies</div>
                  <div><b style="color:var(--text);">{{ dash.comments }}</b> comments</div>
                  <div><b style="color:var(--text);">{{ dash.facts }}</b> facts</div>
                </div>
              </div>
            </div>

            <button onClick="{{ goInbox }}" style="width:100%;margin-top:12px;text-align:left;border:none;border-radius:20px;cursor:pointer;font-family:inherit;background:linear-gradient(135deg,color-mix(in srgb,var(--accent) 13%,var(--bg-elev)),var(--bg-elev) 72%);box-shadow:var(--shadow-card);padding:16px;display:flex;align-items:center;gap:14px;transition:transform .12s;" style-active="transform:scale(.985)">
              <div style="width:46px;height:46px;border-radius:13px;background:var(--accent);display:flex;align-items:center;justify-content:center;flex-shrink:0;"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4.5h14a2.2 2.2 0 0 1 2.2 2.2v7.4A2.2 2.2 0 0 1 19 16.3h-7.2L7.4 20v-3.7H5A2.2 2.2 0 0 1 2.8 14V6.7A2.2 2.2 0 0 1 5 4.5Z"/></svg></div>
              <div style="flex:1;min-width:0;">
                <div style="display:flex;align-items:center;gap:8px;"><span style="font-size:17px;font-weight:700;">Inbox</span><span style="font-size:11px;font-weight:700;color:#fff;background:var(--accent);border-radius:999px;padding:2px 8px;">{{ inboxCount }} new</span></div>
                <div style="font-size:12.5px;color:var(--text-muted);margin-top:2px;">drafts waiting for your approval</div>
              </div>
              <div style="display:flex;align-items:center;flex-shrink:0;">
                <sc-for list="{{ inboxPeek }}" as="p" hint-placeholder-count="3"><div style="width:30px;height:30px;border-radius:50%;background:{{ p.av }};color:#fff;font-weight:700;font-size:10.5px;display:flex;align-items:center;justify-content:center;margin-left:-8px;border:2px solid var(--bg-elev);">{{ p.initials }}</div></sc-for>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-subtle)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="margin-left:9px;opacity:.5;"><path d="m9 6 6 6-6 6"/></svg>
              </div>
            </button>

""" + TILE("homeTilesTop") + """

            <button onClick="{{ openStorefront }}" style="width:100%;margin-top:11px;text-align:left;border:none;border-radius:18px;overflow:hidden;cursor:pointer;font-family:inherit;background:var(--bg-elev);box-shadow:var(--shadow-card);display:block;padding:0;transition:transform .12s;" style-active="transform:scale(.99)">
              <div style="height:104px;background:linear-gradient(135deg,{{ sf.accent }},color-mix(in srgb,{{ sf.accent }} 52%,#000));position:relative;">
                <div style="position:absolute;top:13px;left:14px;display:flex;align-items:center;gap:6px;"><div style="width:7px;height:7px;border-radius:50%;background:#fff;"></div><span style="font-size:10px;font-weight:700;letter-spacing:.1em;color:#fff;text-transform:uppercase;">Live</span></div>
                <div style="position:absolute;bottom:12px;left:14px;font-size:12.5px;font-weight:600;color:#fff;background:rgba(0,0,0,.22);padding:5px 11px;border-radius:8px;">mira.shop/{{ sf.handle }}</div>
                <div style="position:absolute;top:14px;right:14px;display:flex;gap:7px;">
                  <sc-for list="{{ sf.heroThumbs }}" as="h" hint-placeholder-count="3"><div style="width:36px;height:46px;border-radius:8px;background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.3);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:14px;">{{ h }}</div></sc-for>
                </div>
              </div>
              <div style="padding:13px 15px;display:flex;align-items:center;gap:10px;">
                <div style="flex:1;"><div style="font-size:16.5px;font-weight:700;letter-spacing:-.01em;">Storefront</div><div style="font-size:12.5px;color:var(--text-subtle);margin-top:1px;">Your shop, auto-built from the catalog</div></div>
                <span style="font-size:13.5px;font-weight:600;color:var(--accent);display:flex;align-items:center;gap:1px;">Open<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg></span>
              </div>
            </button>

""" + TILE("homeTilesBottom") + """

            <div style="font-size:11.5px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--text-subtle);margin:24px 6px 8px;">Reply mode</div>
            <div style="display:flex;gap:4px;background:var(--bg-inset);border-radius:11px;padding:3px;">
              <sc-for list="{{ modes }}" as="m" hint-placeholder-count="3">
                <button onClick="{{ m.set }}" style="flex:1;height:34px;border:none;border-radius:8px;font-family:inherit;font-size:13.5px;font-weight:600;cursor:pointer;transition:all .18s;background:{{ m.bg }};color:{{ m.fg }};box-shadow:{{ m.sh }};">{{ m.label }}</button>
              </sc-for>
            </div>
            <div style="font-size:12.5px;color:var(--text-subtle);margin:9px 6px 0;line-height:1.4;">{{ modeDesc }}</div>

            <div style="font-size:11.5px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--text-subtle);margin:22px 6px 8px;">Account safety</div>
            <div style="background:var(--bg-elev);border-radius:14px;padding:16px;box-shadow:var(--shadow-card);">
              <div style="display:flex;align-items:baseline;gap:7px;"><span style="font-size:22px;font-weight:700;color:var(--st-done);letter-spacing:-.02em;">{{ dash.sent }}</span><span style="font-size:13px;color:var(--text-subtle);">of {{ dash.cap }} daily send cap</span></div>
              <div style="height:6px;border-radius:4px;background:var(--bg-inset);margin-top:11px;overflow:hidden;"><div style="height:100%;width:{{ dash.capPct }};background:var(--st-done);border-radius:4px;transition:width .6s;"></div></div>
            </div>
            <div style="font-size:12.5px;color:var(--text-subtle);margin:8px 6px 0;line-height:1.45;">Every reply is uniqueness-checked &amp; paced — no bursts. Sends are jittered to stay human.</div>"""

s = s[:i] + BENTO + s[j:]

assert s != orig
open(P, 'w').write(s)
print(f"home bento patched — {len(orig)} -> {len(s)} chars")
