#!/usr/bin/env python3
# Replicate Mira WEB automation logic in the mobile builder:
# exact 4 triggers + 9 node types (no conditions/AI/carousel/etc.), web NODE_DEFAULTS,
# validation (max/trigger constraints), comment_post auto-seed, rebuilt flows + templates.
import os, shutil
D = os.path.dirname(__file__)
P = os.path.join(D, '..', 'design', 'Mira.dc.html')
shutil.copy(P, os.path.join(D, 'verification-misc', 'Mira.dc.html.pre-webauto'))
s = open(P).read()
orig = s


def rep(old, new, n=1):
    global s
    c = s.count(old)
    assert c == n, f'expected {n}x {old[:55]!r}, got {c}'
    s = s.replace(old, new, n)


def js(t):  # raw text -> JS double-quoted literal
    return '"' + t.replace('\\', '\\\\').replace('"', '\\"').replace('\n', '\\n') + '"'


# ---- web NODE_DEFAULTS (verbatim) ----
OPENING = "Hey! 👋 Thanks for commenting — sending you the details right now!"
TM = "Here's what you asked for 👇\n[paste your link or content here]\n\nLet me know if you need anything! 😊"
AF = 'Hey! 👋 To get exclusive access, follow @[username] first 💜\n\nOnce you do, reply "done" and I\'ll send it right over!'
FG = 'Hey! 👋 This content is for our community 💜\n\nFollow @[username] to unlock it — once you do, reply "done" and I\'ll send it right over! 🙏'
LF = "What's the best email to send this to? 📩"
FU = "Hey! 👋 Just checking in — did you get a chance to look at what I sent?"
CR = "Just sent you a DM 📩 Check your inbox!"
DELAYS = "['1 min','5 min','10 min','15 min','30 min','1 hour','2 hours','3 hours','6 hours','12 hours','23.5 hours']"

# ============ 1. nodeIcon: add chat / image / userplus ============
rep('nodeIcon(key,sz){ const M={\n    comment:',
    'nodeIcon(key,sz){ const M={\n'
    '    chat:\'<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9.5h8M8 12.5h5"/>\',\n'
    '    image:\'<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.6"/><path d="m4 18 5-5 3.5 3.5L16 13l4 4"/>\',\n'
    '    userplus:\'<circle cx="9" cy="8" r="3.4"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0"/><path d="M18 8v6M15 11h6"/>\',\n'
    '    comment:')

# ============ 2. nodeDefs L array (web catalog) ============
T = "T"
A = "A"
L = []
# triggers
L.append("{t:'comment_post',cat:T,label:'New comment',sub:'comment_post',icon:'comment',"
         "fields:[{key:'scope',label:'Which posts',kind:'select',opts:['All posts','Specific posts']},{key:'kw',label:'Only if the comment contains',kind:'chips'}],"
         "sum:c=>c.kw&&c.kw.length?'Comment contains \"'+c.kw.join('\", \"')+'\"':'Any comment · '+(c.scope||'All posts')}")
L.append("{t:'dm',cat:T,label:'New DM',sub:'dm',icon:'dm',"
         "fields:[{key:'kw',label:'Only if the message contains',kind:'chips'}],"
         "sum:c=>c.kw&&c.kw.length?'DM contains \"'+c.kw.join('\", \"')+'\"':'Any new direct message'}")
L.append("{t:'live_comment',cat:T,label:'Live comment',sub:'live_comment',icon:'live',"
         "fields:[{key:'kw',label:'Only if the comment contains',kind:'chips'}],"
         "sum:c=>c.kw&&c.kw.length?'Live comment contains \"'+c.kw.join('\", \"')+'\"':'Any comment on your live'}")
L.append("{t:'story_reply',cat:T,label:'Story reply',sub:'story_reply',icon:'reply',fields:[],"
         "sum:()=>'Someone replies to your story'}")
