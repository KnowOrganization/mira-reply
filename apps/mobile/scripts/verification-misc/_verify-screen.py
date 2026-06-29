import sys, shutil, os
# args: route (or 'home'/'auto' tab) -> writes design/Mira.dc.html from .clean with boot-into override
target = sys.argv[1]
P='design/Mira.dc.html'; C=P+'.clean'
s=open(C).read()
s=s.replace("theme: 'light', stage: 'signin'","theme: 'light', stage: 'app'",1)
if target in ('home','auto','opps','inbox'):
    s=s.replace("    tab: 'home', route: null,",f"    tab: '{target}', route: null,",1)
else:
    s=s.replace("    tab: 'home', route: null,",f"    tab: 'home', route: '{target}',",1)
open(P,'w').write(s)
print('boot ->', target)
