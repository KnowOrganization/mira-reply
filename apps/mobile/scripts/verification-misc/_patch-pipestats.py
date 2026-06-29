#!/usr/bin/env python3
# Pipeline header stat tiles -> Home-bento language: borderless white + soft shadow,
# ink numbers (drop indigo pipeline value + green rate), bigger labels, airier padding.
import os, shutil
D = os.path.dirname(__file__)
P = os.path.join(D, '..', 'design', 'Mira.dc.html')
shutil.copy(P, os.path.join(D, 'verification-misc', 'Mira.dc.html.pre-pipestats'))
s = open(P).read()
orig = s

OLD = '<div style="display:flex;gap:10px;margin-top:12px;">\n              <div style="flex:1;border-radius:15px;border:1px solid var(--border);background:var(--bg-elev);box-shadow:var(--shadow-card);padding:11px 12px;">\n                <div style="font-size:9.5px;font-weight:500;letter-spacing:.05em;text-transform:none;color:var(--text-subtle);">Open value</div>\n                <div style="font-size:21px;font-weight:500;letter-spacing:-.03em;color:var(--accent);margin-top:2px;">{{ oppSummary.pipeline }}</div>\n              </div>\n              <div style="flex:1;border-radius:15px;border:1px solid var(--border);background:var(--bg-elev);box-shadow:var(--shadow-card);padding:11px 12px;">\n                <div style="font-size:9.5px;font-weight:500;letter-spacing:.05em;text-transform:none;color:var(--text-subtle);">Won / mo</div>\n                <div style="font-size:21px;font-weight:500;letter-spacing:-.03em;margin-top:2px;">{{ oppSummary.won }}</div>\n              </div>\n              <div style="flex:1;border-radius:15px;border:1px solid var(--border);background:var(--bg-elev);box-shadow:var(--shadow-card);padding:11px 12px;">\n                <div style="font-size:9.5px;font-weight:500;letter-spacing:.05em;text-transform:none;color:var(--text-subtle);">Win rate</div>\n                <div style="font-size:21px;font-weight:500;letter-spacing:-.03em;margin-top:2px;color:var(--st-done);">{{ oppSummary.rate }}</div>\n              </div>\n            </div>'


def card(label, expr):
    return ('<div style="flex:1;border:none;border-radius:18px;background:var(--bg-elev);box-shadow:var(--shadow-card);padding:14px 15px;">\n'
            '                <div style="font-size:12px;font-weight:500;color:var(--text-subtle);">' + label + '</div>\n'
            '                <div style="font-size:23px;font-weight:500;letter-spacing:-.03em;color:var(--text);margin-top:6px;">{{ ' + expr + ' }}</div>\n'
            '              </div>')


NEW = ('<div style="display:flex;gap:11px;margin-top:14px;">\n              '
       + card('Open value', 'oppSummary.pipeline') + '\n              '
       + card('Won / mo', 'oppSummary.won') + '\n              '
       + card('Win rate', 'oppSummary.rate') + '\n            </div>')

assert s.count(OLD) == 1, s.count(OLD)
s = s.replace(OLD, NEW, 1)
assert s != orig
open(P, 'w').write(s)
print(f'pipe stats patched -- {len(orig)} -> {len(s)} chars')
