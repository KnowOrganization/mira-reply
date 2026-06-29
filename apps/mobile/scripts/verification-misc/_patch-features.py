#!/usr/bin/env python3
# One-shot, asserted patch that adds the new feature pages to design/Mira.dc.html:
#   guard center, automation templates, store orders, store insights, add-product
#   (reviving the "coming soon" stub) + expanded analytics + nav wiring.
# Idempotent-ish via exact-match asserts; safe to read before running.
import sys, os
P = os.path.join(os.path.dirname(__file__), '..', 'design', 'Mira.dc.html')
s = open(P).read()
orig = s

def repl(old, new, n=1):
    global s
    c = s.count(old)
    assert c == n, f"expected {n} match, got {c} for: {old[:70]!r}"
    s = s.replace(old, new)

def insert_after(anchor, text):
    global s
    c = s.count(anchor)
    assert c == 1, f"anchor not unique ({c}): {anchor[:70]!r}"
    i = s.index(anchor) + len(anchor)
    s = s[:i] + text + s[i:]

def insert_after_close(find, close, text):
    """insert `text` after the first `close` that follows `find`."""
    global s
    assert s.count(find) >= 1, f"missing: {find[:60]!r}"
    i = s.index(find)
    j = s.index(close, i) + len(close)
    s = s[:j] + text + s[j:]

# ───────────────────────── 1. STATE ─────────────────────────
repl(
 "    csheetMounted: false, csheetClosing: false,\n    activeThread: null,",
 "    csheetMounted: false, csheetClosing: false,\n"
 "    guardSeg:'flagged',\n"
 "    guardRules:{ hate:true, spam:true, sexual:true, threats:false },\n"
 "    blockKeywords:['scam','free followers','f4f','link in bio spam'],\n"
 "    kwDraft:'',\n"
 "    flagged:[\n"
 "      { id:1, name:'rage_lord92', handle:'@rage_lord92', initials:'RL', av:'#e5484d', kind:'comment', text:'this is absolute garbage, delete your account 🤮', category:'hate', severity:'high', tone:'aggressive', signal:'troll', sensitive:false, ts:'4m', st:'idle' },\n"
 "      { id:2, name:'crypto_deals_x', handle:'@crypto_deals_x', initials:'CD', av:'#e08a3c', kind:'dm', text:'F4F? check my page, free followers link 👉 bit.ly/x', category:'spam', severity:'low', tone:'neutral', signal:'spam', sensitive:false, ts:'12m', st:'idle' },\n"
 "      { id:3, name:'anon_troll', handle:'@anon_troll', initials:'AT', av:'#9b5de5', kind:'comment', text:'nobody asked, you and your \"brand\" are a joke lol', category:'troll', severity:'medium', tone:'aggressive', signal:'troll', sensitive:false, ts:'31m', st:'idle' },\n"
 "      { id:4, name:'dm_creep', handle:'@dm_creep', initials:'DC', av:'#7a8a9a', kind:'dm', text:'(flagged sexual content — hidden by Mira)', category:'sexual', severity:'high', tone:'aggressive', signal:'troll', sensitive:true, ts:'1h', st:'idle' },\n"
 "    ],\n"
 "    blocklist:[\n"
 "      { userId:'u_881', username:'@spam_bot_44', initials:'SB', reason:'Spam / f4f', ts:'2d ago' },\n"
 "      { userId:'u_902', username:'@hate_acct', initials:'HA', reason:'Hate speech', ts:'5d ago' },\n"
 "    ],\n"
 "    orders:[\n"
 "      { id:1, customer:'Sara Mitchell', handle:'@sara_codes', initials:'SC', av:'#e08a3c', product:'Vitamin C Glow Serum', amount:'₹1,299', status:'new', ts:'8m' },\n"
 "      { id:2, customer:'Dev Patel', handle:'@dev.builds', initials:'DP', av:'#7a8a9a', product:'SPF 50 Daily Shield', amount:'₹899', status:'paid', ts:'42m' },\n"
 "      { id:3, customer:'Meera Rao', handle:'@meera.rao', initials:'MR', av:'#5e9e6e', product:'Niacinamide 10% Drops', amount:'₹999', status:'shipped', ts:'3h' },\n"
 "      { id:4, customer:'Ayaan Khan', handle:'@ayaan.k', initials:'AK', av:'#4f6bed', product:'Ceramide Moisturiser', amount:'₹1,499', status:'new', ts:'5h' },\n"
 "      { id:5, customer:'Nina Roy', handle:'@nina.roy', initials:'NR', av:'#c98a9b', product:'Hyaluronic Hydra Mist', amount:'₹749', status:'paid', ts:'1d' },\n"
 "    ],\n"
 "    npName:'', npPrice:'', npSubtitle:'', npDesc:'', npAvailable:true,\n"
 "    activeThread: null,")

