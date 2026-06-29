#!/usr/bin/env python3
# Refactor Mira.dc.html to the "Haze" design system.
import os, re
D = os.path.dirname(__file__)
P = os.path.join(D, '..', 'design', 'Mira.dc.html')
s = open(P).read()
orig = s
N = len(s)


def rep(old, new, n=1):
    global s
    c = s.count(old)
    assert c == n, f'expected {n}x {old[:55]!r}, got {c}'
    s = s.replace(old, new, n)


def soft(old, new):  # replace all occurrences if present (>=1)
    global s
    c = s.count(old)
    assert c >= 1, f'soft: not found {old[:55]!r}'
    s = s.replace(old, new)


def ink_button(handler):
    """Turn the accent-filled button for a given onClick handler into near-black ink."""
    global s
    h = '{{ ' + handler + ' }}'
    i = s.index(h)
    j = s.index('background:var(--accent);color:', i)
    end = s.index(';', j + len('background:var(--accent);color:'))
    frag = s[j:end + 1]  # e.g. background:var(--accent);color:#fff;  or ...color:var(--accent-fg);
    s = s[:j] + 'background:var(--text);color:var(--bg-elev);' + s[end + 1:]


# ---- 1. token block -> Haze ------------------------------------------------
ROOT_OLD = """:root{
    --bg-frame:#f2f2f7; --bg:#ffffff; --bg-elev:#ffffff; --bg-sidebar:#fbfbfc; --bg-inset:#e9e9ee;
    --border:#e8e8ec; --border-strong:#d8d8dd; --text:#1a1a1f; --text-muted:#6b6f76; --text-subtle:#9ca0a8;
    --accent:#4f6bed; --accent-fg:#ffffff; --accent-soft:#eceffd; --accent-deep:#2a3da8;
    --st-progress:#f2c94c; --st-done:#5e9e6e; --st-blocked:#e5484d; --st-warm:#e08a3c; --purple:#9b5de5;
    --bubble-them:#f0f0f3; --bubble-them-fg:#1a1a1f;
    --shadow-card:0 1px 2px rgba(20,21,26,.05); --shadow-pop:0 8px 30px -8px rgba(20,21,26,.18),0 2px 6px rgba(20,21,26,.06); --shadow-soft:0 8px 24px -12px rgba(20,21,26,.1);
  }"""
ROOT_NEW = """:root{
    --bg-frame:radial-gradient(150% 100% at 100% 100%,#f6f5fc 0%,#fbf6f6 45%,#ffffff 82%); --bg:#ffffff; --bg-elev:#ffffff; --bg-sidebar:#fafafa; --bg-inset:#f4f4f5;
    --border:#ebebed; --border-strong:#d4d4d8; --text:#18181b; --text-muted:#6b6b70; --text-subtle:#9c9ca1;
    --accent:#d9477a; --accent-fg:#ffffff; --accent-soft:#fae9ef; --accent-deep:#b0335f;
    --st-progress:#b8791c; --st-done:#1f9d6b; --st-blocked:#d14343; --st-warm:#b8791c; --purple:#6b6b70;
    --bubble-them:#f4f4f5; --bubble-them-fg:#18181b;
    --shadow-card:0 1px 2px rgba(24,24,27,.05); --shadow-pop:0 12px 32px rgba(24,24,27,.10),0 4px 16px rgba(24,24,27,.08); --shadow-soft:0 4px 16px rgba(24,24,27,.08);
  }"""
rep(ROOT_OLD, ROOT_NEW)

# ---- 2. drop dark mode -----------------------------------------------------
i = s.index('[data-theme="dark"]{')
j = s.index('}', i) + 1
s = s[:i].rstrip() + '\n  ' + s[j:].lstrip('\n')  # remove the whole dark block

# remove the Settings Light/Dark toggle (Appearance label + segmented control)
a = s.index('>Appearance</div>')
a = s.rindex('<div', 0, a)            # start of the Appearance label div
b = s.index('>Dark<', a)
b = s.index('</div>', s.index('</button>', b)) + len('</div>')  # end of toggle container
s = s[:a] + s[b:]

# ---- 3. type: Inter-first + cap heavy weights ------------------------------
rep('family=Inter:wght@400;500;600;700;800;900&display=swap',
    'family=Inter:wght@400;500;600&display=swap')
soft("font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display','SF Pro Text','Inter',system-ui,sans-serif;",
     "font-family:'Inter',-apple-system,BlinkMacSystemFont,'SF Pro Text',system-ui,sans-serif;")
soft('font-weight:800', 'font-weight:600')
soft('font-weight:700', 'font-weight:600')

# ---- 4. primary buttons -> ink --------------------------------------------
for hdl in ['introNext', 'connect', 'brainDone', 'd.approve', 'newFlow',
            'storefront.customize', 't.use', 'o.advance', 'newProduct.save',
            'closeBsheet', 'closeCustomize']:
    ink_button(hdl)

