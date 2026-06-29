#!/usr/bin/env python3
# Rename Pipeline -> Opportunities (page title + nav). Add an "agents working for you"
# horizontal strip near the top of the Opportunities page (named AI agents, live pulse).
import os, shutil
D = os.path.dirname(__file__)
P = os.path.join(D, '..', 'design', 'Mira.dc.html')
shutil.copy(P, os.path.join(D, 'verification-misc', 'Mira.dc.html.pre-agents'))
s = open(P).read()
orig = s


def rep(old, new, n=1):
    global s
    c = s.count(old)
    assert c == n, f'expected {n}x {old[:55]!r}, got {c}'
    s = s.replace(old, new, n)


# 1. rename page heading
rep('letter-spacing:-.04em;">Pipeline</div>', 'letter-spacing:-.04em;">Opportunities</div>')

# 2. rename nav tab label
rep("tabLabels={home:'Home',opps:'Pipeline',inbox:'Inbox'", "tabLabels={home:'Home',opps:'Opportunities',inbox:'Inbox'")

# 3. agents view-model (after oppSummary)
rep("oppSummary={ pipeline:'₹4.8L', won:String(wonCount), rate:'68%' };",
    "oppSummary={ pipeline:'₹4.8L', won:String(wonCount), rate:'68%' };\n"
    "    const agentAv=['#3f3f46','#52525b','#6b6b70','#71717a'];\n"
    "    const agents=[ {name:'Scout', role:'Sourcing new leads', stat:'12 found today', init:'SC'},\n"
    "      {name:'Sage', role:'Scoring buyer intent', stat:'7 qualified', init:'SG'},\n"
    "      {name:'Closer', role:'Advancing warm deals', stat:'3 moved up', init:'CL'},\n"
    "      {name:'Echo', role:'Following up on time', stat:'5 nudged', init:'EC'} ]"
    ".map((a,i)=>Object.assign({},a,{av:agentAv[i%agentAv.length]}));")

# 4. expose agents to template
rep("oppSummary, oppChips, feed,", "oppSummary, oppChips, agents, feed,")

# 5. agents strip markup (before the chips scroll)
rep('<div class="scroll" style="display:flex;gap:8px;padding:10px 18px 4px;overflow-x:auto;flex-shrink:0;">\n            <sc-for list="{{ oppChips }}"',
    '<div style="padding:2px 18px 0;flex-shrink:0;">\n'
    '            <div style="font-size:11.5px;font-weight:500;color:var(--text-subtle);display:flex;align-items:center;gap:7px;">'
    '<span style="width:6px;height:6px;border-radius:50%;background:var(--accent);animation:glow 2s ease-out infinite;"></span>Agents working for you</div>\n'
    '          </div>\n'
    '          <div class="scroll" style="display:flex;gap:11px;padding:11px 18px 4px;overflow-x:auto;flex-shrink:0;">\n'
    '            <sc-for list="{{ agents }}" as="a" hint-placeholder-count="4">\n'
    '              <div style="flex:0 0 auto;width:172px;border:1px solid var(--border);border-radius:18px;background:var(--bg-elev);box-shadow:0 1px 2px rgba(24,24,27,.04),0 8px 22px rgba(60,50,95,.09);padding:14px;">\n'
    '                <div style="display:flex;align-items:center;justify-content:space-between;">\n'
    '                  <div style="width:36px;height:36px;border-radius:50%;background:{{ a.av }};color:#fff;display:flex;align-items:center;justify-content:center;font-size:12.5px;font-weight:500;letter-spacing:.02em;">{{ a.init }}</div>\n'
    '                  <span style="width:7px;height:7px;border-radius:50%;background:var(--accent);animation:glow 2s ease-out infinite;flex-shrink:0;"></span>\n'
    '                </div>\n'
    '                <div style="font-size:14.5px;font-weight:500;color:var(--text);margin-top:11px;">{{ a.name }}</div>\n'
    '                <div style="font-size:11.5px;color:var(--text-subtle);margin-top:2px;line-height:1.3;">{{ a.role }}</div>\n'
    '                <div style="font-size:11.5px;font-weight:500;color:var(--text);margin-top:9px;">{{ a.stat }}</div>\n'
    '              </div>\n'
    '            </sc-for>\n'
    '          </div>\n'
    '          <div class="scroll" style="display:flex;gap:8px;padding:10px 18px 4px;overflow-x:auto;flex-shrink:0;">\n            <sc-for list="{{ oppChips }}"')

assert s != orig
open(P, 'w').write(s)
print(f'agents patched -- {len(orig)} -> {len(s)} chars')