# ───────────────────────── 2. HANDLERS (replace the coming-soon stub) ─────────────────────────
repl(
 "  addProduct = () => this.flashToast('Product editor coming soon');",
 """  // ---------- add product ----------
  openAddProduct = () => { this.setState({ npName:'', npPrice:'', npSubtitle:'', npDesc:'', npAvailable:true }); this.push('addProduct'); };
  setNp = (k) => (e) => this.setState({ [k]: e.target.value });
  toggleNpAvail = () => this.setState(s=>({ npAvailable:!s.npAvailable }));
  saveProduct = () => { const n=this.state.npName.trim(); if(!n){ this.flashToast('Add a product name'); return; }
    const mono=(n.replace(/[^A-Za-z]/g,'').slice(0,2)||'PR').toUpperCase(); const id=Date.now();
    const p={ id, title:n, subtitle:this.state.npSubtitle.trim()||'New product', price:this.state.npPrice.trim()||'DM for price', mono, available:this.state.npAvailable, featured:false, cta:true, desc:this.state.npDesc.trim()||'A new product in the catalog.' };
    this.setState(s=>({ products:s.products.concat([p]) })); this.flashToast('Product added ✓'); this.setState({route:'catalog'}); };
  addProduct = () => this.openAddProduct();

  // ---------- store orders + insights ----------
  openOrders = () => this.push('orders');
  openStoreStats = () => this.push('storeStats');
  advanceOrder = (id) => () => { const o=this.state.orders.find(x=>x.id===id); if(!o||o.status==='shipped') return; const nx=o.status==='new'?'paid':'shipped';
    this.setState(s=>({ orders:s.orders.map(x=>x.id===id?Object.assign({},x,{status:nx}):x) })); this.flashToast(nx==='paid'?'Marked paid ✓':'Marked shipped ✓'); };

  // ---------- automation templates ----------
  flowTemplates(){ if(this._ft) return this._ft; this._ft=[
    { id:'comment_dm', name:'Comment → DM link', icon:'comment', desc:'When someone comments a keyword, DM them your link privately.', trigger:{type:'comment',config:{scope:'All posts',kw:['link','price']}}, steps:[ {type:'private_reply',config:{text:'Sent it to your DMs 💌'}}, {type:'send_link',config:{text:"Here's the link 👉",url:'dslabs.in/serum'}} ] },
    { id:'welcome_dm', name:'Welcome new DMs', icon:'dm', desc:'Greet first-time DMs in your brand voice, automatically.', trigger:{type:'dm',config:{kw:[]}}, steps:[ {type:'first_time',config:{}}, {type:'ai_reply',config:{tone:'Warm'}} ] },
    { id:'link_delivery', name:'Link delivery', icon:'link2', desc:'Anyone who asks for the link gets it instantly in their DMs.', trigger:{type:'dm',config:{kw:['link','buy','shop']}}, steps:[ {type:'send_link',config:{text:'Here you go 👉',url:'dslabs.in'}}, {type:'add_tag',config:{tag:'link-sent'}} ] },
    { id:'lead_capture', name:'Lead form capture', icon:'mail', desc:'Qualify buyers, then capture their email for 10% off.', trigger:{type:'dm',config:{kw:['price','cost','order']}}, steps:[ {type:'intent',config:{val:'Buyer'}}, {type:'ask_email',config:{text:'Drop your email for 10% off 👇'}}, {type:'set_status',config:{val:'Hot'}} ] },
    { id:'story_reply', name:'Story-reply autoresponder', icon:'reply', desc:'Auto-thank anyone who replies to your story.', trigger:{type:'story_reply',config:{}}, steps:[ {type:'send_dm',config:{text:'Thanks for the love! 🥹'}}, {type:'add_tag',config:{tag:'advocate'}} ] },
  ]; return this._ft; }
  openTemplates = () => this.push('templates');
  useTemplate = (tid) => () => { const t=this.flowTemplates().find(x=>x.id===tid); if(!t) return; const id=Date.now();
    const trigger=t.trigger?{uid:++this._uid,type:t.trigger.type,config:Object.assign({},t.trigger.config)}:null;
    const steps=t.steps.map(st=>({uid:++this._uid,type:st.type,config:Object.assign({},st.config)}));
    const f={ id, name:t.name, active:false, runs:'Draft · from template', trigger, steps };
    this.setState(s=>({ flows:s.flows.concat([f]), activeFlowId:id, route:'builder' })); this.flashToast('Template added ✓'); };

  // ---------- guard center ----------
  openGuard = () => this.push('guard');
  setGuardSeg = (k) => () => this.setState({ guardSeg:k });
  _dropFlagged(id){ this.setState(s=>({ flagged:s.flagged.map(f=>f.id===id?Object.assign({},f,{st:'gone'}):f) })); setTimeout(()=>this.setState(s=>({ flagged:s.flagged.filter(f=>f.id!==id) })),300); }
  hideFlagged = (id) => () => { this._dropFlagged(id); this.flashToast('Comment hidden ✓'); };
  allowFlagged = (id) => () => { this._dropFlagged(id); this.flashToast('Marked safe'); };
  blockFlagged = (id) => () => { const f=this.state.flagged.find(x=>x.id===id); if(!f) return;
    const entry={ userId:'u_'+id, username:f.handle, initials:f.initials, reason: f.category==='hate'?'Hate speech':f.category==='spam'?'Spam / f4f':f.category==='sexual'?'Sexual content':'Troll / abuse', ts:'just now' };
    this.setState(s=>({ blocklist:[entry].concat(s.blocklist) })); this._dropFlagged(id); this.flashToast(f.handle+' blocked'); };
  toggleGuardRule = (k) => () => this.setState(s=>({ guardRules:Object.assign({},s.guardRules,{[k]:!s.guardRules[k]}) }));
  setKwDraft = (e) => this.setState({ kwDraft:e.target.value });
  addBlockKw = () => { const v=this.state.kwDraft.trim(); if(!v) return; this.setState(s=>({ blockKeywords:s.blockKeywords.concat([v]), kwDraft:'' })); };
  addBlockKwKey = (e) => { if(e.key==='Enter'){ e.preventDefault(); this.addBlockKw(); } };
  removeBlockKw = (i) => () => this.setState(s=>{ const a=s.blockKeywords.slice(); a.splice(i,1); return { blockKeywords:a }; });
  unblock = (userId) => () => { this.setState(s=>({ blocklist:s.blocklist.filter(b=>b.userId!==userId) })); this.flashToast('Unblocked'); };""")

