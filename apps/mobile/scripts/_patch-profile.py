#!/usr/bin/env python3
# Strong Profile page: real tab (was opening settings sheet), live data from
# session user + /me + /orgs + /brain/status + /status + /profile. Edit name,
# change email, disconnect IG, sign out. Asserted + backup.
import shutil
SRC = "/Users/danyaldev/Desktop/Shaiz/apps/mobile/design/Mira.dc.html"
BAK = "/Users/danyaldev/Desktop/Shaiz/apps/mobile/scripts/verification-misc/Mira.dc.html.pre-profile"
s = open(SRC).read()
shutil.copyfile(SRC, BAK); print("backed up ->", BAK)

def rep(old, new, n=1):
    global s
    c = s.count(old); assert c == n, f"expected {n} got {c} for <<{old[:70]}>>"
    s = s.replace(old, new)

# ---- A. state ----
rep(
  "    loadingHome: false, loadingInbox: false, loadingFlows: false,\n  };",
  "    loadingHome: false, loadingInbox: false, loadingFlows: false,\n"
  "    sessionUser: null, me: null, orgs: [], brain: null, profileLoaded: false,\n"
  "    editName: false, editEmail: false, nameDraft: '', emailDraft: '',\n  };"
)

# ---- B. componentDidMount parses the injected session user ----
rep(
  "  componentDidMount(){ if(window.__MIRA_TOKEN) this.boot(); }",
  "  componentDidMount(){ try{ this.setState({sessionUser: JSON.parse(window.__MIRA_USER||'null')}); }catch(_){} if(window.__MIRA_TOKEN) this.boot(); }"
)

# ---- C. boot also loads profile ----
rep(
  "if(st.connected){ this.loadHome(); this.loadInbox(); this.loadFlows(); }",
  "if(st.connected){ this.loadHome(); this.loadInbox(); this.loadFlows(); this.loadProfile(); }"
)

# ---- D. handlers (after loadFlows definition) ----
rep(
  "  loadFlows = () => { this.setState({loadingFlows:true}); this.api('/api/ig/automations').then(r=>this.setState({flows:(r.automations||[]).map(this._mapFlow), loadingFlows:false})).catch(()=>this.setState({loadingFlows:false})); };\n",
  "  loadFlows = () => { this.setState({loadingFlows:true}); this.api('/api/ig/automations').then(r=>this.setState({flows:(r.automations||[]).map(this._mapFlow), loadingFlows:false})).catch(()=>this.setState({loadingFlows:false})); };\n"
  "  loadProfile = () => { Promise.all([ this.api('/api/ig/me').catch(()=>null), this.api('/api/ig/orgs').catch(()=>null), this.api('/api/ig/brain/status').catch(()=>null), this.api('/api/ig/profile').catch(()=>null) ]).then(([me,orgs,brain,prof])=>this.setState({ me:me||null, orgs:(orgs&&orgs.orgs)||[], brain:brain||null, profile:(prof&&prof.profile)||this.state.profile, profileLoaded:true })); };\n"
  "  _num = (n) => { n=Number(n)||0; if(n>=1e6) return (n/1e6).toFixed(1).replace(/\\.0$/,'')+'M'; if(n>=1e3) return (n/1e3).toFixed(1).replace(/\\.0$/,'')+'K'; return String(n); };\n"
  "  _date = (ms) => { try{ return new Date(Number(ms)).toLocaleDateString('en-US',{day:'numeric',month:'short',year:'numeric'}); }catch(_){ return '\\u2014'; } };\n"
  "  startEditName = () => this.setState({editName:true, nameDraft:(this.state.sessionUser&&this.state.sessionUser.name)||''});\n"
  "  onNameDraft = (e) => this.setState({nameDraft:e.target.value});\n"
  "  saveName = () => { const n=(this.state.nameDraft||'').trim(); if(!n){ this.setState({editName:false}); return; } this.setState(st=>({sessionUser:Object.assign({},st.sessionUser,{name:n}), editName:false})); if(window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify({type:'updateName',name:n})); this.flashToast('Name updated'); };\n"
  "  startEditEmail = () => this.setState({editEmail:true, emailDraft:(this.state.sessionUser&&this.state.sessionUser.email)||''});\n"
  "  onEmailDraft = (e) => this.setState({emailDraft:e.target.value});\n"
  "  saveEmail = () => { const em=(this.state.emailDraft||'').trim(); this.setState({editEmail:false}); if(!em||!/.+@.+\\..+/.test(em)){ this.flashToast('Enter a valid email'); return; } if(window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify({type:'changeEmail',email:em})); this.flashToast('Verification sent to '+em); };\n"
  "  disconnectIg = () => { if(this.state.live){ this.api('/api/ig/disconnect',{method:'POST'}).then(()=>{ this.flashToast('Instagram disconnected'); this.boot(); }).catch(()=>this.flashToast('Could not disconnect')); } else this.flashToast('Instagram disconnected'); };\n"
)

