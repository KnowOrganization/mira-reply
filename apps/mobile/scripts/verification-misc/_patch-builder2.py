#!/usr/bin/env python3
# Builder polish: drag-reorder (grip), airy glass step cards (no arrows/chevron),
# add-step sheet -> one list w/ section headers + real descriptions (no tabs).
import os, shutil
D = os.path.dirname(__file__)
P = os.path.join(D, '..', 'design', 'Mira.dc.html')
shutil.copy(P, os.path.join(D, 'verification-misc', 'Mira.dc.html.pre-builder2'))
s = open(P).read()
orig = s


def rep(old, new, n=1):
    global s
    c = s.count(old)
    assert c == n, f'expected {n}x {old[:55]!r}, got {c}'
    s = s.replace(old, new, n)


# 1. state seed: dragIdx
rep('activeFlowId: null', 'activeFlowId: null, dragIdx: null', 1)

# 2. drag handlers (after deleteStep def)
rep('deleteStep = (i) => () => this._updateFlow(f=>{ const steps=f.steps.slice(); steps.splice(i,1); return Object.assign({},',
    'stepDragStart = (i) => (e) => { try{ e.currentTarget.setPointerCapture(e.pointerId); }catch(_){}; '
    'const card=e.currentTarget.closest(\'[data-step]\'); this._dragY=e.clientY; this._dragH=card?card.offsetHeight:90; '
    'this.setState({dragIdx:i}); };\n'
    '  stepDragMove = (e) => { const i=this.state.dragIdx; if(i==null) return; const dy=e.clientY-this._dragY; '
    'if(Math.abs(dy)<=this._dragH*0.6) return; const dir=dy>0?1:-1, j=i+dir; let moved=false; '
    'this._updateFlow(f=>{ const steps=f.steps.slice(); if(j<0||j>=steps.length) return f; '
    'const t=steps[i]; steps[i]=steps[j]; steps[j]=t; moved=true; return Object.assign({},f,{steps}); }); '
    'if(moved){ this.setState({dragIdx:j}); this._dragY=e.clientY; } };\n'
    '  stepDragEnd = (e) => { try{ e.currentTarget.releasePointerCapture(e.pointerId); }catch(_){}; this.setState({dragIdx:null}); };\n'
    '  deleteStep = (i) => () => this._updateFlow(f=>{ const steps=f.steps.slice(); steps.splice(i,1); return Object.assign({},')

# 3. steps view-model: drop up/down/upcol/downcol, add drag fields + drag-elevation styles
rep("const steps=cf.steps.map((st,i)=>{ const d=defs.map[st.type]; const cond=d.cat==='condition'; const col=cond?PUR:A;\n"
    "        return { label:d.label, summary:d.sum(st.config), icon:this.nodeIcon(d.icon,18), col, catLabel:cond?'IF':'DO',\n"
    "          iconbg:cond?'color-mix(in srgb,var(--purple) 14%,transparent)':'var(--accent-soft)', iconfg:cond?PUR:'var(--accent-deep)',\n"
    "          open:this.openConfig(i,st.type), up:this.moveStep(i,-1), down:this.moveStep(i,1), del:this.deleteStep(i),\n"
    "          insertBefore:()=>this.openPicker('step',i), upcol:i>0?'var(--text-muted)':'var(--border-strong)', downcol:i<cf.steps.length-1?'var(--text-muted)':'var(--border-strong)' }; });",
    "const steps=cf.steps.map((st,i)=>{ const d=defs.map[st.type]; const cond=d.cat==='condition'; const col=cond?PUR:A; const drag=s.dragIdx===i;\n"
    "        return { label:d.label, summary:d.sum(st.config), icon:this.nodeIcon(d.icon,18), col,\n"
    "          iconbg:cond?'color-mix(in srgb,var(--purple) 14%,transparent)':'var(--accent-soft)', iconfg:cond?PUR:'var(--accent-deep)',\n"
    "          open:this.openConfig(i,st.type), del:this.deleteStep(i), insertBefore:()=>this.openPicker('step',i),\n"
    "          dragStart:this.stepDragStart(i), dragMove:this.stepDragMove, dragEnd:this.stepDragEnd,\n"
    "          shadow: drag?'0 16px 38px rgba(60,50,95,.22),inset 0 1px 0 rgba(255,255,255,.6)':'0 1px 2px rgba(24,24,27,.04),0 10px 26px rgba(60,50,95,.07),inset 0 1px 0 rgba(255,255,255,.6)',\n"
    "          tf: drag?'scale(1.02)':'none', z: drag?'5':'1', grab: drag?'grabbing':'grab' }; });")