# pop(): return add-product back to catalog (routes are flat otherwise)
repl(
 "  pop = () => { if(this.state.route==='storefront' && this.state.sfProduct){ this.setState({sfProduct:null}); return; }",
 "  pop = () => { if(this.state.route==='storefront' && this.state.sfProduct){ this.setState({sfProduct:null}); return; } if(this.state.route==='addProduct'){ this.setState({route:'catalog'}); return; }")

# ───────────────────────── 3. renderVals computed block ─────────────────────────
VM = """    // ── guard center ──
    const catCol2={ hate:['color-mix(in srgb,var(--st-blocked) 14%,transparent)','var(--st-blocked)'], threats:['color-mix(in srgb,var(--st-blocked) 14%,transparent)','var(--st-blocked)'], spam:['color-mix(in srgb,var(--st-warm) 16%,transparent)','var(--st-warm)'], troll:['color-mix(in srgb,var(--purple) 15%,transparent)',PUR], sexual:['color-mix(in srgb,var(--st-blocked) 12%,transparent)','#c98a9b'] };
    const guardSegs=[['flagged','Flagged'],['rules','Auto-flag'],['blocklist','Blocklist']].map(g=>{ const on=s.guardSeg===g[0]; return { label:g[1], set:this.setGuardSeg(g[0]), bg:on?'var(--bg-elev)':'transparent', fg:on?A:'var(--text-muted)', sh:on?'var(--shadow-card)':'none' }; });
    const flaggedCards=s.flagged.map(f=>{ const cc=catCol2[f.category]||catCol2.troll; return { id:f.id, name:f.name, handle:f.handle, initials:f.initials, av:f.av, text:f.text, ts:f.ts, kindLabel:f.kind==='dm'?'DM':'Comment', catLabel:f.category, tagbg:cc[0], tagfg:cc[1], sevLabel:f.severity, tone:f.tone, signal:f.signal, opacity:f.st==='gone'?'0':'1', hide:this.hideFlagged(f.id), block:this.blockFlagged(f.id), allow:this.allowFlagged(f.id) }; });
    const guardRuleRows=[['hate','Hate speech','Slurs, harassment, attacks'],['spam','Spam / f4f','Bots, follow-for-follow, link spam'],['sexual','Sexual content','Explicit or unsolicited'],['threats','Threats','Violence or intimidation']].map(r=>{ const on=s.guardRules[r[0]]; return { label:r[1], sub:r[2], toggle:this.toggleGuardRule(r[0]), trackbg:on?A:'var(--border-strong)', knob:on?'translateX(19px)':'translateX(0)' }; });
    const blockChips=s.blockKeywords.map((k,i)=>({ label:k, remove:this.removeBlockKw(i) }));
    const blockedUsers=s.blocklist.map(b=>({ username:b.username, initials:b.initials, reason:b.reason, ts:b.ts, unblock:this.unblock(b.userId) }));
    // ── automation templates ──
    const templates=this.flowTemplates().map(t=>{ const trig=defs.map[t.trigger.type]; const chipDefs=[{label:trig?trig.label:'No trigger',cat:'trigger'}].concat(t.steps.slice(0,3).map(st=>({label:defs.map[st.type].label,cat:defs.map[st.type].cat}))); if(t.steps.length>3) chipDefs.push({label:'+'+(t.steps.length-3),cat:'more'});
      const chips=chipDefs.map((c,i)=>{ const cc=catCol[c.cat]||catCol.action; return { label:c.label, fg:cc[0], bg:cc[1], arrow:i<chipDefs.length-1 }; });
      return { id:t.id, name:t.name, desc:t.desc, icon:this.nodeIcon(t.icon,20), chips, use:this.useTemplate(t.id) }; });
    // ── store orders ──
    const ordStatus={ new:['var(--accent-soft)','var(--accent-deep)','Mark paid'], paid:['color-mix(in srgb,var(--st-warm) 16%,transparent)','var(--st-warm)','Mark shipped'], shipped:['color-mix(in srgb,var(--st-done) 14%,transparent)','var(--st-done)',''] };
    const orders=s.orders.map(o=>{ const st=ordStatus[o.status]||ordStatus.new; return { id:o.id, customer:o.customer, handle:o.handle, initials:o.initials, av:o.av, product:o.product, amount:o.amount, ts:o.ts, statusLabel:o.status, stbg:st[0], stfg:st[1], ctaLabel:st[2], hasCta:!!st[2], done:o.status==='shipped', advance:this.advanceOrder(o.id) }; });
    const ordNew=s.orders.filter(o=>o.status==='new').length;
    const ordRevenue=s.orders.reduce((a,o)=>a+(parseInt(o.amount.replace(/[^0-9]/g,''))||0),0);
    const orderSummary={ open:String(ordNew), total:String(s.orders.length), revenue:'₹'+ordRevenue.toLocaleString('en-IN') };
    // ── store insights ──
    const storeStatCards=[ {label:'Shop views',value:'8,420',delta:'+14% this week',dcol:'var(--st-done)'},{label:'Revenue',value:'₹62.4k',delta:'+₹9.1k',dcol:'var(--st-done)'},{label:'Orders',value:String(s.orders.length),delta:ordNew+' new',dcol:A},{label:'Conversion',value:'4.8%',delta:'+0.6 pts',dcol:'var(--st-done)'} ];
    const topRaw=[['Vitamin C Glow Serum',42,A],['SPF 50 Daily Shield',31,'var(--st-done)'],['Niacinamide 10% Drops',24,WARM],['Ceramide Moisturiser',15,PUR]]; const tmax=Math.max.apply(null,topRaw.map(x=>x[1]));
    const topProducts=topRaw.map(x=>({ label:x[0], n:x[1], w:Math.round(x[1]/tmax*100)+'%', col:x[2] }));
    // ── expanded analytics ──
    const growth=[ {label:'Followers',value:'18.4k',delta:'+312 this week',dcol:'var(--st-done)'},{label:'Reach',value:'124k',delta:'+18% vs last',dcol:'var(--st-done)'},{label:'Profile views',value:'5,820',delta:'+9%',dcol:'var(--st-done)'} ];
    const handledN=1584, needsN=18, splitTot=handledN+needsN;
    const coverageSplit={ handled:String(handledN), needs:String(needsN), handledPct:Math.round(handledN/splitTot*100)+'%', needsPct:Math.round(needsN/splitTot*100)+'%' };
    // ── add product ──
    const newProduct={ name:s.npName, price:s.npPrice, subtitle:s.npSubtitle, desc:s.npDesc, available:s.npAvailable, setName:this.setNp('npName'), setPrice:this.setNp('npPrice'), setSubtitle:this.setNp('npSubtitle'), setDesc:this.setNp('npDesc'), toggleAvail:this.toggleNpAvail, avTrack:s.npAvailable?A:'var(--border-strong)', avKnob:s.npAvailable?'translateX(19px)':'translateX(0)', save:this.saveProduct, mono:(s.npName.replace(/[^A-Za-z]/g,'').slice(0,2)||'PR').toUpperCase() };
"""
insert_after("    const routeTitles={ contacts:'Contacts',", "")  # ensure anchor exists
s = s.replace("    const routeTitles={ contacts:'Contacts',", VM + "    const routeTitles={ contacts:'Contacts',", 1)