# ---- E. nav profile tab opens the page (was settings sheet) ----
rep("{k:'profile',go:this.openSettings,", "{k:'profile',go:this.setTab('profile'),")

# ---- F. renderVals: profileVM + return flags ----
rep(
  "    const jumps=jumpDefs.map((j,i)=>Object.assign({},j,{divider:i>0}));\n",
  "    const jumps=jumpDefs.map((j,i)=>Object.assign({},j,{divider:i>0}));\n"
  "    const su=s.sessionUser||{}; const acc=s.account; const prof=s.profile; const org=(s.orgs&&s.orgs[0])||{};\n"
  "    const pimg=su.image||(prof&&prof.avatarUrl)||''; const pname=su.name||(acc&&acc.username)||'Your account';\n"
  "    const cap=(x)=>String(x||'').replace(/^./,c=>c.toUpperCase());\n"
  "    const bReady=!!(s.brain&&s.brain.builtAt)||!!(dash&&Number(dash.facts)>=3);\n"
  "    const pf={ name:pname, email:su.email||'Not signed in', emailVerified:!!su.emailVerified, image:pimg, noImage:!pimg, initials:((String(pname).trim()[0])||'U').toUpperCase(),\n"
  "      handle:(acc&&acc.username)?('@'+acc.username):((prof&&prof.username)?('@'+prof.username):'\\u2014'), connected:!!acc, connDot:acc?'var(--st-done)':SUB, connLabel:acc?'Connected':'Not connected',\n"
  "      followers:prof?this._num(prof.followersCount):'\\u2014', following:prof?this._num(prof.followsCount):'\\u2014', posts:prof?this._num(prof.mediaCount):'\\u2014',\n"
  "      org:org.name||'\\u2014', planLabel:cap(org.plan||'free'), role:cap((s.me&&s.me.orgRole)||org.role||'\\u2014'),\n"
  "      connectedAt:(acc&&acc.connectedAt)?this._date(acc.connectedAt):'\\u2014', tokenExp:(acc&&acc.tokenExpiresAt)?this._date(acc.tokenExpiresAt):'\\u2014',\n"
  "      facts:(s.brain&&s.brain.factCount!=null)?s.brain.factCount:(dd&&dd.knowledge&&dd.knowledge.total)||0, brainLabel:bReady?'Ready':'Building', brainCol:bReady?'var(--st-done)':WARM,\n"
  "      replyMode:cap(s.replyMode||'assisted'),\n"
  "      editName:s.editName, notEditName:!s.editName, nameDraft:s.nameDraft, editEmail:s.editEmail, notEditEmail:!s.editEmail, emailDraft:s.emailDraft,\n"
  "      startEditName:this.startEditName, onNameDraft:this.onNameDraft, saveName:this.saveName, startEditEmail:this.startEditEmail, onEmailDraft:this.onEmailDraft, saveEmail:this.saveEmail,\n"
  "      disconnect:this.disconnectIg, signOut:this.signOut, openSettings:this.openSettings };\n"
)
rep(
  "      isHome:s.tab==='home', isInbox:s.tab==='inbox', isOpps:s.tab==='opps', isAuto:s.tab==='auto',\n",
  "      isHome:s.tab==='home', isInbox:s.tab==='inbox', isOpps:s.tab==='opps', isAuto:s.tab==='auto', isProfile:s.tab==='profile', pf,\n"
)

