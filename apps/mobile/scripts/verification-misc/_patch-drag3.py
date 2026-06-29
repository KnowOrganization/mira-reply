#!/usr/bin/env python3
# Drag drop fix: on release, snap cards into final order with NO transform transition
# for one frame (else index-reused nodes animate from their drag offset back to 0 = weird).
import os, shutil
D = os.path.dirname(__file__)
P = os.path.join(D, '..', 'design', 'Mira.dc.html')
shutil.copy(P, os.path.join(D, 'verification-misc', 'Mira.dc.html.pre-drag3'))
s = open(P).read()
orig = s


def rep(old, new, n=1):
    global s
    c = s.count(old)
    assert c == n, f'expected {n}x {old[:55]!r}, got {c}'
    s = s.replace(old, new, n)


# 1. state seed: dropping flag
rep('activeFlowId: null, dragIdx: null, dragDy: 0', 'activeFlowId: null, dragIdx: null, dragDy: 0, dropping: false')

# 2. dragEnd: set dropping (no-anim) for one tick, then clear
rep('if(tgt!==i){ this._updateFlow(f=>{ const steps=f.steps.slice(); const m=steps.splice(i,1)[0]; steps.splice(tgt,0,m); return Object.assign({},f,{steps}); }); } this.setState({dragIdx:null, dragDy:0}); };',
    'if(tgt!==i){ this._updateFlow(f=>{ const steps=f.steps.slice(); const m=steps.splice(i,1)[0]; steps.splice(tgt,0,m); return Object.assign({},f,{steps}); }); } this.setState({dragIdx:null, dragDy:0, dropping:true}); setTimeout(()=>this.setState({dropping:false}), 80); };')

# 3. vm: when dropping, drop the transform transition so cards snap (no settle animation)
rep("trans: drag?'box-shadow .18s ease':'box-shadow .18s ease, transform .2s cubic-bezier(.2,0,0,1)',",
    "trans: (drag||s.dropping)?'box-shadow .18s ease':'box-shadow .18s ease, transform .2s cubic-bezier(.2,0,0,1)',")

assert s != orig
open(P, 'w').write(s)
print(f'drag3 patched -- {len(orig)} -> {len(s)} chars')
