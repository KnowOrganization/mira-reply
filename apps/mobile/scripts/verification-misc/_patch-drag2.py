#!/usr/bin/env python3
# Drag reorder v2: follow-finger (no teleport). Dragged card tracks pointer (translateY,
# no transition); neighbors between origin and target slide by one row (transition);
# commit array reorder on drop. Connectors fade out during drag.
import os, shutil
D = os.path.dirname(__file__)
P = os.path.join(D, '..', 'design', 'Mira.dc.html')
shutil.copy(P, os.path.join(D, 'verification-misc', 'Mira.dc.html.pre-drag2'))
s = open(P).read()
orig = s


def rep(old, new, n=1):
    global s
    c = s.count(old)
    assert c == n, f'expected {n}x {old[:55]!r}, got {c}'
    s = s.replace(old, new, n)


# 1. state seed: dragDy
rep('activeFlowId: null, dragIdx: null', 'activeFlowId: null, dragIdx: null, dragDy: 0')

# 2. handlers -> follow-finger model
rep("stepDragStart = (i) => (e) => { try{ e.currentTarget.setPointerCapture(e.pointerId); }catch(_){}; const card=e.currentTarget.closest('[data-step]'); this._dragY=e.clientY; this._dragH=card?card.offsetHeight:90; this.setState({dragIdx:i}); };\n"
    "  stepDragMove = (e) => { const i=this.state.dragIdx; if(i==null) return; const dy=e.clientY-this._dragY; if(Math.abs(dy)<=this._dragH*0.6) return; const dir=dy>0?1:-1, j=i+dir; let moved=false; this._updateFlow(f=>{ const steps=f.steps.slice(); if(j<0||j>=steps.length) return f; const t=steps[i]; steps[i]=steps[j]; steps[j]=t; moved=true; return Object.assign({},f,{steps}); }); if(moved){ this.setState({dragIdx:j}); this._dragY=e.clientY; } };\n"
    "  stepDragEnd = (e) => { try{ e.currentTarget.releasePointerCapture(e.pointerId); }catch(_){}; this.setState({dragIdx:null}); };",
    "stepDragStart = (i) => (e) => { try{ e.currentTarget.setPointerCapture(e.pointerId); }catch(_){}; "
    "const card=e.currentTarget.closest('[data-step]'); const list=card?card.parentNode:null; "
    "const cards=list?list.querySelectorAll('[data-step]'):[]; "
    "this._rowH = cards.length>1 ? Math.abs(cards[1].offsetTop-cards[0].offsetTop) : (card?card.offsetHeight+18:96); "
    "this._stepLen = cards.length||1; this._dragY=e.clientY; this.setState({dragIdx:i, dragDy:0}); };\n"
    "  stepDragMove = (e) => { if(this.state.dragIdx==null) return; this.setState({dragDy:e.clientY-this._dragY}); };\n"
    "  stepDragEnd = (e) => { try{ e.currentTarget.releasePointerCapture(e.pointerId); }catch(_){}; "
    "const i=this.state.dragIdx; if(i==null) return; const rowH=this._rowH||96; "
    "const tgt=Math.max(0, Math.min((this._stepLen||1)-1, i+Math.round((this.state.dragDy||0)/rowH))); "
    "if(tgt!==i){ this._updateFlow(f=>{ const steps=f.steps.slice(); const m=steps.splice(i,1)[0]; steps.splice(tgt,0,m); return Object.assign({},f,{steps}); }); } "
    "this.setState({dragIdx:null, dragDy:0}); };")

# 3. steps view-model: per-card translateY follow + neighbor slide + connector fade
rep("const steps=cf.steps.map((st,i)=>{ const d=defs.map[st.type]; const cond=d.cat==='condition'; const col=cond?PUR:A; const drag=s.dragIdx===i;\n"
    "        return { label:d.label, summary:d.sum(st.config), icon:this.nodeIcon(d.icon,18), col,\n"
    "          iconbg:cond?'color-mix(in srgb,var(--purple) 14%,transparent)':'var(--accent-soft)', iconfg:cond?PUR:'var(--accent-deep)',\n"
    "          open:this.openConfig(i,st.type), del:this.deleteStep(i), insertBefore:()=>this.openPicker('step',i),\n"
    "          dragStart:this.stepDragStart(i), dragMove:this.stepDragMove, dragEnd:this.stepDragEnd,\n"
    "          shadow: drag?'0 16px 38px rgba(60,50,95,.22),inset 0 1px 0 rgba(255,255,255,.6)':'0 1px 2px rgba(24,24,27,.04),0 10px 26px rgba(60,50,95,.07),inset 0 1px 0 rgba(255,255,255,.6)',\n"
    "          tf: drag?'scale(1.02)':'none', z: drag?'5':'1', grab: drag?'grabbing':'grab' }; });",
    "const di=s.dragIdx, ddy=s.dragDy||0, rowH=this._rowH||96;\n"
    "      const dtgt = di==null? null : Math.max(0, Math.min(cf.steps.length-1, di+Math.round(ddy/rowH)));\n"
    "      const steps=cf.steps.map((st,i)=>{ const d=defs.map[st.type]; const cond=d.cat==='condition'; const col=cond?PUR:A; const drag=di===i;\n"
    "        let ty=0, z=1; if(di!=null){ if(drag){ ty=ddy; z=20; } else if(di<dtgt && i>di && i<=dtgt){ ty=-rowH; } else if(di>dtgt && i>=dtgt && i<di){ ty=rowH; } }\n"
    "        return { label:d.label, summary:d.sum(st.config), icon:this.nodeIcon(d.icon,18), col,\n"
    "          iconbg:cond?'color-mix(in srgb,var(--purple) 14%,transparent)':'var(--accent-soft)', iconfg:cond?PUR:'var(--accent-deep)',\n"
    "          open:this.openConfig(i,st.type), del:this.deleteStep(i), insertBefore:()=>this.openPicker('step',i),\n"
    "          dragStart:this.stepDragStart(i), dragMove:this.stepDragMove, dragEnd:this.stepDragEnd,\n"
    "          shadow: drag?'0 18px 40px rgba(60,50,95,.24),inset 0 1px 0 rgba(255,255,255,.6)':'0 1px 2px rgba(24,24,27,.04),0 10px 26px rgba(60,50,95,.07),inset 0 1px 0 rgba(255,255,255,.6)',\n"
    "          tf: drag?'translateY('+ty+'px) scale(1.03)':'translateY('+ty+'px)', z: String(z),\n"
    "          trans: drag?'box-shadow .18s ease':'box-shadow .18s ease, transform .2s cubic-bezier(.2,0,0,1)',\n"
    "          grab: drag?'grabbing':'grab', connOp: di==null?'1':'0' }; });")

# 4. card style: dynamic transition
rep('box-shadow:{{ st.shadow }};transform:{{ st.tf }};z-index:{{ st.z }};transition:box-shadow .18s ease,transform .14s ease;',
    'box-shadow:{{ st.shadow }};transform:{{ st.tf }};z-index:{{ st.z }};transition:{{ st.trans }};')

# 5. connector fade during drag
rep('<div style="display:flex;justify-content:center;margin:2px 0;"><button onClick="{{ st.insertBefore }}"',
    '<div style="display:flex;justify-content:center;margin:2px 0;opacity:{{ st.connOp }};transition:opacity .15s ease;"><button onClick="{{ st.insertBefore }}"')

assert s != orig
open(P, 'w').write(s)
print(f'drag2 patched -- {len(orig)} -> {len(s)} chars')