# ---- G. markup: profile tab block before the TAB BAR ----
PROFILE = '''        <!-- ---- PROFILE ---- -->
        <sc-if value="{{ isProfile }}" hint-placeholder-val="{{ false }}">
        <div style="position:absolute;inset:0;display:flex;flex-direction:column;">
          <div class="scroll" style="flex:1;overflow-y:auto;padding:60px 18px 130px;">
            <div style="font-size:26px;font-weight:600;letter-spacing:-.03em;padding:4px 4px 14px;">Profile</div>
            <div style="display:flex;flex-direction:column;align-items:center;gap:11px;padding:4px 0 20px;">
              <div style="width:88px;height:88px;border-radius:50%;overflow:hidden;display:flex;align-items:center;justify-content:center;background:linear-gradient(150deg,var(--accent),var(--accent-deep));color:#fff;font-size:32px;font-weight:500;box-shadow:0 10px 28px -10px var(--accent);">
                <sc-if value="{{ pf.image }}" hint-placeholder-val="{{ false }}"><img src="{{ pf.image }}" style="width:100%;height:100%;object-fit:cover;" /></sc-if>
                <sc-if value="{{ pf.noImage }}" hint-placeholder-val="{{ true }}">{{ pf.initials }}</sc-if>
              </div>
              <div style="text-align:center;">
                <div style="font-size:20px;font-weight:600;letter-spacing:-.02em;">{{ pf.name }}</div>
                <div style="font-size:13px;color:var(--text-muted);margin-top:4px;display:flex;align-items:center;justify-content:center;gap:6px;"><span style="width:6px;height:6px;border-radius:50%;background:{{ pf.connDot }};"></span>{{ pf.handle }} \\u00b7 {{ pf.connLabel }}</div>
              </div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:11px;margin-bottom:18px;">
              <div style="border:1px solid var(--border);background:var(--bg-elev);border-radius:15px;padding:13px 8px;text-align:center;box-shadow:var(--shadow-card);"><div style="font-size:20px;font-weight:600;letter-spacing:-.02em;">{{ pf.followers }}</div><div style="font-size:11px;color:var(--text-subtle);margin-top:2px;">Followers</div></div>
              <div style="border:1px solid var(--border);background:var(--bg-elev);border-radius:15px;padding:13px 8px;text-align:center;box-shadow:var(--shadow-card);"><div style="font-size:20px;font-weight:600;letter-spacing:-.02em;">{{ pf.following }}</div><div style="font-size:11px;color:var(--text-subtle);margin-top:2px;">Following</div></div>
              <div style="border:1px solid var(--border);background:var(--bg-elev);border-radius:15px;padding:13px 8px;text-align:center;box-shadow:var(--shadow-card);"><div style="font-size:20px;font-weight:600;letter-spacing:-.02em;">{{ pf.posts }}</div><div style="font-size:11px;color:var(--text-subtle);margin-top:2px;">Posts</div></div>
            </div>
            <div style="font-size:11px;font-weight:500;letter-spacing:.06em;color:var(--text-subtle);margin:6px 2px 9px;">Account</div>
            <div style="border:1px solid var(--border);border-radius:15px;background:var(--bg-elev);overflow:hidden;">
              <div style="padding:13px 14px;border-bottom:1px solid var(--border);">
                <div style="display:flex;align-items:center;gap:10px;">
                  <div style="flex:1;min-width:0;"><div style="font-size:11.5px;color:var(--text-subtle);">Email</div>
                    <sc-if value="{{ pf.notEditEmail }}" hint-placeholder-val="{{ true }}"><div style="font-size:14px;font-weight:500;margin-top:2px;display:flex;align-items:center;gap:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">{{ pf.email }}<sc-if value="{{ pf.emailVerified }}" hint-placeholder-val="{{ false }}"><span style="font-size:9.5px;color:var(--st-done);border:1px solid var(--st-done);border-radius:5px;padding:1px 5px;flex-shrink:0;">verified</span></sc-if></div></sc-if>
                  </div>
                  <sc-if value="{{ pf.notEditEmail }}" hint-placeholder-val="{{ true }}"><button onClick="{{ pf.startEditEmail }}" style="border:none;background:none;color:var(--accent);font-family:inherit;font-size:13px;font-weight:500;cursor:pointer;flex-shrink:0;">Change</button></sc-if>
                </div>
                <sc-if value="{{ pf.editEmail }}" hint-placeholder-val="{{ false }}">
                  <div style="display:flex;gap:8px;margin-top:9px;"><input value="{{ pf.emailDraft }}" onInput="{{ pf.onEmailDraft }}" placeholder="new@email.com" style="flex:1;min-width:0;border:1px solid var(--border);background:var(--bg);border-radius:11px;padding:9px 12px;font-family:inherit;font-size:14px;color:var(--text);outline:none;" /><button onClick="{{ pf.saveEmail }}" style="border:none;background:var(--accent);color:#fff;border-radius:11px;padding:0 16px;font-family:inherit;font-size:13.5px;font-weight:500;cursor:pointer;">Save</button></div>
                </sc-if>
              </div>
              <div style="padding:13px 14px;border-bottom:1px solid var(--border);">
                <div style="display:flex;align-items:center;gap:10px;">
                  <div style="flex:1;min-width:0;"><div style="font-size:11.5px;color:var(--text-subtle);">Display name</div>
                    <sc-if value="{{ pf.notEditName }}" hint-placeholder-val="{{ true }}"><div style="font-size:14px;font-weight:500;margin-top:2px;">{{ pf.name }}</div></sc-if>
                  </div>
                  <sc-if value="{{ pf.notEditName }}" hint-placeholder-val="{{ true }}"><button onClick="{{ pf.startEditName }}" style="border:none;background:none;color:var(--accent);font-family:inherit;font-size:13px;font-weight:500;cursor:pointer;flex-shrink:0;">Edit</button></sc-if>
                </div>
                <sc-if value="{{ pf.editName }}" hint-placeholder-val="{{ false }}">
                  <div style="display:flex;gap:8px;margin-top:9px;"><input value="{{ pf.nameDraft }}" onInput="{{ pf.onNameDraft }}" placeholder="Your name" style="flex:1;min-width:0;border:1px solid var(--border);background:var(--bg);border-radius:11px;padding:9px 12px;font-family:inherit;font-size:14px;color:var(--text);outline:none;" /><button onClick="{{ pf.saveName }}" style="border:none;background:var(--accent);color:#fff;border-radius:11px;padding:0 16px;font-family:inherit;font-size:13.5px;font-weight:500;cursor:pointer;">Save</button></div>
                </sc-if>
              </div>
              <div style="padding:13px 14px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px;">
                <div style="flex:1;"><div style="font-size:11.5px;color:var(--text-subtle);">Instagram</div><div style="font-size:14px;font-weight:500;margin-top:2px;">{{ pf.handle }}</div></div>
                <div style="text-align:right;"><div style="font-size:11.5px;color:var(--text-subtle);">Connected</div><div style="font-size:13px;font-weight:500;margin-top:2px;">{{ pf.connectedAt }}</div></div>
              </div>
              <div style="padding:13px 14px;display:flex;align-items:center;gap:10px;">
                <div style="flex:1;"><div style="font-size:11.5px;color:var(--text-subtle);">Workspace</div><div style="font-size:14px;font-weight:500;margin-top:2px;">{{ pf.org }}</div></div>
                <div style="text-align:right;"><div style="font-size:13px;font-weight:500;">{{ pf.planLabel }} \\u00b7 {{ pf.role }}</div></div>
              </div>
            </div>
            <div style="font-size:11px;font-weight:500;letter-spacing:.06em;color:var(--text-subtle);margin:18px 2px 9px;">Mira</div>
            <div style="border:1px solid var(--border);border-radius:15px;background:var(--bg-elev);overflow:hidden;">
              <button onClick="{{ pf.openSettings }}" style="width:100%;text-align:left;border:none;background:none;font-family:inherit;cursor:pointer;padding:13px 14px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px;">
                <div style="flex:1;"><div style="font-size:13.5px;font-weight:500;color:var(--text);">Reply mode</div><div style="font-size:11.5px;color:var(--text-subtle);margin-top:1px;">How Mira responds</div></div>
                <div style="font-size:13px;color:var(--text-muted);">{{ pf.replyMode }} \\u203a</div>
              </button>
              <div style="padding:13px 14px;display:flex;align-items:center;gap:10px;">
                <div style="flex:1;"><div style="font-size:13.5px;font-weight:500;color:var(--text);">Brain</div><div style="font-size:11.5px;color:var(--text-subtle);margin-top:1px;">{{ pf.facts }} facts learned</div></div>
                <div style="font-size:12px;font-weight:500;color:{{ pf.brainCol }};display:flex;align-items:center;gap:5px;"><span style="width:6px;height:6px;border-radius:50%;background:{{ pf.brainCol }};"></span>{{ pf.brainLabel }}</div>
              </div>
            </div>
            <button onClick="{{ pf.disconnect }}" style="width:100%;margin-top:18px;height:48px;border-radius:14px;border:1px solid var(--border);background:var(--bg-elev);color:var(--text);font-family:inherit;font-size:14.5px;font-weight:500;cursor:pointer;">Disconnect Instagram</button>
            <button onClick="{{ pf.signOut }}" style="width:100%;margin-top:10px;height:48px;border-radius:14px;border:1px solid var(--border);background:var(--bg-elev);color:var(--st-blocked);font-family:inherit;font-size:14.5px;font-weight:600;cursor:pointer;">Sign out</button>
          </div>
        </div>
        </sc-if>

'''
rep(
  '        <!-- ===== TAB BAR (Option C: floating sliding-capsule) ===== -->',
  PROFILE + '        <!-- ===== TAB BAR (Option C: floating sliding-capsule) ===== -->'
)

open(SRC, "w").write(s); print("patched OK, len", len(s))