# ───────────────────────── 4. route registries ─────────────────────────
repl("builder:cf?cf.name:'Flow' };",
     "builder:cf?cf.name:'Flow', guard:'Guard Center', templates:'Templates', orders:'Orders', storeStats:'Store insights', addProduct:'Add product' };")

repl("s.route==='storefront'?(sfp?'Shop':'Home'):'Home',",
     "s.route==='storefront'?(sfp?'Shop':'Home'): s.route==='templates'?'Automations': s.route==='addProduct'?'Catalog':'Home',")

repl("rBuilder:s.route==='builder', rStorefront:s.route==='storefront',",
     "rBuilder:s.route==='builder', rStorefront:s.route==='storefront', rGuard:s.route==='guard', rTemplates:s.route==='templates', rOrders:s.route==='orders', rStoreStats:s.route==='storeStats', rAddProduct:s.route==='addProduct',")

# ───────────────────────── 5. return object new keys ─────────────────────────
repl("      catalog, catInStock, catFeatured, addProduct:this.addProduct,",
 "      catalog, catInStock, catFeatured, addProduct:this.addProduct,\n"
 "      guardSegs, gSegFlagged:s.guardSeg==='flagged', gSegRules:s.guardSeg==='rules', gSegBlock:s.guardSeg==='blocklist', flaggedCards, guardRuleRows, blockChips, blockedUsers, guardFlaggedCount:s.flagged.length, openGuard:this.openGuard, kwDraft:s.kwDraft, setKwDraft:this.setKwDraft, addBlockKw:this.addBlockKw, addBlockKwKey:this.addBlockKwKey,\n"
 "      templates, openTemplates:this.openTemplates,\n"
 "      orders, orderSummary, openOrders:this.openOrders,\n"
 "      storeStatCards, topProducts, openStoreStats:this.openStoreStats,\n"
 "      growth, coverageSplit, newProduct, openAddProduct:this.openAddProduct,")

# ───────────────────────── 6. jumpDefs: Guard Center on Home ─────────────────────────
repl(
 "      {label:'Analytics',meta:'+12% this week',go:()=>this.push('analytics'),icon:this.ic('<path d=\"M4 19V5M4 19h16\"/><path d=\"M8 16v-4M13 16V8M18 16v-6\"/>',17)},\n    ];",
 "      {label:'Analytics',meta:'+12% this week',go:()=>this.push('analytics'),icon:this.ic('<path d=\"M4 19V5M4 19h16\"/><path d=\"M8 16v-4M13 16V8M18 16v-6\"/>',17)},\n"
 "      {label:'Guard Center',meta:s.flagged.length+' flagged',go:()=>this.push('guard'),icon:this.ic('<path d=\"M12 2 4 5v6c0 5 3.4 8.5 8 10 4.6-1.5 8-5 8-10V5l-8-3Z\"/>',17)},\n    ];")

# ───────────────────────── 7. MARKUP: analytics growth + split (prepend into analytics scroll) ─────────────────────────
AN_ANCHOR = '<!-- ANALYTICS -->\n        <sc-if value="{{ rAnalytics }}" hint-placeholder-val="{{ false }}">\n        <div class="scroll" style="flex:1;overflow-y:auto;padding:16px 18px 30px;">\n'
AN_CARDS = """          <div style="font-size:11.5px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--text-subtle);margin:2px 6px 8px;">Account growth</div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:11px;">
            <sc-for list="{{ growth }}" as="g" hint-placeholder-count="3">
              <div style="border:1px solid var(--border);background:var(--bg-elev);box-shadow:var(--shadow-card);border-radius:15px;padding:12px;">
                <div style="font-size:9.5px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:var(--text-subtle);">{{ g.label }}</div>
                <div style="font-size:20px;font-weight:800;letter-spacing:-.03em;margin-top:5px;">{{ g.value }}</div>
                <div style="font-size:10px;font-weight:600;color:{{ g.dcol }};margin-top:3px;">{{ g.delta }}</div>
              </div>
            </sc-for>
          </div>
          <div style="border:1px solid var(--border);background:var(--bg-elev);box-shadow:var(--shadow-card);border-radius:16px;padding:16px;margin-top:13px;margin-bottom:3px;">
            <div style="font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--text-subtle);margin-bottom:11px;">Comments handled vs needs you</div>
            <div style="display:flex;height:14px;border-radius:7px;overflow:hidden;background:var(--bg-inset);">
              <div style="width:{{ coverageSplit.handledPct }};background:var(--st-done);"></div>
              <div style="width:{{ coverageSplit.needsPct }};background:var(--st-warm);"></div>
            </div>
            <div style="display:flex;justify-content:space-between;margin-top:10px;font-size:12px;">
              <span style="color:var(--text-muted);"><b style="color:var(--st-done);">{{ coverageSplit.handled }}</b> handled by Mira</span>
              <span style="color:var(--text-muted);"><b style="color:var(--st-warm);">{{ coverageSplit.needs }}</b> need you</span>
            </div>
          </div>
"""
insert_after(AN_ANCHOR, AN_CARDS)