# 4. step card markup -> airy glass, grip + trash on top row, no arrows/chevron/divider row
OLD_CARD = ('<div style="border:none;background:var(--bg-elev);box-shadow:var(--shadow-card);border-radius:18px;padding:15px;transition:transform .12s;" style-active="transform:scale(.99)">\n'
            '                <div onClick="{{ st.open }}" style="display:flex;gap:12px;align-items:center;cursor:pointer;">\n'
            '                  <div style="width:38px;height:38px;border-radius:11px;background:{{ st.iconbg }};color:{{ st.iconfg }};display:flex;align-items:center;justify-content:center;flex-shrink:0;">{{ st.icon }}</div>\n'
            '                  <div style="flex:1;min-width:0;">\n'
            '                    <div style="font-size:14.5px;font-weight:500;">{{ st.label }}</div>\n'
            '                    <div style="font-size:12px;color:var(--text-subtle);margin-top:2px;line-height:1.35;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">{{ st.summary }}</div>\n'
            '                  </div>\n'
            '                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-subtle)" stroke-width="2" stroke-linecap="round" style="flex-shrink:0;"><path d="m9 6 6 6-6 6"/></svg>\n'
            '                </div>\n'
            '                <div style="display:flex;align-items:center;gap:1px;margin-top:11px;padding-top:10px;border-top:1px solid var(--border-subtle);">\n'
            '                  <button onClick="{{ st.up }}" style="width:34px;height:30px;border:none;background:none;border-radius:8px;color:{{ st.upcol }};cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="m6 15 6-6 6 6"/></svg></button>\n'
            '                  <button onClick="{{ st.down }}" style="width:34px;height:30px;border:none;background:none;border-radius:8px;color:{{ st.downcol }};cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg></button>\n'
            '                  <button onClick="{{ st.del }}" style="margin-left:auto;width:34px;height:30px;border:none;background:none;border-radius:8px;color:var(--text-subtle);cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13"/></svg></button>\n'
            '                </div>\n'
            '              </div>')
NEW_CARD = ('<div data-step style="position:relative;border:none;background:linear-gradient(180deg,#fff,color-mix(in srgb,var(--bg-inset) 30%,#fff));border-radius:18px;padding:15px;box-shadow:{{ st.shadow }};transform:{{ st.tf }};z-index:{{ st.z }};transition:box-shadow .18s ease,transform .14s ease;">\n'
            '                <div style="display:flex;gap:12px;align-items:center;">\n'
            '                  <div onClick="{{ st.open }}" style="display:flex;gap:12px;align-items:center;cursor:pointer;flex:1;min-width:0;">\n'
            '                    <div style="width:38px;height:38px;border-radius:11px;background:{{ st.iconbg }};color:{{ st.iconfg }};display:flex;align-items:center;justify-content:center;flex-shrink:0;">{{ st.icon }}</div>\n'
            '                    <div style="flex:1;min-width:0;">\n'
            '                      <div style="font-size:14.5px;font-weight:500;">{{ st.label }}</div>\n'
            '                      <div style="font-size:12px;color:var(--text-subtle);margin-top:2px;line-height:1.35;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">{{ st.summary }}</div>\n'
            '                    </div>\n'
            '                  </div>\n'
            '                  <button onClick="{{ st.del }}" style="width:32px;height:32px;border:none;background:none;border-radius:8px;color:var(--text-subtle);cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;flex-shrink:0;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13"/></svg></button>\n'
            '                  <div onPointerDown="{{ st.dragStart }}" onPointerMove="{{ st.dragMove }}" onPointerUp="{{ st.dragEnd }}" style="width:30px;height:36px;display:flex;align-items:center;justify-content:center;color:var(--border-strong);cursor:{{ st.grab }};touch-action:none;flex-shrink:0;"><svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor"><circle cx="6" cy="4" r="1.4"/><circle cx="12" cy="4" r="1.4"/><circle cx="6" cy="9" r="1.4"/><circle cx="12" cy="9" r="1.4"/><circle cx="6" cy="14" r="1.4"/><circle cx="12" cy="14" r="1.4"/></svg></div>\n'
            '                </div>\n'
            '              </div>')
