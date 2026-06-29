#!/usr/bin/env python3
# Give the Home storefront card the literal SHAPE of a shopfront:
#   signboard (kanban) -> scalloped striped awning valance -> glass window w/ product display -> base.
import os
P = os.path.join(os.path.dirname(__file__), '..', 'design', 'Mira.dc.html')
s = open(P).read()
orig = s

start = '<button onClick="{{ openStorefront }}" style="width:100%;margin-top:11px;text-align:left;border:none;border-radius:20px;'
assert s.count(start) == 1, "expected single Home storefront button"
i = s.index(start)
j = s.index('</button>', i) + len('</button>')

NEW = '''<button onClick="{{ openStorefront }}" style="width:100%;margin-top:11px;text-align:left;border:none;border-radius:20px;overflow:hidden;cursor:pointer;font-family:inherit;background:var(--bg-elev);box-shadow:var(--shadow-card);display:block;padding:0;transition:transform .12s;" style-active="transform:scale(.99)">
              <div style="position:relative;background:linear-gradient(150deg,{{ sf.accent }},color-mix(in srgb,{{ sf.accent }} 60%,#000));padding:14px 16px 13px;display:flex;align-items:center;gap:11px;">
                <div style="width:38px;height:38px;border-radius:11px;background:rgba(255,255,255,.18);display:flex;align-items:center;justify-content:center;flex-shrink:0;"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 8h14l-1 11.2a2 2 0 0 1-2 1.8H8a2 2 0 0 1-2-1.8L5 8Z"/><path d="M9 8V6.2a3 3 0 0 1 6 0V8"/></svg></div>
                <div style="flex:1;min-width:0;">
                  <div style="display:flex;align-items:center;gap:7px;"><span style="font-size:16.5px;font-weight:700;letter-spacing:-.01em;color:#fff;">Your storefront</span><span style="display:flex;align-items:center;gap:4px;font-size:9px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#fff;background:rgba(255,255,255,.2);padding:3px 7px;border-radius:999px;"><span style="width:5px;height:5px;border-radius:50%;background:#fff;box-shadow:0 0 0 2px rgba(255,255,255,.35);"></span>Live</span></div>
                  <div style="font-size:12.5px;color:rgba(255,255,255,.78);margin-top:1px;">mira.shop/{{ sf.handle }}</div>
                </div>
                <span style="font-size:13.5px;font-weight:700;color:#fff;display:flex;align-items:center;gap:1px;flex-shrink:0;">Open<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg></span>
              </div>
              <div style="height:16px;background:repeating-linear-gradient(90deg,{{ sf.accent }} 0 14px,color-mix(in srgb,{{ sf.accent }} 32%,#fff) 14px 28px);-webkit-mask:radial-gradient(8px at 50% 0,#0000 96%,#000) 50% 100%/28px 16px repeat-x;mask:radial-gradient(8px at 50% 0,#0000 96%,#000) 50% 100%/28px 16px repeat-x;"></div>
              <div class="scroll" style="display:flex;gap:10px;padding:13px 16px 14px;overflow-x:auto;background:var(--bg-inset);">
                <sc-for list="{{ storePreview }}" as="p" hint-placeholder-count="4">
                  <div style="width:94px;flex-shrink:0;">
                    <div style="height:94px;border-radius:13px;background:{{ p.ph }};border:1px solid var(--border);box-shadow:inset 0 1px 0 rgba(255,255,255,.5);display:flex;align-items:center;justify-content:center;color:{{ p.monoCol }};font-weight:800;font-size:20px;letter-spacing:-.02em;">{{ p.mono }}</div>
                    <div style="font-size:11.5px;font-weight:600;margin-top:7px;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">{{ p.title }}</div>
                    <div style="font-size:11.5px;color:var(--text-subtle);margin-top:1px;">{{ p.price }}</div>
                  </div>
                </sc-for>
              </div>
              <div style="border-top:1px solid var(--border);padding:11px 16px;font-size:12.5px;color:var(--text-muted);">{{ sf.productCount }} products · {{ sf.inStock }} in stock · auto-built from your catalog</div>
            </button>'''

s = s[:i] + NEW + s[j:]
assert s != orig
open(P, 'w').write(s)
print(f"shopfront card patched -- {len(orig)} -> {len(s)} chars")