# nodes (all cat A = buildable; max / triggers / notTriggers enforce web validation)
L.append("{t:'opening_message',cat:A,label:'Opening message',sub:'First DM',icon:'dm',max:1,"
         "fields:[{key:'text',label:'Message',kind:'area',ph:" + js(OPENING) + "}],defaults:{text:" + js(OPENING) + "},"
         "sum:c=>c.text||'Send the opening DM'}")
L.append("{t:'comment_reply',cat:A,label:'Comment reply',sub:'Public reply',icon:'reply',max:1,triggers:['comment_post','live_comment'],"
         "fields:[{key:'text',label:'Reply text',kind:'area',ph:" + js(CR) + "}],defaults:{text:" + js(CR) + "},"
         "sum:c=>c.text||'Reply under the comment'}")
L.append("{t:'follow_gate',cat:A,label:'Follow gate',sub:'Skip if following · ask if not',icon:'usercheck',max:1,"
         "fields:[{key:'text',label:'Gate message',kind:'area',ph:" + js(FG) + "}],defaults:{text:" + js(FG) + "},"
         "sum:c=>'Gate until they follow you'}")
L.append("{t:'ask_follow',cat:A,label:'Ask for follow',sub:'Always asks',icon:'userplus',max:1,"
         "fields:[{key:'text',label:'Message',kind:'area',ph:" + js(AF) + "},{key:'buttons',label:'Button labels',kind:'chips'}],defaults:{text:" + js(AF) + "},"
         "sum:c=>'Ask them to follow first'}")
L.append("{t:'text_message',cat:A,label:'Text message',sub:'Link, info or any text',icon:'chat',"
         "fields:[{key:'text',label:'Message',kind:'area',ph:" + js(TM) + "},{key:'buttons',label:'Button labels',kind:'chips'}],defaults:{text:" + js(TM) + "},"
         "sum:c=>c.text||'Send a text message'}")
L.append("{t:'card_message',cat:A,label:'Card message',sub:'Image · title · button',icon:'cards',"
         "fields:[{key:'imageUrl',label:'Image URL',kind:'text',ph:'https://…'},{key:'title',label:'Title',kind:'text'},{key:'subtitle',label:'Subtitle',kind:'text'},{key:'buttons',label:'Button labels',kind:'chips'}],defaults:{},"
         "sum:c=>c.title?'Card · '+c.title:'Send a rich card'}")
L.append("{t:'image_message',cat:A,label:'Image message',sub:'DM attachment',icon:'image',"
         "fields:[{key:'imageUrl',label:'Image URL',kind:'text',ph:'https://…'}],defaults:{},"
         "sum:c=>'Send an image via DM'}")
L.append("{t:'lead_form',cat:A,label:'Lead form',sub:'Capture a reply',icon:'mail',max:1,"
         "fields:[{key:'text',label:'Question',kind:'area',ph:" + js(LF) + "}],defaults:{text:" + js(LF) + "},"
         "sum:c=>c.text||'Ask for their email'}")
L.append("{t:'followup_message',cat:A,label:'Follow-up message',sub:'Delayed send',icon:'clock',max:1,notTriggers:['live_comment'],"
         "fields:[{key:'delay',label:'Send after',kind:'select',opts:" + DELAYS + "},{key:'text',label:'Message',kind:'area',ph:" + js(FU) + "}],defaults:{delay:'1 hour',text:" + js(FU) + "},"
         "sum:c=>'Follow up after '+(c.delay||'1 hour')}")

NEW_L = "const L=[\n      " + ",\n      ".join(L) + "\n    ];"

# replace old L array (bounded by 'const L=[' .. '\n    ];')
la = s.index('const L=[')
lb = s.index('\n    ];', la) + len('\n    ];')
s = s[:la] + NEW_L + s[lb:]