# ───────────────────────── 8. MARKUP: new route pages (before THREAD) ─────────────────────────
ROUTES = r"""
        <!-- GUARD CENTER -->
        <sc-if value="{{ rGuard }}" hint-placeholder-val="{{ false }}">
        <div style="flex:1;display:flex;flex-direction:column;min-height:0;">
          <div style="padding:12px 18px 10px;flex-shrink:0;">
            <div style="display:flex;gap:4px;background:var(--bg-inset);border-radius:11px;padding:3px;">
              <sc-for list="{{ guardSegs }}" as="g" hint-placeholder-count="3">
                <button onClick="{{ g.set }}" style="flex:1;height:34px;border:none;border-radius:8px;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;transition:all .18s;background:{{ g.bg }};color:{{ g.fg }};box-shadow:{{ g.sh }};">{{ g.label }}</button>
              </sc-for>
            </div>
          </div>
          <div class="scroll" style="flex:1;overflow-y:auto;padding:6px 18px 30px;">
            <sc-if value="{{ gSegFlagged }}" hint-placeholder-val="{{ true }}">
              <sc-for list="{{ flaggedCards }}" as="f" hint-placeholder-count="3">
                <div style="border:1px solid var(--border);background:var(--bg-elev);box-shadow:var(--shadow-card);border-radius:18px;padding:14px;margin-bottom:11px;opacity:{{ f.opacity }};transition:opacity .28s;">
                  <div style="display:flex;align-items:center;gap:10px;">
                    <div style="width:38px;height:38px;border-radius:50%;background:{{ f.av }};color:#fff;font-weight:700;font-size:13px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">{{ f.initials }}</div>
                    <div style="flex:1;min-width:0;"><div style="display:flex;align-items:center;gap:6px;"><span style="font-size:14px;font-weight:600;">{{ f.name }}</span><span style="font-size:11px;color:var(--text-subtle);">{{ f.ts }}</span></div><div style="font-size:11.5px;color:var(--text-subtle);">{{ f.handle }} · {{ f.kindLabel }}</div></div>
                    <div style="font-size:9.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;padding:4px 8px;border-radius:7px;background:{{ f.tagbg }};color:{{ f.tagfg }};flex-shrink:0;">{{ f.catLabel }}</div>
                  </div>
                  <div style="margin-top:11px;font-size:13px;line-height:1.4;color:var(--text-muted);background:var(--bg-inset);border-radius:11px;padding:9px 11px;">{{ f.text }}</div>
                  <div style="display:flex;gap:6px;margin-top:9px;">
                    <span style="font-size:10px;color:var(--text-subtle);background:var(--bg-inset);border-radius:6px;padding:3px 8px;">tone · {{ f.tone }}</span>
                    <span style="font-size:10px;color:var(--text-subtle);background:var(--bg-inset);border-radius:6px;padding:3px 8px;">signal · {{ f.signal }}</span>
                    <span style="font-size:10px;color:var(--text-subtle);background:var(--bg-inset);border-radius:6px;padding:3px 8px;">{{ f.sevLabel }}</span>
                  </div>
                  <div style="display:flex;gap:7px;margin-top:12px;">
                    <button onClick="{{ f.allow }}" style="flex:1;height:34px;border-radius:9px;border:1px solid var(--border);background:var(--bg);color:var(--text-muted);font-family:inherit;font-size:12.5px;font-weight:600;cursor:pointer;">Allow</button>
                    <button onClick="{{ f.hide }}" style="flex:1;height:34px;border-radius:9px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-family:inherit;font-size:12.5px;font-weight:600;cursor:pointer;">Hide</button>
                    <button onClick="{{ f.block }}" style="flex:1;height:34px;border-radius:9px;border:none;background:var(--st-blocked);color:#fff;font-family:inherit;font-size:12.5px;font-weight:600;cursor:pointer;">Block</button>
                  </div>
                </div>
              </sc-for>
            </sc-if>
            <sc-if value="{{ gSegRules }}" hint-placeholder-val="{{ false }}">
              <div style="font-size:11.5px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--text-subtle);margin:6px 6px 8px;">Auto-flag categories</div>
              <div style="border:1px solid var(--border);border-radius:15px;background:var(--bg-elev);overflow:hidden;">
                <sc-for list="{{ guardRuleRows }}" as="r" hint-placeholder-count="4">
                  <div style="display:flex;align-items:center;gap:12px;padding:13px 14px;border-bottom:1px solid var(--border);">
                    <div style="flex:1;"><div style="font-size:13.5px;font-weight:600;">{{ r.label }}</div><div style="font-size:11.5px;color:var(--text-subtle);">{{ r.sub }}</div></div>
                    <button onClick="{{ r.toggle }}" style="width:48px;height:29px;border-radius:999px;border:none;cursor:pointer;background:{{ r.trackbg }};position:relative;flex-shrink:0;transition:background .25s;padding:0;"><div style="position:absolute;top:3px;left:3px;width:23px;height:23px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.3);transform:{{ r.knob }};transition:transform .26s cubic-bezier(.3,1.4,.5,1);"></div></button>
                  </div>
                </sc-for>
              </div>
              <div style="font-size:11.5px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--text-subtle);margin:22px 6px 8px;">Keyword blocklist</div>
              <div style="border:1px solid var(--border);border-radius:15px;background:var(--bg-elev);padding:14px;">
                <div style="display:flex;flex-wrap:wrap;gap:7px;margin-bottom:11px;">
                  <sc-for list="{{ blockChips }}" as="cp" hint-placeholder-count="3">
                    <div style="display:flex;align-items:center;gap:6px;height:32px;padding:0 6px 0 12px;border-radius:9px;background:var(--accent-soft);color:var(--accent-deep);font-size:13px;font-weight:600;">{{ cp.label }}<button onClick="{{ cp.remove }}" style="width:18px;height:18px;border-radius:50%;border:none;background:color-mix(in srgb,var(--accent) 22%,transparent);color:var(--accent-deep);cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button></div>
                  </sc-for>
                </div>
                <div style="display:flex;gap:8px;"><input value="{{ kwDraft }}" onInput="{{ setKwDraft }}" onKeyDown="{{ addBlockKwKey }}" placeholder="Block a word + Enter" style="flex:1;border:1px solid var(--border);background:var(--bg);border-radius:11px;padding:10px 13px;font-family:inherit;font-size:14px;color:var(--text);outline:none;" /><button onClick="{{ addBlockKw }}" style="width:44px;border-radius:11px;border:1px solid var(--border);background:var(--bg-inset);color:var(--accent);cursor:pointer;display:flex;align-items:center;justify-content:center;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></button></div>
              </div>
            </sc-if>
            <sc-if value="{{ gSegBlock }}" hint-placeholder-val="{{ false }}">
              <sc-for list="{{ blockedUsers }}" as="b" hint-placeholder-count="2">
                <div style="display:flex;align-items:center;gap:11px;padding:11px 6px;border-bottom:1px solid var(--border);">
                  <div style="width:42px;height:42px;border-radius:50%;background:var(--bg-inset);color:var(--text-subtle);font-weight:700;font-size:14px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">{{ b.initials }}</div>
                  <div style="flex:1;min-width:0;"><div style="font-size:14.5px;font-weight:600;">{{ b.username }}</div><div style="font-size:12px;color:var(--text-muted);margin-top:2px;">{{ b.reason }} · {{ b.ts }}</div></div>
                  <button onClick="{{ b.unblock }}" style="height:32px;padding:0 14px;border-radius:9px;border:1px solid var(--border);background:var(--bg-elev);color:var(--accent);font-family:inherit;font-size:12.5px;font-weight:600;cursor:pointer;flex-shrink:0;">Unblock</button>
                </div>
              </sc-for>
            </sc-if>
          </div>
        </div>
        </sc-if>

        <!-- TEMPLATES -->
        <sc-if value="{{ rTemplates }}" hint-placeholder-val="{{ false }}">
        <div class="scroll" style="flex:1;overflow-y:auto;padding:14px 18px 30px;">
          <div style="font-size:13px;color:var(--text-muted);margin:0 4px 12px;line-height:1.45;">Start from a prebuilt flow — tap Use template to drop it into the builder.</div>
          <sc-for list="{{ templates }}" as="t" hint-placeholder-count="5">
            <div style="border:1px solid var(--border);background:var(--bg-elev);box-shadow:var(--shadow-card);border-radius:16px;padding:14px;margin-bottom:11px;">
              <div style="display:flex;gap:12px;align-items:flex-start;">
                <div style="width:38px;height:38px;border-radius:11px;background:var(--accent-soft);color:var(--accent-deep);display:flex;align-items:center;justify-content:center;flex-shrink:0;">{{ t.icon }}</div>
                <div style="flex:1;min-width:0;"><div style="font-size:14.5px;font-weight:700;">{{ t.name }}</div><div style="font-size:12px;color:var(--text-muted);margin-top:2px;line-height:1.4;">{{ t.desc }}</div></div>
              </div>
              <div class="scroll" style="display:flex;align-items:center;gap:5px;margin-top:11px;overflow-x:auto;">
                <sc-for list="{{ t.chips }}" as="cp" hint-placeholder-count="3">
                  <div style="display:flex;align-items:center;gap:5px;flex-shrink:0;">
                    <span style="font-size:10.5px;font-weight:600;padding:4px 9px;border-radius:7px;background:{{ cp.bg }};color:{{ cp.fg }};white-space:nowrap;">{{ cp.label }}</span>
                    <sc-if value="{{ cp.arrow }}" hint-placeholder-val="{{ true }}"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--text-subtle)" stroke-width="2.4" stroke-linecap="round"><path d="m9 6 6 6-6 6"/></svg></sc-if>
                  </div>
                </sc-for>
              </div>
              <button onClick="{{ t.use }}" style="width:100%;margin-top:13px;height:38px;border-radius:11px;border:none;background:var(--accent);color:#fff;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;">Use template<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="m9 6 6 6-6 6"/></svg></button>
            </div>
          </sc-for>
        </div>
        </sc-if>

        <!-- ORDERS -->
        <sc-if value="{{ rOrders }}" hint-placeholder-val="{{ false }}">
        <div class="scroll" style="flex:1;overflow-y:auto;padding:14px 18px 30px;">
          <div style="display:flex;gap:10px;margin-bottom:14px;">
            <div style="flex:1;border-radius:15px;border:1px solid var(--border);background:var(--bg-elev);box-shadow:var(--shadow-card);padding:11px 12px;"><div style="font-size:9.5px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:var(--text-subtle);">New</div><div style="font-size:21px;font-weight:800;letter-spacing:-.03em;color:var(--accent);margin-top:2px;">{{ orderSummary.open }}</div></div>
            <div style="flex:1;border-radius:15px;border:1px solid var(--border);background:var(--bg-elev);box-shadow:var(--shadow-card);padding:11px 12px;"><div style="font-size:9.5px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:var(--text-subtle);">Orders</div><div style="font-size:21px;font-weight:800;letter-spacing:-.03em;margin-top:2px;">{{ orderSummary.total }}</div></div>
            <div style="flex:1;border-radius:15px;border:1px solid var(--border);background:var(--bg-elev);box-shadow:var(--shadow-card);padding:11px 12px;"><div style="font-size:9.5px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:var(--text-subtle);">Revenue</div><div style="font-size:21px;font-weight:800;letter-spacing:-.03em;color:var(--st-done);margin-top:2px;">{{ orderSummary.revenue }}</div></div>
          </div>
          <sc-for list="{{ orders }}" as="o" hint-placeholder-count="5">
            <div style="border:1px solid var(--border);background:var(--bg-elev);box-shadow:var(--shadow-card);border-radius:16px;padding:14px;margin-bottom:11px;">
              <div style="display:flex;align-items:center;gap:11px;">
                <div style="width:40px;height:40px;border-radius:50%;background:{{ o.av }};color:#fff;font-weight:700;font-size:13px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">{{ o.initials }}</div>
                <div style="flex:1;min-width:0;"><div style="font-size:14.5px;font-weight:600;">{{ o.customer }}</div><div style="font-size:12px;color:var(--text-subtle);">{{ o.product }}</div></div>
                <div style="text-align:right;flex-shrink:0;"><div style="font-size:15px;font-weight:800;letter-spacing:-.02em;">{{ o.amount }}</div><div style="font-size:10.5px;color:var(--text-subtle);margin-top:1px;">{{ o.ts }}</div></div>
              </div>
              <div style="display:flex;align-items:center;gap:8px;margin-top:12px;">
                <span style="font-size:9.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;padding:5px 9px;border-radius:7px;background:{{ o.stbg }};color:{{ o.stfg }};">{{ o.statusLabel }}</span>
                <sc-if value="{{ o.hasCta }}" hint-placeholder-val="{{ true }}"><button onClick="{{ o.advance }}" style="margin-left:auto;height:32px;padding:0 14px;border-radius:9px;border:none;background:var(--accent);color:#fff;font-family:inherit;font-size:12.5px;font-weight:600;cursor:pointer;">{{ o.ctaLabel }}</button></sc-if>
                <sc-if value="{{ o.done }}" hint-placeholder-val="{{ false }}"><span style="margin-left:auto;font-size:12px;font-weight:700;color:var(--st-done);">✓ Shipped</span></sc-if>
              </div>
            </div>
          </sc-for>
        </div>
        </sc-if>

        <!-- STORE INSIGHTS -->
        <sc-if value="{{ rStoreStats }}" hint-placeholder-val="{{ false }}">
        <div class="scroll" style="flex:1;overflow-y:auto;padding:16px 18px 30px;">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:11px;">
            <sc-for list="{{ storeStatCards }}" as="c" hint-placeholder-count="4">
              <div style="border:1px solid var(--border);background:var(--bg-elev);box-shadow:var(--shadow-card);border-radius:15px;padding:14px;">
                <div style="font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--text-subtle);">{{ c.label }}</div>
                <div style="font-size:26px;font-weight:800;letter-spacing:-.03em;margin-top:5px;">{{ c.value }}</div>
                <div style="font-size:11px;font-weight:600;color:{{ c.dcol }};margin-top:3px;">{{ c.delta }}</div>
              </div>
            </sc-for>
          </div>
          <div style="border:1px solid var(--border);background:var(--bg-elev);box-shadow:var(--shadow-card);border-radius:16px;padding:16px;margin-top:13px;">
            <div style="font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--text-subtle);margin-bottom:13px;">Top products</div>
            <sc-for list="{{ topProducts }}" as="i" hint-placeholder-count="4">
              <div style="display:flex;align-items:center;gap:9px;margin-bottom:10px;">
                <span style="width:120px;font-size:12px;color:var(--text-muted);flex-shrink:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">{{ i.label }}</span>
                <div style="flex:1;height:8px;border-radius:5px;background:var(--bg-inset);overflow:hidden;"><div style="height:100%;width:{{ i.w }};background:{{ i.col }};border-radius:5px;"></div></div>
                <span style="font-size:11.5px;font-weight:700;width:24px;text-align:right;">{{ i.n }}</span>
              </div>
            </sc-for>
          </div>
        </div>
        </sc-if>

        <!-- ADD PRODUCT -->
        <sc-if value="{{ rAddProduct }}" hint-placeholder-val="{{ false }}">
        <div class="scroll" style="flex:1;overflow-y:auto;padding:18px 18px 30px;">
          <div style="display:flex;align-items:center;gap:13px;margin-bottom:18px;">
            <div style="width:60px;height:60px;border-radius:16px;background:linear-gradient(150deg,var(--accent-soft),color-mix(in srgb,var(--accent) 6%,var(--bg-inset)));color:var(--accent-deep);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:20px;flex-shrink:0;">{{ newProduct.mono }}</div>
            <div style="font-size:13px;color:var(--text-muted);line-height:1.45;">Add a product to your catalog. It appears in your storefront and Mira can recommend it in DMs.</div>
          </div>
          <div style="font-size:11.5px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--text-subtle);margin:0 4px 7px;">Name</div>
          <input value="{{ newProduct.name }}" onInput="{{ newProduct.setName }}" placeholder="Vitamin C Glow Serum" style="width:100%;border:1px solid var(--border);background:var(--bg-elev);border-radius:12px;padding:12px 14px;font-family:inherit;font-size:15px;color:var(--text);outline:none;" />
          <div style="display:flex;gap:11px;margin-top:14px;">
            <div style="flex:1;"><div style="font-size:11.5px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--text-subtle);margin:0 4px 7px;">Price</div><input value="{{ newProduct.price }}" onInput="{{ newProduct.setPrice }}" placeholder="₹1,299" style="width:100%;border:1px solid var(--border);background:var(--bg-elev);border-radius:12px;padding:12px 14px;font-family:inherit;font-size:15px;color:var(--text);outline:none;" /></div>
            <div style="flex:1;"><div style="font-size:11.5px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--text-subtle);margin:0 4px 7px;">Subtitle</div><input value="{{ newProduct.subtitle }}" onInput="{{ newProduct.setSubtitle }}" placeholder="Brightening · 15%" style="width:100%;border:1px solid var(--border);background:var(--bg-elev);border-radius:12px;padding:12px 14px;font-family:inherit;font-size:15px;color:var(--text);outline:none;" /></div>
          </div>
          <div style="font-size:11.5px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--text-subtle);margin:14px 4px 7px;">Description</div>
          <textarea rows="4" onInput="{{ newProduct.setDesc }}" placeholder="A lightweight serum that…" style="width:100%;border:1px solid var(--border);background:var(--bg-elev);border-radius:12px;padding:12px 14px;font-family:inherit;font-size:15px;color:var(--text);outline:none;resize:none;line-height:1.45;">{{ newProduct.desc }}</textarea>
          <div style="display:flex;align-items:center;gap:12px;margin-top:16px;border:1px solid var(--border);background:var(--bg-elev);border-radius:14px;padding:14px;">
            <div style="flex:1;"><div style="font-size:14px;font-weight:600;">In stock</div><div style="font-size:12px;color:var(--text-subtle);">Show as available in the shop</div></div>
            <button onClick="{{ newProduct.toggleAvail }}" style="width:48px;height:29px;border-radius:999px;border:none;cursor:pointer;background:{{ newProduct.avTrack }};position:relative;flex-shrink:0;transition:background .25s;padding:0;"><div style="position:absolute;top:3px;left:3px;width:23px;height:23px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.3);transform:{{ newProduct.avKnob }};transition:transform .26s cubic-bezier(.3,1.4,.5,1);"></div></button>
          </div>
          <button onClick="{{ newProduct.save }}" style="width:100%;margin-top:20px;height:52px;border:none;border-radius:15px;background:var(--accent);color:#fff;font-family:inherit;font-size:16px;font-weight:700;cursor:pointer;box-shadow:0 10px 24px -10px color-mix(in srgb,var(--accent) 80%,transparent);">Add product</button>
        </div>
        </sc-if>

"""
assert s.count('<!-- THREAD -->') == 1
s = s.replace('        <!-- THREAD -->', ROUTES + '        <!-- THREAD -->', 1)

