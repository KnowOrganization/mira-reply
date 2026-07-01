#!/usr/bin/env python3
# Phase 1 backend integration — wire Home + Inbox(drafts) + Automations(list/toggle)
# to the real API via window.__MIRA_TOKEN. Mock stays as graceful fallback (no token).
# Asserted: every replace verifies its match count before writing.
import shutil, os, sys

SRC = "/Users/danyaldev/Desktop/Shaiz/apps/mobile/design/Mira.dc.html"
BAK = "/Users/danyaldev/Desktop/Shaiz/apps/mobile/scripts/verification-misc/Mira.dc.html.pre-backend1"

s = open(SRC).read()
shutil.copyfile(SRC, BAK)
print("backed up ->", BAK)

def rep(old, new, n=1):
    global s
    c = s.count(old)
    assert c == n, f"expected {n} of <<{old[:70]}...>> got {c}"
    s = s.replace(old, new)

# ---- A. state fields (after activeThread: null,) ----
rep(
  "activeThread: null,\n  };",
  "activeThread: null,\n    live: false, account: null, profile: null, dashData: null,\n"
  "    loadingHome: false, loadingInbox: false, loadingFlows: false,\n  };"
)

# ---- B. methods block (after brainDone) ----
rep(
  "  brainDone = () => this.setState({stage:'app',tab:'home'});\n",
  "  brainDone = () => this.setState({stage:'app',tab:'home'});\n"
  "\n  // ---------- backend (Phase 1) ----------\n"
  "  api = (path, opts) => { const o=opts||{}; const h=Object.assign({'Content-Type':'application/json'}, o.headers||{});"
  " if(window.__MIRA_TOKEN) h['Authorization']='Bearer '+window.__MIRA_TOKEN;"
  " return fetch(path, Object.assign({}, o, {headers:h, credentials:'include'})).then(r=>{ if(!r.ok) throw new Error('http '+r.status); return r.json(); }); };\n"
  "  componentDidMount(){ if(window.__MIRA_TOKEN) this.boot(); }\n"
  "  boot = () => { this.api('/api/ig/status').then(st=>{ this.setState({live:true, account:st.account||null, replyMode:st.replyMode||'assisted', stage: st.connected?'app':'connect', tab:'home'});"
  " if(st.connected){ this.loadHome(); this.loadInbox(); this.loadFlows(); } }).catch(()=>{}); };\n"
  "  _ago = (ms) => { if(!ms) return ''; const d=(Date.now()-ms)/1000; if(d<60) return Math.max(1,Math.round(d))+'s'; if(d<3600) return Math.round(d/60)+'m'; if(d<86400) return Math.round(d/3600)+'h'; return Math.round(d/86400)+'d'; };\n"
  "  loadHome = () => { this.setState({loadingHome:true}); Promise.all([this.api('/api/ig/dashboard'), this.api('/api/ig/profile').catch(()=>null)]).then(([d,p])=>this.setState({dashData:d, profile:(p&&p.profile)||null, loadingHome:false})).catch(()=>this.setState({loadingHome:false})); };\n"
  "  loadInbox = () => { this.setState({loadingInbox:true}); this.api('/api/ig/drafts').then(r=>this.setState({drafts:(r.pending||[]).map(this._mapDraft), loadingInbox:false})).catch(()=>this.setState({loadingInbox:false})); };\n"
  "  loadFlows = () => { this.setState({loadingFlows:true}); this.api('/api/ig/automations').then(r=>this.setState({flows:(r.automations||[]).map(this._mapFlow), loadingFlows:false})).catch(()=>this.setState({loadingFlows:false})); };\n"
  "  _mapDraft = (d) => { const u=d.fromUsername||d.fromUserId||'user'; const nm=d.fromUsername||u; const parts=String(nm).replace(/[^a-zA-Z ]/g,'').trim().split(' '); const initials=((parts[0]||'?')[0]+((parts[1]||'')[0]||'')).toUpperCase();"
  " return {id:d.id, name:nm, handle:'@'+u, initials, av:'#3f3f46', intent:d.intent||(d.kind==='dm'?'DM':'Comment'), time:this._ago(d.createdAt), window:'', comment:d.inboundText||'', draft:d.draftText||d.dmText||'', st:'idle'}; };\n"
  "  _mapFlow = (a) => { const nodes=a.nodes||[]; const tt=(a.trigger&&a.trigger.type)||'comment_post'; const steps=nodes.filter(n=>n.type!=='trigger').map(n=>({uid:++this._uid, type:n.type, config:Object.assign({}, n.data||{})}));"
  " return {id:a.id, name:a.name||'Automation', active:!!a.enabled, runs:(((a.stats&&a.stats.triggered)||0).toLocaleString())+' runs', trigger:{uid:++this._uid, type:tt, config:{scope:((a.trigger&&a.trigger.postIds&&a.trigger.postIds.length)?'Specific posts':'All posts'), kw:((a.trigger&&a.trigger.keywords)||[])}}, steps}; };\n"
)

