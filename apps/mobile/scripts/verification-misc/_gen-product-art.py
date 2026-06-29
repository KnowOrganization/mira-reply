#!/usr/bin/env python3
# Generate clean skincare-package SVG mockups (one per product mono) as base64 data-URIs.
# Output: a JS object literal `const PRODART = {...}` written to scripts/_prodart.js.snippet
import os
from urllib.parse import quote

# mono -> (form, tint, cap, deep)  tint=glass body, cap=lid/dropper, deep=label text
SPEC = {
  'VC': ('dropper', '#fbbf24', '#1f2937', '#b45309'),  # vitamin C amber
  'ND': ('dropper', '#2dd4bf', '#0f172a', '#0f766e'),  # niacinamide teal
  'CM': ('jar',     '#f0d9bd', '#caa57a', '#9a6b3f'),  # ceramide cream beige
  'SP': ('tube',    '#38bdf8', '#0ea5e9', '#0369a1'),  # spf sky blue
  'HM': ('mist',    '#f9a8d4', '#ec4899', '#be185d'),  # hydra mist pink
  'RN': ('dropper', '#a78bfa', '#312e81', '#5b21b6'),  # retinol violet (dark glass)
  'GC': ('pump',    '#86efac', '#22c55e', '#15803d'),  # cleanser green
  'CD': ('jar',     '#94a3b8', '#475569', '#334155'),  # clay slate
}

def shadow():
    return '<ellipse cx="100" cy="228" rx="56" ry="11" fill="#000" opacity="0.10"/>'

def label(x, y, w, h, mono, deep):
    cx = x + w/2
    return (f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="9" fill="#ffffff" opacity="0.94"/>'
            f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="9" fill="none" stroke="#000" stroke-opacity="0.06"/>'
            f'<text x="{cx}" y="{y+h*0.46}" font-family="Helvetica,Arial,sans-serif" font-size="22" font-weight="800" '
            f'fill="{deep}" text-anchor="middle" letter-spacing="-1">{mono}</text>'
            f'<rect x="{cx-15}" y="{y+h*0.58}" width="30" height="3.4" rx="1.7" fill="{deep}" opacity="0.5"/>'
            f'<rect x="{cx-22}" y="{y+h*0.7}" width="44" height="2.6" rx="1.3" fill="{deep}" opacity="0.28"/>')

def body_grad(i, tint):
    return (f'<linearGradient id="g{i}" x1="0" y1="0" x2="1" y2="0">'
            f'<stop offset="0" stop-color="{tint}" stop-opacity="0.95"/>'
            f'<stop offset="0.5" stop-color="{tint}"/>'
            f'<stop offset="1" stop-color="{tint}" stop-opacity="0.78"/></linearGradient>'
            # glass highlight stripe
            )

def gloss(x, y, w, h, rx):
    return f'<rect x="{x+w*0.16}" y="{y+6}" width="{max(5,w*0.13)}" height="{h-14}" rx="{rx}" fill="#fff" opacity="0.28"/>'

def shape(form, i, tint, cap, deep, mono):
    g = body_grad(i, tint)
    if form == 'dropper':
        body = (f'<rect x="64" y="96" width="72" height="128" rx="15" fill="url(#g{i})"/>'
                + gloss(64,96,72,128,5)
                + f'<rect x="88" y="80" width="24" height="18" rx="3" fill="{tint}" opacity="0.85"/>'      # neck
                + f'<rect x="78" y="46" width="44" height="40" rx="11" fill="{cap}"/>'                       # rubber bulb cap
                + f'<rect x="84" y="40" width="32" height="12" rx="5" fill="{cap}" opacity="0.85"/>'
                + label(76,128,48,72,mono,deep))
    elif form == 'jar':
        body = (f'<rect x="54" y="110" width="92" height="96" rx="17" fill="url(#g{i})"/>'
                + gloss(54,110,92,96,6)
                + f'<rect x="58" y="80" width="84" height="36" rx="13" fill="{cap}"/>'                       # lid
                + f'<rect x="58" y="80" width="84" height="11" rx="6" fill="#fff" opacity="0.18"/>'
                + label(70,134,60,50,mono,deep))
    elif form == 'tube':
        body = (f'<rect x="72" y="62" width="56" height="140" rx="27" fill="url(#g{i})"/>'
                + f'<rect x="72" y="62" width="56" height="34" rx="27" fill="#fff" opacity="0.16"/>'         # rounded shoulder sheen
                + gloss(72,72,56,120,5)
                + f'<rect x="70" y="198" width="60" height="26" rx="6" fill="{cap}"/>'                       # base cap
                + label(80,108,40,76,mono,deep))
    else:  # mist / pump
        body = (f'<rect x="66" y="106" width="68" height="118" rx="15" fill="url(#g{i})"/>'
                + gloss(66,106,68,118,5)
                + f'<rect x="88" y="92" width="24" height="16" rx="3" fill="{tint}" opacity="0.85"/>'        # neck
                + f'<rect x="84" y="74" width="32" height="20" rx="5" fill="{cap}"/>'                        # actuator
                + (f'<rect x="62" y="78" width="26" height="9" rx="4" fill="{cap}"/>' if form=='mist'
                   else f'<rect x="94" y="58" width="9" height="22" rx="4" fill="{cap}"/>')                  # mist nozzle / pump spout
                + f'<rect x="95" y="86" width="10" height="10" fill="{cap}" opacity="0.7"/>'                 # stem
                + label(76,130,48,66,mono,deep))
    bg = ('<defs>'
          f'<linearGradient id="bg{i}" x1="0" y1="0" x2="0" y2="1">'
          '<stop offset="0" stop-color="#f7f8fa"/><stop offset="1" stop-color="#e9ebef"/></linearGradient>'
          f'<radialGradient id="hl{i}" cx="0.5" cy="0.32" r="0.7">'
          '<stop offset="0" stop-color="#ffffff" stop-opacity="0.9"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient>'
          + g + '</defs>')
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 250">'
            + bg
            + f'<rect width="200" height="250" fill="url(#bg{i})"/>'
            + f'<rect width="200" height="250" fill="url(#hl{i})"/>'
            + shadow() + body
            + '</svg>')

out = {}
for idx, (mono, (form, tint, cap, deep)) in enumerate(SPEC.items()):
    svg = shape(form, idx, tint, cap, deep, mono)
    # percent-encoded utf8 data URI for <img src> (best WebKit support for inline SVG).
    # No ';base64' and no double quotes -> safe inside double-quoted src="" and JS string.
    enc = quote(svg, safe="")
    out[mono] = "data:image/svg+xml," + enc

# emit JS object literal on one line (no quotes/semicolons in values -> double-quote JS strings)
parts = [f'{k}:"{v}"' for k, v in out.items()]
js = "const PRODART={" + ",".join(parts) + "};"
dest = os.path.join(os.path.dirname(__file__), '_prodart.js.snippet')
open(dest, 'w').write(js)
print(f"wrote {dest}  ({len(js)} chars, {len(out)} products)")