# ============ 3. picker vm: one filtered node list, web descriptions ============
OLD_PICK = s[s.index("if(bs&&bs.kind==='picker'){ const isTrig"):]
OLD_PICK = OLD_PICK[:OLD_PICK.index("picker={ title:isTrig?'Choose a trigger':'Add a step', groups };\n    }") + len("picker={ title:isTrig?'Choose a trigger':'Add a step', groups };\n    }")]
NEW_PICK = (
    "if(bs&&bs.kind==='picker'){ const isTrig=bs.mode==='trigger';\n"
    "      const _cf=cf, _ttype=_cf&&_cf.trigger?_cf.trigger.type:null, _cnt={}; if(_cf){ _cf.steps.forEach(x=>{_cnt[x.type]=(_cnt[x.type]||0)+1;}); }\n"
    "      const avail=d=>{ if(d.triggers && !d.triggers.includes(_ttype)) return false; if(d.notTriggers && d.notTriggers.includes(_ttype)) return false; if(d.max!=null && (_cnt[d.t]||0)>=d.max) return false; return true; };\n"
    "      const mkNode=d=>({ label:d.label, desc:d.sub||'', icon:this.nodeIcon(d.icon,18), pick:this.pickNode(d.t), col:catColor(d.cat)[0], bg:catColor(d.cat)[1] });\n"
    "      const groups= isTrig? [{title:'', hasTitle:false, nodes:defs.triggers.map(mkNode)}]\n"
    "        : [{title:'', hasTitle:false, nodes:defs.actions.filter(avail).map(mkNode)}];\n"
    "      picker={ title:isTrig?'Choose a trigger':'Add a step', groups };\n    }")
s = s.replace(OLD_PICK, NEW_PICK, 1)

# ============ 4. pickNode: auto-seed comment_post ============
rep("if(bs.mode==='trigger'){ this._updateFlow(f=>Object.assign({},f,{trigger:node})); }",
    "if(bs.mode==='trigger'){ this._updateFlow(f=>{ let nf=Object.assign({},f,{trigger:node}); "
    "if(t==='comment_post'){ const have=new Set(nf.steps.map(x=>x.type)); const add=[]; "
    "if(!have.has('comment_reply')) add.push(this._newNode(this.nodeDefs().map.comment_reply)); "
    "if(!have.has('opening_message')) add.push(this._newNode(this.nodeDefs().map.opening_message)); "
    "if(add.length) nf=Object.assign({},nf,{steps:add.concat(nf.steps)}); } return nf; }); }")

# ============ 5. newFlow: blank comment_post automation, auto-seeded ============
rep("newFlow = () => { const id=Date.now(); const f={id,name:'Untitled flow',active:false,runs:'Not run yet',trigger:null,steps:[]}; this.setState(s=>({flows:s.flows.concat([f]),activeFlowId:id})); this.push('builder'); };",
    "newFlow = () => { const id=Date.now(); const mk=(t)=>this._newNode(this.nodeDefs().map[t]); "
    "const f={id,name:'Untitled automation',active:false,runs:'Draft · not live',trigger:mk('comment_post'),steps:[mk('comment_reply'),mk('opening_message')]}; "
    "this.setState(s=>({flows:s.flows.concat([f]),activeFlowId:id})); this.push('builder'); };")

