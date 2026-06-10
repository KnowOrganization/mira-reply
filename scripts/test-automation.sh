#!/usr/bin/env bash
# test-automation.sh — test automation (ManyChat-style link DM) with multiple
# comments from same account.
#
# Run in TWO terminals:
#   Terminal 1: curl -N "http://localhost:3000/api/ig/stream" | grep --line-buffered .
#   Terminal 2: bash scripts/test-automation.sh <POST_ID>
#
# POST_ID: the IG post ID that has an active automation configured.
# Example:  bash scripts/test-automation.sh 17908245222199072

BASE="${1:-http://localhost:3000}"
POST_ID="${2:-}"   # pass as 2nd arg or set below
KEYWORD="${3:-}"   # pass as 3rd arg — must match automation keyword

G='\033[0;32m'; Y='\033[1;33m'; R='\033[0;31m'; B='\033[0;34m'; M='\033[0;35m'; NC='\033[0m'

# ── Fetch active automations to guide user ────────────────────────────────
echo ""
echo -e "${G}════ Active automations ════════════════════════════════════${NC}"
curl -sf "$BASE/api/ig/automations" 2>/dev/null | python3 -c "
import sys,json
d=json.load(sys.stdin)
autos=d.get('automations',d) if isinstance(d,dict) else d
if not isinstance(autos,list): autos=[]
for a in autos:
    en='✅' if a.get('enabled') else '❌'
    pids=a.get('trigger',{}).get('postIds',[])
    kws=[n.get('data',{}).get('keyword','') for n in a.get('nodes',[]) if n.get('type')=='trigger']
    print(f\"  {en} [{a.get('id')}] '{a.get('name')}'\")
    print(f\"     postIds : {pids}\")
    print(f\"     keywords: {kws}\")
" 2>/dev/null || echo "  (could not fetch automations — check /api/ig/automations endpoint)"
echo ""

if [ -z "$POST_ID" ]; then
  echo -e "${Y}Usage: bash scripts/test-automation.sh <base_url> <post_id> <keyword>${NC}"
  echo -e "  Example: bash scripts/test-automation.sh http://localhost:3000 17908245222199072 link"
  echo ""
  echo -e "${R}Set POST_ID and KEYWORD to match your automation config above.${NC}"
  exit 1
fi

# ── Fixed same-account identity ───────────────────────────────────────────
USER_A="test_userA_$(date +%s)"   # account A — main tester
USER_B="test_userB_$(date +%s)"   # account B — second user (cross-check)
USERNAME_A="testuser_alpha"
USERNAME_B="testuser_beta"

echo -e "${G}════ Test config ════════════════════════════════════════════${NC}"
echo "  POST_ID   : $POST_ID"
echo "  KEYWORD   : ${KEYWORD:-<not set — will test without keyword match>}"
echo "  User A    : @$USERNAME_A ($USER_A)"
echo "  User B    : @$USERNAME_B ($USER_B)"
echo ""

# ── SSE watcher ───────────────────────────────────────────────────────────
curl -sN "$BASE/api/ig/stream" 2>/dev/null \
  | while IFS= read -r line; do
      [[ "$line" == data:* ]] || continue
      raw="${line#data: }"
      type=$(echo "$raw" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("type","?"))' 2>/dev/null)
      level=$(echo "$raw" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("level",""))' 2>/dev/null)
      msg=$(echo "$raw" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("msg",""))' 2>/dev/null)
      ts=$(date +%H:%M:%S)
      case "$type" in
        log)
          case "$level" in
            info)  echo -e "  ${G}[info]${NC}  $ts  $msg" ;;
            warn)  echo -e "  ${Y}[warn]${NC}  $ts  $msg" ;;
            error) echo -e "  ${R}[err]${NC}   $ts  $msg" ;;
          esac ;;
        comment) echo -e "  ${B}[comment]${NC} $ts  comment received" ;;
        sent)    echo -e "  ${G}[SENT]${NC}    $ts  reply sent ✓" ;;
        draft)   echo -e "  ${M}[draft]${NC}   $ts  draft queued" ;;
      esac
    done &