# ───────────────────────── 9. MARKUP: Templates button in Automations header (wrap newFlow btn) ─────────────────────────
nf = '<button onClick="{{ newFlow }}"'
i = s.index(nf)
j = s.index('</button>', i) + len('</button>')
newflow_btn = s[i:j]
templates_btn = '<button onClick="{{ openTemplates }}" style="height:40px;padding:0 14px;border-radius:12px;border:1px solid var(--border);background:var(--bg-elev);color:var(--text);font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;flex-shrink:0;">Templates</button>'
wrapped = '<div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">' + templates_btn + newflow_btn + '</div>'
s = s[:i] + wrapped + s[j:]

# ───────────────────────── 10. MARKUP: Home "Your store" Orders + Insights buttons ─────────────────────────
oc = 'onClick="{{ openCatalog }}"'
i = s.index(oc)
j = s.index('</button>', i) + len('</button>')
store_row = """
            <div style="display:flex;gap:11px;margin-top:11px;">
              <button onClick="{{ openOrders }}" style="flex:1;text-align:left;border:none;border-radius:16px;cursor:pointer;font-family:inherit;background:var(--bg-elev);box-shadow:0 1px 3px rgba(20,21,26,.05);padding:14px 15px;transition:transform .12s;" style-active="transform:scale(.99)"><div style="font-size:16px;font-weight:700;">Orders</div><div style="font-size:12.5px;color:var(--text-subtle);margin-top:1px;">{{ orderSummary.open }} new</div></button>
              <button onClick="{{ openStoreStats }}" style="flex:1;text-align:left;border:none;border-radius:16px;cursor:pointer;font-family:inherit;background:var(--bg-elev);box-shadow:0 1px 3px rgba(20,21,26,.05);padding:14px 15px;transition:transform .12s;" style-active="transform:scale(.99)"><div style="font-size:16px;font-weight:700;">Insights</div><div style="font-size:12.5px;color:var(--text-subtle);margin-top:1px;">Views · revenue</div></button>
            </div>"""
s = s[:j] + store_row + s[j:]

assert s != orig, "no changes applied"
open(P, 'w').write(s)
print(f"patched OK — {len(orig)} -> {len(s)} chars (+{len(s)-len(orig)})")