# ============ 6. seeded flows (real web nodes) ============
NEW_FLOWS = (
    "    flows: [\n"
    "      { id:1, name:'Comment → DM link', active:true, runs:'1,204 runs · 2m ago',\n"
    "        trigger:{uid:1,type:'comment_post',config:{scope:'All posts',kw:['link','price']}},\n"
    "        steps:[ {uid:2,type:'comment_reply',config:{text:" + js(CR) + "}}, {uid:3,type:'opening_message',config:{text:" + js(OPENING) + "}}, {uid:4,type:'text_message',config:{text:\"Here's the link 👉 dslabs.in/serum\"}} ] },\n"
    "      { id:2, name:'Welcome new DMs', active:true, runs:'318 runs · 18m ago',\n"
    "        trigger:{uid:5,type:'dm',config:{kw:[]}},\n"
    "        steps:[ {uid:6,type:'opening_message',config:{text:'Hey! 👋 Thanks for the message — how can I help?'}} ] },\n"
    "      { id:3, name:'Story reply → thanks', active:true, runs:'92 runs · 1h ago',\n"
    "        trigger:{uid:7,type:'story_reply',config:{}},\n"
    "        steps:[ {uid:8,type:'opening_message',config:{text:'Thank you for the love! 🥹 means the world'}} ] },\n"
    "      { id:4, name:'Follow to unlock', active:false, runs:'Draft · not live',\n"
    "        trigger:{uid:9,type:'comment_post',config:{scope:'All posts',kw:['free','guide']}},\n"
    "        steps:[ {uid:10,type:'comment_reply',config:{text:" + js(CR) + "}}, {uid:11,type:'opening_message',config:{text:" + js(OPENING) + "}}, {uid:12,type:'follow_gate',config:{text:" + js(FG) + "}}, {uid:13,type:'text_message',config:{text:'Here you go 👉 dslabs.in/free-guide'}} ] },\n"
    "      { id:5, name:'Lead capture', active:false, runs:'Draft · not live',\n"
    "        trigger:{uid:14,type:'dm',config:{kw:['price','buy']}},\n"
    "        steps:[ {uid:15,type:'opening_message',config:{text:" + js(OPENING) + "}}, {uid:16,type:'lead_form',config:{text:" + js(LF) + "}}, {uid:17,type:'followup_message',config:{delay:'1 hour',text:" + js(FU) + "}} ] },\n"
    "    ],")
fa = s.index('    flows: [')
fb = s.index('    ],\n    contacts:', fa) + len('    ],')
s = s[:fa] + NEW_FLOWS + s[fb:]

# ============ 7. flowTemplates (real web nodes) ============
NEW_FT = (
    "flowTemplates(){ if(this._ft) return this._ft; this._ft=[\n"
    "    { id:'comment_dm', name:'Comment → DM link', icon:'comment', desc:'When someone comments a keyword, reply publicly then DM them your link.', trigger:{type:'comment_post',config:{scope:'All posts',kw:['link','price']}}, steps:[ {type:'comment_reply',config:{text:" + js(CR) + "}}, {type:'opening_message',config:{text:" + js(OPENING) + "}}, {type:'text_message',config:{text:\"Here's the link 👉 dslabs.in/serum\"}} ] },\n"
    "    { id:'welcome_dm', name:'Welcome new DMs', icon:'dm', desc:'Greet first-time DMs the moment they land.', trigger:{type:'dm',config:{kw:[]}}, steps:[ {type:'opening_message',config:{text:'Hey! 👋 Thanks for the message — how can I help?'}} ] },\n"
    "    { id:'follow_unlock', name:'Follow to unlock', icon:'usercheck', desc:'Make them follow you before you send the content.', trigger:{type:'comment_post',config:{scope:'All posts',kw:['free','guide']}}, steps:[ {type:'comment_reply',config:{text:" + js(CR) + "}}, {type:'opening_message',config:{text:" + js(OPENING) + "}}, {type:'follow_gate',config:{text:" + js(FG) + "}}, {type:'text_message',config:{text:'Here you go 👉 dslabs.in/free-guide'}} ] },\n"
    "    { id:'lead_capture', name:'Lead capture', icon:'mail', desc:'Collect an email, then follow up automatically.', trigger:{type:'dm',config:{kw:['price','buy']}}, steps:[ {type:'opening_message',config:{text:" + js(OPENING) + "}}, {type:'lead_form',config:{text:" + js(LF) + "}}, {type:'followup_message',config:{delay:'1 hour',text:" + js(FU) + "}} ] },\n"
    "    { id:'story_thanks', name:'Story reply → thanks', icon:'reply', desc:'Send a warm thank-you when someone replies to your story.', trigger:{type:'story_reply',config:{}}, steps:[ {type:'opening_message',config:{text:'Thank you for the love! 🥹 means the world'}} ] },\n"
    "  ]; return this._ft; }")
ta = s.index('flowTemplates(){')
tb = s.index('return this._ft; }', ta) + len('return this._ft; }')
s = s[:ta] + NEW_FT + s[tb:]

assert s != orig
open(P, 'w').write(s)
print(f'webauto patched -- {len(orig)} -> {len(s)} chars')