# conditional CTA backgrounds -> ink
rep("sendBtnBg:s.composer.trim()?A:'var(--border-strong)'",
    "sendBtnBg:s.composer.trim()?'var(--text)':'var(--border-strong)'")
rep("ctaBg:o.stage===2?'var(--st-done)':A, ctaFg:'#fff'",
    "ctaBg:o.stage===2?'var(--st-done)':'var(--text)', ctaFg:'#fff'")

# ---- 5. storefront signboard -> ink, LIVE dot -> rose ----------------------
rep("accent:'#4f6bed'", "accent:'#18181b'")
rep('background:#fff;box-shadow:0 0 0 2px rgba(255,255,255,.35);',
    'background:var(--accent);box-shadow:0 0 0 2px rgba(217,71,122,.35);')

# ---- 6. fold multi-hue semantic maps to Haze (success/warning/danger+neutral)
rep("Question:['var(--accent-soft)','var(--accent-deep)']",
    "Question:['var(--bg-inset)','var(--text-muted)']")
rep("new:['var(--accent-soft)','var(--accent-deep)','Mark paid']",
    "new:['var(--bg-inset)','var(--text-muted)','Mark paid']")
rep("sexual:['color-mix(in srgb,var(--st-blocked) 12%,transparent)','#c98a9b']",
    "sexual:['color-mix(in srgb,var(--st-blocked) 12%,transparent)','var(--st-blocked)']")
rep("confcol=o.conf>=85?'var(--st-done)':o.conf>=70?A:WARM;",
    "confcol=o.conf>=85?'var(--st-done)':o.conf>=70?'var(--text-muted)':'var(--text-subtle)';")

# Home bento metric numbers -> ink (rose lives only in the viz highlight + interactive states)
rep("metric:oppSummary.pipeline, metricCol:A,", "metric:oppSummary.pipeline, metricCol:'var(--text)',")
rep("metric:String(flowsActive), metricCol:A,", "metric:String(flowsActive), metricCol:'var(--text)',")
rep("metric:String(s.flagged.length), metricCol:s.flagged.length?'var(--st-blocked)':'var(--text)',",
    "metric:String(s.flagged.length), metricCol:'var(--text)',")
rep("metric:orderSummary.open, metricCol:'var(--st-warm)',", "metric:orderSummary.open, metricCol:'var(--text)',")
rep("metric:String(sf.productCount), metricCol:A,", "metric:String(sf.productCount), metricCol:'var(--text)',")

# sentence case everywhere (Haze: no ALL CAPS) + neutralize the opp type pill
soft('text-transform:uppercase', 'text-transform:none')
rep("background:var(--accent-soft);color:var(--accent-deep);\">{{ o.type }}",
    "background:var(--bg-inset);color:var(--text-muted);\">{{ o.type }}")

# chart bars -> single rose accent
rep("intentRaw=[['Praise',31,'var(--st-done)'],['Question',42,A],['Link request',28,'var(--st-warm)'],['Buyer',12,'var(--purple)'],['Business',7,'#7a8a9a']]",
    "intentRaw=[['Praise',31,A],['Question',42,A],['Link request',28,A],['Buyer',12,A],['Business',7,A]]")
rep("topRaw=[['Vitamin C Glow Serum',42,A],['SPF 50 Daily Shield',31,'var(--st-done)'],['Niacinamide 10% Drops',24,WARM],['Ceramide Moisturiser',15,PUR]]",
    "topRaw=[['Vitamin C Glow Serum',42,A],['SPF 50 Daily Shield',31,A],['Niacinamide 10% Drops',24,A],['Ceramide Moisturiser',15,A]]")

# ---- 7. avatars -> graphite ramp ------------------------------------------
for old, new in [("av:'#e08a3c'", "av:'#52525b'"), ("av:'#4f6bed'", "av:'#3f3f46'"),
                 ("av:'#5e9e6e'", "av:'#71717a'"), ("av:'#9b5de5'", "av:'#52525b'"),
                 ("av:'#7a8a9a'", "av:'#71717a'"), ("av:'#c98a9b'", "av:'#3f3f46'"),
                 ("av:'#e5484d'", "av:'#3f3f46'")]:
    if s.count(old):
        s = s.replace(old, new)
rep("av:c.av||#blue".replace("#blue",chr(39)+"#4f6bed"+chr(39)), "av:c.av||"+chr(39)+"#3f3f46"+chr(39))
rep("av:o.conf>=90?'#5e9e6e':o.conf>=80?'#4f6bed':'#7a8a9a'",
    "av:o.conf>=90?'#52525b':o.conf>=80?'#3f3f46':'#71717a'")

# ---- 8. swap the VIZART literal with the regenerated Haze viz --------------
viz = open(os.path.join(D, 'verification-misc', '_tileart.js.snippet')).read().strip()
i = s.index('const VIZART={')
j = s.index('};', i) + 2
s = s[:i] + viz + s[j:]

assert s != orig
open(P, 'w').write(s)
print(f'Haze refactor applied -- {N} -> {len(s)} chars')
