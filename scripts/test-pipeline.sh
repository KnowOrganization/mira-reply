#!/usr/bin/env bash
# Professional pipeline test — multiple comments from same account
#
# Run in TWO terminals:
#   Terminal 1 (watch): curl -N "http://localhost:3000/api/ig/stream" | grep --line-buffered .
#   Terminal 2 (test):  bash scripts/test-pipeline.sh
#
# OR just run this script — it forks an SSE watcher and prints events inline.

BASE="${1:-http://localhost:3000}"

# Fixed same-account identity
USER_ID="test_sameaccount_$(date +%s)"
USERNAME="spoodormon_test"

R='\033[0;31m'; G='\033[0;32m'; Y='\033[1;33m'; B='\033[0;34m'; M='\033[0;35m'; NC='\033[0m'

log() { echo -e "${B}[test]${NC} $*"; }
ok()  { echo -e "${G}[ok]${NC}   $*"; }
warn(){ echo -e "${Y}[warn]${NC} $*"; }
err() { echo -e "${R}[err]${NC}  $*"; }

# ── SSE watcher in background ──────────────────────────────────────────────
SSE_LOG=$(mktemp)
curl -sN "$BASE/api/ig/stream" 2>/dev/null \
  | while IFS= read -r line; do
      [[ "$line" == data:* ]] || continue
      raw="${line#data: }"
      type=$(echo "$raw" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("type","?"))' 2>/dev/null)
      case "$type" in
        log)
          level=$(echo "$raw" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("level","?"))' 2>/dev/null)
          msg=$(echo "$raw" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("msg","?"))' 2>/dev/null)
          ts=$(date +%H:%M:%S)
          case "$level" in
            info)  echo -e "  ${G}[log:info]${NC}  $ts  $msg" | tee -a "$SSE_LOG" ;;
            warn)  echo -e "  ${Y}[log:warn]${NC}  $ts  $msg" | tee -a "$SSE_LOG" ;;
            error) echo -e "  ${R}[log:err]${NC}   $ts  $msg" | tee -a "$SSE_LOG" ;;
          esac
          ;;
        draft) echo -e "  ${M}[draft]${NC}     $(date +%H:%M:%S)  new draft queued" | tee -a "$SSE_LOG" ;;
        sent)  echo -e "  ${G}[sent]${NC}      $(date +%H:%M:%S)  reply sent" | tee -a "$SSE_LOG" ;;
        comment) echo -e "  ${B}[comment]${NC}   $(date +%H:%M:%S)  comment received" | tee -a "$SSE_LOG" ;;
      esac
    done &
SSE_PID=$!
trap "kill $SSE_PID 2>/dev/null; rm -f $SSE_LOG" EXIT

sleep 0.5  # let SSE connect

# ── Inject helper ──────────────────────────────────────────────────────────
DRAFT_COUNT=0

inject() {
  local step="$1" text="$2" post_id="${3:-}"
  local body
  if [ -n "$post_id" ]; then
    body=$(python3 -c "import json; print(json.dumps({'text':'$text','fromUserId':'$USER_ID','fromUsername':'$USERNAME','postId':'$post_id'}))" 2>/dev/null)
  else
    body=$(python3 -c "import json; print(json.dumps({'text':'$(echo "$text" | sed "s/'/\\\\'/g")','fromUserId':'$USER_ID','fromUsername':'$USERNAME'}))" 2>/dev/null)
  fi
  local resp
  resp=$(curl -sf -X POST "$BASE/api/ig/inject" \
    -H "Content-Type: application/json" \
    -d "$body" 2>/dev/null)
  local fid
  fid=$(echo "$resp" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("id","ERR"))' 2>/dev/null)
  echo ""
  echo -e "${Y}─── STEP $step ──────────────────────────────────────────────${NC}"
  echo -e "  comment : \"$text\""
  echo -e "  userId  : $USER_ID (same for all)"
  echo -e "  fakeId  : $fid"
}

snap() {
  local new_drafts
  new_drafts=$(curl -sf "$BASE/api/ig/status" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("pendingCount",0))' 2>/dev/null)
  if [ "$new_drafts" -gt "$DRAFT_COUNT" ] 2>/dev/null; then
    local diff=$((new_drafts - DRAFT_COUNT))
    ok "+$diff draft(s) created  (total pending: $new_drafts)"
    DRAFT_COUNT=$new_drafts
  else
    warn "no new drafts  (pending: ${new_drafts:-?})"
  fi
}

# ── Header ─────────────────────────────────────────────────────────────────
echo ""
echo -e "${G}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${G}║     MIRA — same-account multi-comment live test          ║${NC}"
echo -e "${G}╚══════════════════════════════════════════════════════════╝${NC}"
echo -e "  account  : @$USERNAME  ($USER_ID)"
echo -e "  mode     : $(curl -sf "$BASE/api/ig/status" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("replyMode","?"))' 2>/dev/null)"
echo -e "  cooldown : 60 min  (only fires in auto/balanced mode after real sends)"
echo ""

# ═══════════════════════════════════════════════════════════════════════════
inject "1" "bro this is fire 🔥🔥🔥"
sleep 8; snap

inject "2" "😍😍😍"
sleep 6; snap

inject "3" "what bike is this? looks sick"
sleep 12; snap

inject "4" "love your content man"
# ↑ same-account simple ack again — in shadow mode: both get processed
# in auto mode: 2nd would be suppressed by 60-min cooldown
sleep 8; snap

inject "5" "can you drop the link to that gear bro"
sleep 14; snap

inject "6" "amazing 🙌"
sleep 6; snap

# ═══════════════════════════════════════════════════════════════════════════
echo ""
echo -e "${G}─── FINAL STATUS ────────────────────────────────────────────${NC}"
curl -sf "$BASE/api/ig/status" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print(f\"  pending drafts : {d.get('pendingCount')}\")
print(f\"  history count  : {d.get('historyCount')}\")
print(f\"  reply mode     : {d.get('replyMode')}\")
" 2>/dev/null

echo ""
echo -e "${Y}─── WHAT EACH STEP SHOULD DO (shadow mode) ─────────────────${NC}"
echo "  step 1: praise     → simple_acknowledgement → draft reply"
echo "  step 2: emoji-only → react path (no LLM) → single emoji draft"
echo "  step 3: question   → question_general → draft answer"
echo "  step 4: simple ack → draft (NO cooldown in shadow — history never written)"
echo "  step 5: link req   → link_request → public reply + DM text drafted"
echo "  step 6: emoji ack  → react or simple_ack → draft"
echo ""
echo -e "${R}─── TO TEST COOLDOWN (same-account block) ───────────────────${NC}"
echo "  1. Switch mode to 'auto' in UI settings"
echo "  2. Inject a real question (gets sent → history written)"
echo "  3. Within 60 min, inject a simple ack from same userId"
echo "  4. Step 3 should log: 'Cooldown skip (ack)'"
echo ""
