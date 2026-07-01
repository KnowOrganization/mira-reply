#!/usr/bin/env python3
# Wire the doc's Google sign-in + sign-out to native RN (postMessage). When not
# in a WebView (web preview) the mock flow stays. Asserted + backup.
import shutil
SRC = "/Users/danyaldev/Desktop/Shaiz/apps/mobile/design/Mira.dc.html"
BAK = "/Users/danyaldev/Desktop/Shaiz/apps/mobile/scripts/verification-misc/Mira.dc.html.pre-backend1b"
s = open(SRC).read()
shutil.copyfile(SRC, BAK); print("backed up ->", BAK)

def rep(old, new, n=1):
    global s
    c = s.count(old); assert c == n, f"expected {n} got {c} for <<{old[:60]}>>"
    s = s.replace(old, new)

# signIn → native (ponytail: on user-cancel the button stays 'Redirecting…' until
# app reload; acceptable, RN remounts on success).
rep(
  "  signIn = () => { if(this.state.gBusy) return; this.setState({gBusy:true}); setTimeout(()=>this.setState({gBusy:false,stage:'intro',introSlide:0}),900); };",
  "  signIn = () => { if(this.state.gBusy) return; this.setState({gBusy:true}); if(window.ReactNativeWebView){ window.ReactNativeWebView.postMessage(JSON.stringify({type:'signin'})); return; } setTimeout(()=>this.setState({gBusy:false,stage:'intro',introSlide:0}),900); };"
)

# signOut → native clear + remount
rep(
  "  signOut = () => { this.closeSettings(); setTimeout(()=>this.setState({stage:'app',tab:'home',route:null,routeOpen:false}),300); };",
  "  signOut = () => { this.closeSettings(); if(window.ReactNativeWebView){ setTimeout(()=>window.ReactNativeWebView.postMessage(JSON.stringify({type:'signout'})),300); return; } setTimeout(()=>this.setState({stage:'app',tab:'home',route:null,routeOpen:false}),300); };"
)

open(SRC, "w").write(s); print("patched OK, len", len(s))
