#!/usr/bin/env bash
# Canonical Mira launcher. Brings up the FULL stack so messaging works end-to-end:
#   api   :4000  — Elysia backend + Meta webhook receiver
#   worker        — BullMQ DM/comment/reconcile/outbound queues
#   web   :3000  — Next app (8GB heap; turbopack dev OOMs on the default ~4GB)
#   tunnel        — cloudflared named tunnel (stable dev.yourdomain.com) -> :3000
#                   (Meta MUST reach this; no tunnel = no DMs)
#
# Messaging brain = Claude SDK (Sonnet). NO ollama — do not start it.
#
# Why this script exists: the pipeline broke twice from orchestration gaps, not code —
# (1) tunnel never started -> Meta webhooks hit a dead domain; (2) web OOM-crashed.
# This starts everything, health-checks it, and auto-respawns web/tunnel if they die.
#
# Tunnel = cloudflared named tunnel "mira-dev" (config in ~/.cloudflared/config.yml,
# routes TUNNEL_URL -> localhost:3000). Override the public URL with TUNNEL_URL=…
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
TUNNEL_URL="${TUNNEL_URL:-https://dev.yourdomain.com}"
CF_TUNNEL="${CF_TUNNEL:-mira-dev}"
LOG=/tmp
mkdir -p "$LOG"

echo "▶ Mira full stack — $ROOT"
pkill -f "cloudflared tunnel" 2>/dev/null || true
pkill -x ollama 2>/dev/null || true   # messaging uses Claude SDK, not ollama

start() { # name  logfile  command...
  local name="$1" log="$2"; shift 2
  if pgrep -f "$1" >/dev/null 2>&1; then :; fi
  ( "$@" >"$log" 2>&1 ) &
  echo "  started $name (log: $log)"
}

# api + worker (stable, no special flags)
( bun --filter @shaiz/api dev          >"$LOG/mira-api.log"    2>&1 ) & API_PID=$!
( bun run worker                       >"$LOG/mira-worker.log" 2>&1 ) & WORKER_PID=$!

# web — heap baked into the dev script (apps/web/package.json). respawn on crash.
web_loop() { while true; do bun --filter @shaiz/web dev >"$LOG/mira-web.log" 2>&1; echo "[mira] web exited, respawning $(date)" >>"$LOG/mira-web.log"; sleep 2; done; }
web_loop & WEB_PID=$!

# tunnel — respawn on drop. Meta callback points at $TUNNEL_URL (cloudflared config).
tunnel_loop() { while true; do cloudflared tunnel run "$CF_TUNNEL" >"$LOG/mira-tunnel.log" 2>&1; echo "[mira] tunnel exited, respawning $(date)" >>"$LOG/mira-tunnel.log"; sleep 2; done; }
tunnel_loop & TUNNEL_PID=$!

cleanup() { echo; echo "▶ stopping…"; kill "$API_PID" "$WORKER_PID" "$WEB_PID" "$TUNNEL_PID" 2>/dev/null; pkill -f "cloudflared tunnel" 2>/dev/null; pkill -P "$WEB_PID" 2>/dev/null; pkill -P "$TUNNEL_PID" 2>/dev/null; exit 0; }
trap cleanup INT TERM

# health gate
echo "▶ waiting for services…"
for i in $(seq 1 60); do curl -sf -o /dev/null http://localhost:4000/health 2>/dev/null && break; sleep 1; done
for i in $(seq 1 90); do curl -sf -o /dev/null http://localhost:3000 2>/dev/null && break; sleep 1; done
for i in $(seq 1 30); do curl -sf -o /dev/null "$TUNNEL_URL" 2>/dev/null && break; sleep 1; done

w=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null)
a=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/health 2>/dev/null)
t=$(curl -s -o /dev/null -w "%{http_code}" "$TUNNEL_URL" 2>/dev/null)
echo "  web:3000=$w  api:4000=$a  tunnel=$t  worker=$(pgrep -f 'worker/index' >/dev/null && echo up || echo DOWN)"
echo "▶ Mira up. Logs in $LOG/mira-*.log. Ctrl-C to stop all."
wait