rep(OLD_CARD, NEW_CARD)

# 5. picker view-model: one-list groups + descriptions, drop tabs
rep("if(bs&&bs.kind==='picker'){ const isTrig=bs.mode==='trigger'; const cats= isTrig?defs.triggers:(bs.tab==='condition'?defs.conditions:defs.actions);\n"
    "      picker={ title:isTrig?'Choose a trigger':'Add a step', showTabs:!isTrig,\n"
    "        tabCondSet:this.setPickerTab('condition'), tabActSet:this.setPickerTab('action'),\n"
    "        tabCondBg:bs.tab==='condition'?'var(--bg-elev)':'transparent', tabCondFg:bs.tab==='condition'?PUR:'var(--text-muted)', tabCondSh:bs.tab==='condition'?'var(--shadow-card)':'none',\n"
    "        tabActBg:bs.tab==='action'?'var(--bg-elev)':'transparent', tabActFg:bs.tab==='action'?A:'var(--text-muted)', tabActSh:bs.tab==='action'?'var(--shadow-card)':'none',\n"
    "        nodes:cats.map(d=>{ const cc=catColor(d.cat); return { label:d.label, sub:d.sub||'flow step', icon:this.nodeIcon(d.icon,18), pick:this.pickNode(d.t), col:cc[0], bg:cc[1] }; }) };\n"
    "    }",
    "if(bs&&bs.kind==='picker'){ const isTrig=bs.mode==='trigger';\n"
    "      const PDESC={contains:'Run only if the message matches',is_follower:'Check if they follow you',first_time:'Only their first time reaching out',window:'Gate on the 24-hour reply window',intent:'Branch on what AI reads they want',business_hours:'Only during your open hours',split:'Randomly send down two paths',private_reply:'Reply privately to the comment',send_dm:'Send them a direct message',send_link:'Drop a link in the DM',carousel:'Show a swipeable product carousel',quick_replies:'Show tappable reply buttons',ask_email:'Capture their email (consent logged)',ask_phone:'Capture their phone (consent logged)',ai_reply:'Let AI draft in your brand voice',add_tag:'Tag the contact in your CRM',set_status:'Set their lead status',assign:'Notify you or hand to an agent',wait:'Pause before the next step',hide_comment:'Hide the comment from the post',react:'React to their message',optin_topic:'Add them to a marketing topic',end:'Stop the automation here'};\n"
    "      const mkNode=d=>{ const cc=catColor(d.cat); return { label:d.label, desc:isTrig?(d.sub||''):(PDESC[d.t]||d.sub||''), icon:this.nodeIcon(d.icon,18), pick:this.pickNode(d.t), col:cc[0], bg:cc[1] }; };\n"
    "      const groups= isTrig? [{title:'', hasTitle:false, nodes:defs.triggers.map(mkNode)}]\n"
    "        : [{title:'Conditions', hasTitle:true, nodes:defs.conditions.map(mkNode)},{title:'Actions', hasTitle:true, nodes:defs.actions.map(mkNode)}];\n"
    "      picker={ title:isTrig?'Choose a trigger':'Add a step', groups };\n"
    "    }")