SSE_PID=$!
trap "kill $SSE_PID 2>/dev/null" EXIT
sleep 0.5

inject() {
  local label="$1" uid="$2" uname="$3" text="$4"
  local body
  body=$(python3 -c "
import json
print(json.dumps({
  'text': '$text',
  'fromUserId': '$uid',
  'fromUsername': '$uname',
  'postId': '$POST_ID'
}))")
  local resp
  resp=$(curl -sf -X POST "$BASE/api/ig/inject" -H "Content-Type: application/json" -d "$body" 2>/dev/null)
  local fid
  fid=$(echo "$resp" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("id","ERR"))' 2>/dev/null)
  echo ""
  echo -e "${Y}─── $label ───────────────────────────────────────────────────${NC}"
  echo -e "  user    : @$uname  ($uid)"
  echo -e "  comment : \"$text\""
  echo -e "  fakeId  : $fid"
}

# ═══════════════════════════════════════════════════════════════════════════
# TEST 1: User A — keyword comment → should trigger automation
inject "TEST 1 — User A keyword comment" "$USER_A" "$USERNAME_A" "${KEYWORD:-link}"
sleep 8

# TEST 2: User A — keyword comment AGAIN (same account, same post)
# Expected: automation fires again OR dedup blocks it
inject "TEST 2 — User A same keyword again (same account)" "$USER_A" "$USERNAME_A" "${KEYWORD:-link}"
sleep 8

# TEST 3: User A — non-keyword comment
# Expected: no automation match → falls to pipeline (or ignored)
inject "TEST 3 — User A non-keyword comment" "$USER_A" "$USERNAME_A" "awesome content bro"
sleep 6

# TEST 4: User B — keyword comment (different account)
# Expected: fresh automation run, no state bleed from User A
inject "TEST 4 — User B keyword comment (different account)" "$USER_B" "$USERNAME_B" "${KEYWORD:-link}"
sleep 8

# TEST 5: User A — keyword a 3rd time
# Expected: dedup should suppress OR re-enter (depends on user_states)
inject "TEST 5 — User A keyword 3rd time" "$USER_A" "$USERNAME_A" "i want the ${KEYWORD:-link} please"
sleep 8

echo ""
echo -e "${G}════ Final DB state ═════════════════════════════════════════${NC}"
sqlite3 /Users/danyaldev/Desktop/Shaiz/data/shaiz.db "
SELECT igsid, state, comment_id, datetime(updated_at/1000,'unixepoch') as updated
FROM user_states
WHERE post_id='$POST_ID'
ORDER BY updated_at DESC LIMIT 10;
" 2>/dev/null | python3 -c "
import sys
rows=sys.stdin.read().strip()
if rows:
    print('  user_states for this post:')
    for r in rows.split('\n'):
        print(f'    {r}')
else:
    print('  (no user_states rows for this post)')
"

sqlite3 /Users/danyaldev/Desktop/Shaiz/data/shaiz.db "
SELECT comment_id, igsid, datetime(replied_at/1000,'unixepoch') as at
FROM processed_comments
ORDER BY replied_at DESC LIMIT 10;
" 2>/dev/null | python3 -c "
import sys
rows=sys.stdin.read().strip()
if rows:
    print('  processed_comments (recent):')
    for r in rows.split('\n'):
        print(f'    {r}')
else:
    print('  processed_comments: (empty)')
"

echo ""
echo -e "${Y}─── What to verify ──────────────────────────────────────────${NC}"
echo "  TEST 1 : automation matched + button DM sent to User A"
echo "  TEST 2 : same user same post — check user_states UPSERT behavior"
echo "           (state resets to awaiting_tap — second trigger resets flow)"
echo "  TEST 3 : no keyword match — no automation — pipeline or skip"
echo "  TEST 4 : User B gets fresh independent flow, no bleed from User A"
echo "  TEST 5 : User A 3rd time — user_states updated again (same row)"
echo ""
