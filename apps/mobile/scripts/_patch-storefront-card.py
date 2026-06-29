#!/usr/bin/env python3
# Make the Home storefront card instantly read as a shop:
# bag icon + "Your storefront" + LIVE + a horizontal product shelf (thumb+name+price).
import os
P = os.path.join(os.path.dirname(__file__), '..', 'design', 'Mira.dc.html')
s = open(P).read()
orig = s

# 1. renderVals: product preview for the shelf (acc + s.products already in scope here)
anchor = "    const routeTitles={ contacts:'Contacts',"
assert s.count(anchor) == 1
s = s.replace(anchor,
  "    const storePreview=s.products.filter(p=>p.available).slice(0,5).map(p=>({ mono:p.mono, title:p.title, price:p.price, ph:'linear-gradient(150deg,'+acc+'22,'+acc+'0a)', monoCol:acc }));\n" + anchor, 1)

# 2. return key
ret = "      homeTilesTop, homeTilesBottom, inboxPeek, inboxCount:s.drafts.length, goInbox:this.setTab('inbox'),"
assert s.count(ret) == 1
s = s.replace(ret, ret + " storePreview,", 1)

# 3. replace the Home storefront button markup
start = '<button onClick="{{ openStorefront }}" style="width:100%;margin-top:11px;text-align:left;border:none;border-radius:18px;overflow:hidden;'
assert s.count(start) == 1, "expected single Home storefront button"
i = s.index(start)
j = s.index('</button>', i) + len('</button>')

NEW = '''<button onClick="{{ openStorefront }}" style="width:100%;margin-top:11px;text-align:left;border:none;border-radius:20px;overflow:hidden;cursor:pointer;font-family:inherit;background:var(--bg-elev);box-shadow:var(--shadow-card);display:block;padding:0;transition:transform .12s;" style-active="transform:scale(.99)">
              <div style="display:flex;align-items:center;gap:11px;padding:15px 16px 12px;">
                <div style="width:40px;height:40px;border-radius:12px;background:linear-gradient(150deg,{{ sf.accent }},color-mix(in srgb,{{ sf.accent }} 55%,#000));display:flex;align-items:center;justify-content:center;flex-shrink:0;"><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 8h14l-1 11.2a2 2 0 0 1-2 1.8H8a2 2 0 0 1-2-1.8L5 8Z"/><path d="M9 8V6.2a3 3 0 0 1 6 0V8"/></svg></div>
                <div style="flex:1;min-width:0;">
                  <div style="display:flex;align-items:center;gap:7px;"><span style="font-size:16.5px;font-weight:700;letter-spacing:-.01em;">Your storefront</span><span style="display:flex;align-items:center;gap:4px;font-size:9px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--st-done);background:color-mix(in srgb,var(--st-done) 13%,transparent);padding:3px 7px;border-radius:999px;"><span style="width:5px;height:5px;border-radius:50%;background:var(--st-done);"></span>Live</span></div>
                  <div style="font-size:12.5px;color:var(--text-subtle);margin-top:1px;">mira.shop/{{ sf.handle }}</div>
                </div>
                <span style="font-size:13.5px;font-weight:600;color:var(--accent);display:flex;align-items:center;gap:1px;flex-shrink:0;">Open<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg></span>
              </div>
              <div class="scroll" style="display:flex;gap:10px;padding:2px 16px 14px;overflow-x:auto;">
                <sc-for list="{{ storePreview }}" as="p" hint-placeholder-count="4">
                  <div style="width:94px;flex-shrink:0;">
                    <div style="height:94px;border-radius:13px;background:{{ p.ph }};border:1px solid var(--border);display:flex;align-items:center;justify-content:center;color:{{ p.monoCol }};font-weight:800;font-size:20px;letter-spacing:-.02em;">{{ p.mono }}</div>
                    <div style="font-size:11.5px;font-weight:600;margin-top:7px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">{{ p.title }}</div>
                    <div style="font-size:11.5px;color:var(--text-subtle);margin-top:1px;">{{ p.price }}</div>
                  </div>
                </sc-for>
              </div>
              <div style="border-top:1px solid var(--border);padding:11px 16px;font-size:12.5px;color:var(--text-muted);">{{ sf.productCount }} products · {{ sf.inStock }} in stock · auto-built from your catalog</div>
            </button>'''

s = s[:i] + NEW + s[j:]

assert s != orig
open(P, 'w').write(s)
print(f"storefront card patched — {len(orig)} -> {len(s)} chars")