# 6. picker markup: drop tabs block + flat nodes loop -> grouped list w/ headers + desc
OLD_PICK = ('<div style="padding:6px 20px 10px;flex-shrink:0;">\n'
            '          <div style="font-size:19px;font-weight:500;letter-spacing:-.03em;">{{ picker.title }}</div>\n'
            '          <sc-if value="{{ picker.showTabs }}" hint-placeholder-val="{{ true }}">\n'
            '          <div style="display:flex;gap:5px;background:var(--bg-inset);border-radius:11px;padding:4px;margin-top:12px;">\n'
            '            <button onClick="{{ picker.tabCondSet }}" style="flex:1;height:36px;border:none;border-radius:8px;font-family:inherit;font-size:13px;font-weight:500;cursor:pointer;background:{{ picker.tabCondBg }};color:{{ picker.tabCondFg }};box-shadow:{{ picker.tabCondSh }};">Conditions</button>\n'
            '            <button onClick="{{ picker.tabActSet }}" style="flex:1;height:36px;border:none;border-radius:8px;font-family:inherit;font-size:13px;font-weight:500;cursor:pointer;background:{{ picker.tabActBg }};color:{{ picker.tabActFg }};box-shadow:{{ picker.tabActSh }};">Actions</button>\n'
            '          </div>\n'
            '          </sc-if>\n'
            '        </div>\n'
            '        <div class="scroll" style="overflow-y:auto;padding:4px 16px 36px;">\n'
            '          <sc-for list="{{ picker.nodes }}" as="n" hint-placeholder-count="6">\n'
            '            <button onClick="{{ n.pick }}" style="width:100%;display:flex;align-items:center;gap:12px;padding:12px;border:1px solid var(--border);background:var(--bg-elev);border-radius:14px;margin-bottom:8px;cursor:pointer;font-family:inherit;text-align:left;">\n'
            '              <div style="width:38px;height:38px;border-radius:10px;background:{{ n.bg }};color:{{ n.col }};display:flex;align-items:center;justify-content:center;flex-shrink:0;">{{ n.icon }}</div>\n'
            '              <div style="flex:1;min-width:0;">\n'
            '                <div style="font-size:14px;font-weight:500;color:var(--text);">{{ n.label }}</div>\n'
            '                <div style="font-size:10.5px;color:var(--text-subtle);font-family:ui-monospace,monospace;margin-top:1px;">{{ n.sub }}</div>\n'
            '              </div>\n'
            '              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-subtle)" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>\n'
            '            </button>\n'
            '          </sc-for>\n'
            '        </div>')
NEW_PICK = ('<div style="padding:6px 20px 10px;flex-shrink:0;">\n'
            '          <div style="font-size:19px;font-weight:500;letter-spacing:-.03em;">{{ picker.title }}</div>\n'
            '        </div>\n'
            '        <div class="scroll" style="overflow-y:auto;padding:4px 16px 36px;">\n'
            '          <sc-for list="{{ picker.groups }}" as="g" hint-placeholder-count="2">\n'
            '            <sc-if value="{{ g.hasTitle }}" hint-placeholder-val="{{ true }}">\n'
            '            <div style="font-size:11px;font-weight:500;letter-spacing:.04em;color:var(--text-subtle);margin:14px 6px 8px;">{{ g.title }}</div>\n'
            '            </sc-if>\n'
            '            <sc-for list="{{ g.nodes }}" as="n" hint-placeholder-count="5">\n'
            '              <button onClick="{{ n.pick }}" style="width:100%;display:flex;align-items:center;gap:12px;padding:12px;border:1px solid var(--border-subtle);background:var(--bg-elev);box-shadow:var(--shadow-card);border-radius:14px;margin-bottom:8px;cursor:pointer;font-family:inherit;text-align:left;">\n'
            '                <div style="width:38px;height:38px;border-radius:10px;background:{{ n.bg }};color:{{ n.col }};display:flex;align-items:center;justify-content:center;flex-shrink:0;">{{ n.icon }}</div>\n'
            '                <div style="flex:1;min-width:0;">\n'
            '                  <div style="font-size:14px;font-weight:500;color:var(--text);">{{ n.label }}</div>\n'
            '                  <div style="font-size:11.5px;color:var(--text-subtle);margin-top:1px;line-height:1.3;">{{ n.desc }}</div>\n'
            '                </div>\n'
            '                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-subtle)" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>\n'
            '              </button>\n'
            '            </sc-for>\n'
            '          </sc-for>\n'
            '        </div>')
rep(OLD_PICK, NEW_PICK)

assert s != orig
open(P, 'w').write(s)
print(f'builder2 patched -- {len(orig)} -> {len(s)} chars')