# ---- C. live-aware mutations ----
rep(
  "approveDraft = (id) => () => { this.setState(s=>({drafts:s.drafts.map(d=>d.id===id?Object.assign({},d,{st:'approved'}):d)})); this.flashToast('Reply sent ✓'); setTimeout(()=>this.setState(s=>({drafts:s.drafts.filter(d=>d.id!==id)})),360); };",
  "approveDraft = (id) => () => { if(this.state.live) this.api('/api/ig/drafts/'+id,{method:'POST',body:JSON.stringify({action:'approve'})}).catch(()=>{}); this.setState(s=>({drafts:s.drafts.map(d=>d.id===id?Object.assign({},d,{st:'approved'}):d)})); this.flashToast('Reply sent ✓'); setTimeout(()=>this.setState(s=>({drafts:s.drafts.filter(d=>d.id!==id)})),360); };"
)
rep(
  "skipDraft = (id) => () => { this.setState(s=>({drafts:s.drafts.map(d=>d.id===id?Object.assign({},d,{st:'dismissed'}):d)})); setTimeout(()=>this.setState(s=>({drafts:s.drafts.filter(d=>d.id!==id)})),360); };",
  "skipDraft = (id) => () => { if(this.state.live) this.api('/api/ig/drafts/'+id,{method:'POST',body:JSON.stringify({action:'reject'})}).catch(()=>{}); this.setState(s=>({drafts:s.drafts.map(d=>d.id===id?Object.assign({},d,{st:'dismissed'}):d)})); setTimeout(()=>this.setState(s=>({drafts:s.drafts.filter(d=>d.id!==id)})),360); };"
)
rep(
  "toggleFlow = (id) => () => this.setState(s=>({flows:s.flows.map(f=>f.id===id?Object.assign({},f,{active:!f.active}):f)}));",
  "toggleFlow = (id) => () => { const cur=this.state.flows.find(f=>f.id===id); if(this.state.live && cur) this.api('/api/ig/automations/'+id,{method:'PATCH',body:JSON.stringify({enabled:!cur.active})}).catch(()=>{}); this.setState(s=>({flows:s.flows.map(f=>f.id===id?Object.assign({},f,{active:!f.active}):f)})); };"
)

# ---- D. renderVals dash prefers live dashData ----
rep(
  "const dash={ coverage:87, replies:'1,240', comments:'1,602', facts:48, sent:64, cap:180, capPct:Math.round(64/180*100)+'%', today,\n      activity:\"Today, Mira saw 24 new comments, auto-replied to 18, drafted \"+s.drafts.length+\" for you and DM'd 11 links — flagging the rest for your eyes.\" };",
  "const dd=s.dashData; const dash= dd ? { coverage:Math.round(dd.coverage||0), replies:String(dd.totalReplies||0), comments:String(dd.totalComments||0), facts:(dd.knowledge&&dd.knowledge.total)||0, sent:(dd.antiBan&&dd.antiBan.sentToday)||0, cap:(dd.antiBan&&dd.antiBan.cap)||180, capPct:Math.round((((dd.antiBan&&dd.antiBan.sentToday)||0)/(((dd.antiBan&&dd.antiBan.cap)||180)))*100)+'%', today, activity:'Mira replied to '+(dd.totalReplies||0)+' of '+(dd.totalComments||0)+\" comments — \"+Math.round(dd.coverage||0)+'% coverage.' } : { coverage:87, replies:'1,240', comments:'1,602', facts:48, sent:64, cap:180, capPct:Math.round(64/180*100)+'%', today,\n      activity:\"Today, Mira saw 24 new comments, auto-replied to 18, drafted \"+s.drafts.length+\" for you and DM'd 11 links — flagging the rest for your eyes.\" };"
)

open(SRC, "w").write(s)
print("patched OK, new len", len(s))
