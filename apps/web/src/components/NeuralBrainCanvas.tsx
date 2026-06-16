"use client";

// Mira Neural Core — a 3D volumetric brain of Mira's real operational
// intelligence. This page is intentionally DARK/greyish (independent of the
// app's light theme): a rotating brain point-cloud with additive glow,
// capability zones that light up on real events, signal packets flowing in/out,
// a CORTEX STATUS panel (every Mira system), a live INBOX feed, and vitals.
// Canvas 2D, one RAF, glow sprites, reduced-motion aware.

import { useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import {
  useDrafts, useDashboard, useStatus, useBrain, useMentions, useClarifications,
  useComments, useAutomations, useWatcher, usePosts, type IgStatus,
} from "@/lib/api/hooks";

const SANS = '-apple-system, "SF Pro Display", system-ui, sans-serif';

// dark/greyish palette — hardcoded so this page stays dark while the app is light
const BG = "#14171d";
const ACCENT = "#7dd3fc";

type Status = "live" | "planned";
type Region = { key: string; name: string; color: string; status: Status; x: number; y: number };
const REGIONS: Region[] = [
  { key: "brain", name: "Account Brain", color: "#a78bfa", status: "live", x: 0.45, y: 0.24 },
  { key: "posts", name: "Content Ops", color: "#38bdf8", status: "live", x: 0.52, y: 0.33 },
  { key: "dm", name: "DM Engine", color: "#22d3ee", status: "live", x: 0.31, y: 0.34 },
  { key: "automations", name: "Automations", color: "#f59e0b", status: "live", x: 0.57, y: 0.31 },
  { key: "contacts", name: "Contacts / CRM", color: "#818cf8", status: "live", x: 0.39, y: 0.42 },
  { key: "mentions", name: "Mentions Radar", color: "#c084fc", status: "live", x: 0.60, y: 0.42 },
  { key: "guard", name: "Jailbreak Guard", color: "#f87171", status: "live", x: 0.43, y: 0.47 },
  { key: "send", name: "Send Pipeline", color: "#4ade80", status: "live", x: 0.34, y: 0.46 },
  { key: "bus", name: "Realtime Bus", color: "#67e8f9", status: "live", x: 0.50, y: 0.47 },
  { key: "analytics", name: "Analytics", color: "#60a5fa", status: "live", x: 0.58, y: 0.50 },
  { key: "antiban", name: "Anti-Ban", color: "#fb923c", status: "live", x: 0.30, y: 0.50 },
  { key: "ingest", name: "Webhook Ingest", color: "#2dd4bf", status: "live", x: 0.24, y: 0.45 },
  { key: "clar", name: "Owner Input", color: "#fbbf24", status: "live", x: 0.37, y: 0.57 },
  { key: "comments", name: "Comment Pipeline", color: "#0ea5e9", status: "live", x: 0.33, y: 0.60 },
  { key: "reconcile", name: "Reconciler", color: "#5eead4", status: "live", x: 0.46, y: 0.58 },
  { key: "audience", name: "Audience Intel", color: "#e879f9", status: "live", x: 0.49, y: 0.66 },
  { key: "opportunities", name: "Opportunity Engine", color: "#34d399", status: "live", x: 0.56, y: 0.62 },
  // planned (cortex status only)
  { key: "inbox", name: "Unified Inbox", color: "#64748b", status: "planned", x: 0.64, y: 0.40 },
  { key: "channels", name: "Multi-Channel", color: "#64748b", status: "planned", x: 0.64, y: 0.55 },
  { key: "aistudio", name: "AI Studio", color: "#64748b", status: "planned", x: 0.62, y: 0.36 },
  { key: "scheduling", name: "Scheduling", color: "#64748b", status: "planned", x: 0.37, y: 0.70 },
  { key: "growth", name: "Growth Engine", color: "#64748b", status: "planned", x: 0.27, y: 0.55 },
  { key: "billing", name: "Billing", color: "#64748b", status: "planned", x: 0.52, y: 0.74 },
];
const LIVE = REGIONS.filter((r) => r.status === "live");

const FIRE_MAP: Record<string, string[]> = {
  comment: ["comments", "ingest", "bus"],
  message: ["dm", "ingest", "bus"],
  draft: ["dm", "comments", "send"],
  sent: ["send", "dm", "antiban"],
  log: ["bus", "reconcile"],
};

type Metrics = Record<string, { value: number | null }>;

function fmtClock(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
function rgbA(hex: string, a: number): string {
  const h = hex.replace("#", "");
  return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${a})`;
}
function useCountUp(target: number, ms = 900): number {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / ms);
      setV(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

type P3 = { x: number; y: number; z: number; region: number; phase: number; sx: number; sy: number; sz: number; ss: number };
type Edge = { a: number; b: number };
type Zone = { region: number; x: number; y: number; z: number; sx: number; sy: number; labelUntil: number };
type Packet = { kind: "in" | "out"; zone: number; fx: number; fy: number; t: number; sp: number; color: string; label: string };
type SignalIn = { type: string; label: string; color: string };

function brainFold(x: number, y: number, z: number): number {
  return Math.sin(x * 2.8 + y * 2.1) * 0.5 + Math.sin(y * 3.4 - z * 2.6) * 0.3 + Math.sin(z * 4.1 + x * 1.9) * 0.2;
}

export function NeuralBrainCanvas() {
  const reduce = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const { data: status } = useStatus<IgStatus>({ refetchInterval: 20_000 });
  const { data: drafts } = useDrafts<{ pending?: unknown[] }>({ refetchInterval: 20_000 });
  const { data: dash } = useDashboard<{ coverage?: number; totalComments?: number; totalReplies?: number }>({ refetchInterval: 20_000 });
  const { data: brain } = useBrain<{ total?: number }>({ refetchInterval: 30_000 });
  const { data: mentions } = useMentions<{ mentions?: { read?: boolean }[] }>({ refetchInterval: 30_000 });
  const { data: clar } = useClarifications<{ open?: unknown[] }>({ refetchInterval: 20_000 });
  const { data: comments } = useComments<{ count?: number }>(false, { refetchInterval: 20_000 });
  const { data: autos } = useAutomations({ refetchInterval: 30_000 });
  const { data: watcher } = useWatcher<{ seenCount?: number }>({ refetchInterval: 30_000 });
  const { data: posts } = usePosts<{ posts?: unknown[] }>({ refetchInterval: 60_000 });

  const metrics: Metrics = useMemo(() => {
    const unread = (mentions?.mentions ?? []).filter((m) => !m.read).length;
    return {
      brain: { value: brain?.total ?? status?.factCount ?? 0 }, posts: { value: (posts?.posts ?? []).length },
      dm: { value: (drafts?.pending ?? []).length }, automations: { value: (autos?.automations ?? []).length },
      contacts: { value: 0 }, mentions: { value: unread }, guard: { value: null },
      send: { value: dash?.totalReplies ?? 0 }, bus: { value: null }, analytics: { value: dash?.coverage ?? 0 },
      antiban: { value: null }, ingest: { value: watcher?.seenCount ?? 0 }, clar: { value: (clar?.open ?? []).length },
      comments: { value: comments?.count ?? dash?.totalComments ?? 0 }, reconcile: { value: null },
      audience: { value: 0 }, opportunities: { value: null },
    };
  }, [drafts, dash, brain, status, mentions, clar, comments, autos, watcher, posts]);

  const processed = dash?.totalComments ?? 0;
  const replies = dash?.totalReplies ?? 0;
  const coverage = dash?.coverage ?? 0;
  const queued = (drafts?.pending ?? []).length;

  const energiesRef = useRef<Record<string, number>>({});
  const baselineRef = useRef<Record<string, number>>({});
  const pendingRef = useRef<SignalIn[]>([]);
  const eventTimesRef = useRef<number[]>([]);
  const [clock, setClock] = useState("");
  const [tpm, setTpm] = useState(0);
  const [energies, setEnergies] = useState<Record<string, number>>({});
  const [logs, setLogs] = useState<{ id: number; t: string; msg: string; color: string }[]>([]);

  useEffect(() => {
    const b: Record<string, number> = {};
    for (const r of LIVE) { const v = metrics[r.key]?.value; b[r.key] = 0.25 + Math.min(0.4, ((v ?? 0) / 25) * 0.4); }
    baselineRef.current = b;
  }, [metrics]);

  useEffect(() => {
    const f = () => setClock(fmtClock());
    const id = setInterval(f, 1000); const t0 = setTimeout(f, 0);
    return () => { clearInterval(id); clearTimeout(t0); };
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      const now = performance.now();
      eventTimesRef.current = eventTimesRef.current.filter((x) => now - x < 60_000);
      setTpm(eventTimesRef.current.length);
      setEnergies({ ...energiesRef.current });
    }, 300);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let es: EventSource | null = null;
    let n = 0;
    try { es = new EventSource("/api/ig/stream"); } catch { return; }
    es.onmessage = (e: MessageEvent) => {
      let ev: { type?: string; fromUsername?: string; fromUserId?: string; level?: string; msg?: string };
      try { ev = JSON.parse(e.data); } catch { return; }
      const type = ev.type || "";
      const targets = FIRE_MAP[type];
      if (targets) for (const k of targets) energiesRef.current[k] = 1;
      if (type === "log" && (ev.level === "warn" || ev.level === "error")) energiesRef.current["guard"] = 1;
      let label = "", msg = "", color = "#7dd3fc";
      if (type === "comment") { label = ev.fromUsername ? "@" + ev.fromUsername : "comment"; msg = `comment in ${label}`; color = "#0ea5e9"; }
      else if (type === "message") { label = ev.fromUsername ? "@" + ev.fromUsername : "DM"; msg = `DM in ${label}`; color = "#22d3ee"; }
      else if (type === "draft") { label = "draft"; msg = "draft synthesised"; color = "#f59e0b"; }
      else if (type === "sent") { label = "reply"; msg = "reply dispatched"; color = "#4ade80"; }
      else if (type === "log") { label = ev.level === "error" ? "alert" : "signal"; msg = (ev.msg || "system").slice(0, 46); color = ev.level === "error" ? "#f87171" : "#5eead4"; }
      else if (type === "ready") { msg = "neural link established"; color = "#34d399"; }
      else return;
      if (label) { pendingRef.current.push({ type, label, color }); eventTimesRef.current.push(performance.now()); }
      const ts = fmtClock();
      setLogs((prev) => [{ id: n++, t: ts, msg, color }, ...prev].slice(0, 12));
    };
    es.onerror = () => {};
    return () => es?.close();
  }, []);

  // ── 3D canvas engine (dark, additive glow) ───────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current, wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = 0, H = 0, dpr = 1;
    const sprites = new Map<string, HTMLCanvasElement>();
    function glow(color: string): HTMLCanvasElement {
      const c = sprites.get(color);
      if (c) return c;
      const s = 48, off = document.createElement("canvas");
      off.width = off.height = s;
      const g = off.getContext("2d")!;
      const rg = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      rg.addColorStop(0, rgbA(color, 1)); rg.addColorStop(0.3, rgbA(color, 0.5)); rg.addColorStop(1, rgbA(color, 0));
      g.fillStyle = rg; g.fillRect(0, 0, s, s);
      sprites.set(color, off);
      return off;
    }

    let seed = 7321;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

    const pts: P3[] = [];
    const addEllipsoid = (n: number, rx: number, ry: number, rz: number, ox: number, oy: number, oz: number, fold: number) => {
      for (let i = 0; i < n; i++) {
        const th = Math.acos(2 * rnd() - 1), ph = 2 * Math.PI * rnd();
        let x = Math.sin(th) * Math.cos(ph), y = Math.cos(th), z = Math.sin(th) * Math.sin(ph);
        const f = 1 + fold * brainFold(x * 3, y * 3, z * 3);
        x *= rx * f; y *= ry * f; z *= rz * f;
        pts.push({ x: x + ox, y: y + oy, z: z + oz, region: 0, phase: rnd() * 6.28, sx: 0, sy: 0, sz: 0, ss: 0 });
      }
    };
    addEllipsoid(880, 1.0, 0.72, 0.82, 0, 0.06, 0, 0.075);
    for (const p of pts) {
      if (Math.abs(p.x) < 0.1 && p.y > -0.1) p.y -= 0.07 * (1 - Math.abs(p.x) / 0.1);
      if (p.y < -0.34) p.y = -0.34 + (p.y + 0.34) * 0.45;
    }
    addEllipsoid(150, 0.34, 0.25, 0.34, 0, -0.42, -0.48, 0.14);
    for (let i = 0; i < 44; i++) {
      const yy = -0.5 - rnd() * 0.42;
      pts.push({ x: (rnd() - 0.5) * 0.14, y: yy, z: -0.3 + (rnd() - 0.5) * 0.14, region: 0, phase: rnd() * 6.28, sx: 0, sy: 0, sz: 0, ss: 0 });
    }

    const zones: Zone[] = LIVE.map((r) => {
      const zx = (r.x - 0.42) * 2.4, zy = (0.46 - r.y) * 2.4;
      const inside = (zx / 1.0) ** 2 + (zy / 0.72) ** 2;
      const zz = inside < 1 ? 0.82 * Math.sqrt(1 - inside) : 0.12;
      return { region: REGIONS.indexOf(r), x: zx, y: zy + 0.06, z: zz, sx: 0, sy: 0, labelUntil: 0 };
    });
    for (const p of pts) {
      let best = 0, bd = 1e9;
      for (let i = 0; i < zones.length; i++) { const dx = p.x - zones[i].x, dy = p.y - zones[i].y, dz = p.z - zones[i].z, d = dx * dx + dy * dy + dz * dz; if (d < bd) { bd = d; best = i; } }
      p.region = zones[best].region;
    }

    const edges: Edge[] = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i]; const near: { j: number; d: number }[] = [];
      for (let j = 0; j < pts.length; j++) {
        if (i === j) continue;
        const dx = a.x - pts[j].x, dy = a.y - pts[j].y, dz = a.z - pts[j].z, d = dx * dx + dy * dy + dz * dz;
        if (d < 0.035) near.push({ j, d });
      }
      near.sort((p, q) => p.d - q.d);
      for (let k = 0; k < Math.min(2, near.length); k++) if (near[k].j > i) edges.push({ a: i, b: near[k].j });
    }

    const packets: Packet[] = [];
    let ambient = 0;

    function resize() {
      const rect = wrap!.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = rect.width; H = rect.height;
      canvas!.width = Math.floor(W * dpr); canvas!.height = Math.floor(H * dpr);
      canvas!.style.width = W + "px"; canvas!.style.height = H + "px";
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    let raf = 0, t = 0, running = true;
    const F = 3.6, AX = -0.22;
    let cx = 0, cy = 0, span = 0, cosAx = 1, sinAx = 0, cosAy = 1, sinAy = 0;
    const project = (x: number, y: number, z: number): [number, number, number, number] => {
      const y1 = y * cosAx - z * sinAx, z1 = y * sinAx + z * cosAx;
      const x2 = x * cosAy + z1 * sinAy, z2 = -x * sinAy + z1 * cosAy;
      const s = F / (F - z2);
      return [cx + x2 * span * s, cy - y1 * span * s, z2, s];
    };

    function spawnPacket(zi: number, type: string, label: string, color: string) {
      const side = Math.floor(Math.random() * 4); const m = 0.06;
      let fx = 0, fy = 0;
      if (side === 0) { fx = -m * W; fy = Math.random() * H; }
      else if (side === 1) { fx = (1 + m) * W; fy = Math.random() * H; }
      else if (side === 2) { fx = Math.random() * W; fy = -m * H; }
      else { fx = Math.random() * W; fy = (1 + m) * H; }
      packets.push({ kind: type === "sent" ? "out" : "in", zone: zi, fx, fy, t: 0, sp: 0.01 + Math.random() * 0.008, color, label });
      if (packets.length > 60) packets.shift();
    }

    function frame() {
      if (!running) return;
      t += 0.016;
      const en = energiesRef.current, bl = baselineRef.current;
      for (const r of LIVE) en[r.key] = Math.max(bl[r.key] ?? 0.12, (en[r.key] ?? 0) * 0.955);

      const S = Math.min(W, H);
      span = S * 0.34; cx = W * 0.44; cy = H * 0.47;
      const yaw = reduce ? 0.5 : Math.sin(t * 0.13) * 0.62 + 0.15;
      cosAy = Math.cos(yaw); sinAy = Math.sin(yaw); cosAx = Math.cos(AX); sinAx = Math.sin(AX);

      ctx!.globalCompositeOperation = "source-over";
      ctx!.fillStyle = rgbA(BG, 0.34); ctx!.fillRect(0, 0, W, H);
      ctx!.globalCompositeOperation = "lighter";

      for (const p of pts) { const [sx, sy, sz, ss] = project(p.x, p.y, p.z); p.sx = sx; p.sy = sy; p.sz = sz; p.ss = ss; }
      for (const z of zones) { const [sx, sy] = project(z.x, z.y, z.z); z.sx = sx; z.sy = sy; }

      // edges
      ctx!.lineWidth = 0.6;
      for (const e of edges) {
        const a = pts[e.a], b = pts[e.b];
        const zn = (Math.min(a.sz, b.sz) + 1.1) / 2.2;
        if (zn < 0.12) continue;
        ctx!.strokeStyle = rgbA(ACCENT, 0.04 + zn * 0.14);
        ctx!.beginPath(); ctx!.moveTo(a.sx, a.sy); ctx!.lineTo(b.sx, b.sy); ctx!.stroke();
      }

      // points (additive glow, depth by size + alpha)
      for (const p of pts) {
        const zn = Math.max(0, Math.min(1, (p.sz + 1.1) / 2.2));
        const energy = en[REGIONS[p.region]?.key] ?? 0.15;
        const tw = 0.55 + 0.45 * Math.sin(t * 1.6 + p.phase);
        const col = energy > 0.55 ? REGIONS[p.region].color : ACCENT;
        const sz = (0.9 + zn * 1.9) * p.ss + energy * 1.4;
        ctx!.globalAlpha = Math.min(0.95, (0.18 + zn * 0.5) * tw + energy * 0.4);
        ctx!.drawImage(glow(col), p.sx - sz, p.sy - sz, sz * 2, sz * 2);
      }
      ctx!.globalAlpha = 1;

      // zones
      ctx!.font = `600 10.5px ${SANS}`; ctx!.textAlign = "center";
      for (const z of zones) {
        const reg = REGIONS[z.region]; const e = en[reg.key] ?? 0.15;
        const [, , zsz] = project(z.x, z.y, z.z);
        const front = zsz + 0.6;
        const rad = (3 + e * 5) * Math.max(0.5, front);
        ctx!.globalAlpha = Math.min(1, 0.5 + e * 0.5);
        ctx!.drawImage(glow(reg.color), z.sx - rad, z.sy - rad, rad * 2, rad * 2);
        if (e > 0.55) {
          const rr = ((t * 0.6) % 1) * 24 * e;
          ctx!.globalAlpha = e * 0.4 * (1 - (t * 0.6) % 1); ctx!.strokeStyle = reg.color; ctx!.lineWidth = 1.2;
          ctx!.beginPath(); ctx!.arc(z.sx, z.sy, 8 + rr, 0, 6.283); ctx!.stroke();
        }
        if (t < z.labelUntil) {
          const a = Math.min(1, (z.labelUntil - t) / 0.7);
          ctx!.globalAlpha = a; ctx!.fillStyle = reg.color;
          ctx!.fillText(reg.name, z.sx, z.sy - rad - 7);
        }
        ctx!.globalAlpha = 1;
      }

      // packets
      const pend = pendingRef.current;
      while (pend.length) {
        const s = pend.shift()!;
        const targets = (FIRE_MAP[s.type] || ["bus"]).map((k) => zones.findIndex((z) => REGIONS[z.region].key === k)).filter((i) => i >= 0);
        const zi = targets.length ? targets[Math.floor(Math.random() * targets.length)] : Math.floor(Math.random() * zones.length);
        spawnPacket(zi, s.type, s.label, s.color);
      }
      ambient += 0.016;
      if (!reduce && ambient > 0.6) { ambient = 0; spawnPacket(Math.floor(Math.random() * zones.length), Math.random() < 0.4 ? "sent" : "comment", "", ACCENT); }

      ctx!.textAlign = "left";
      for (let i = packets.length - 1; i >= 0; i--) {
        const pk = packets[i]; const z = zones[pk.zone];
        pk.t += pk.sp; const ease = pk.t < 1 ? 1 - Math.pow(1 - pk.t, 2) : 1;
        const x = pk.kind === "in" ? pk.fx + (z.sx - pk.fx) * ease : z.sx + (pk.fx - z.sx) * ease;
        const y = pk.kind === "in" ? pk.fy + (z.sy - pk.fy) * ease : z.sy + (pk.fy - z.sy) * ease;
        const e2 = Math.max(0, ease - 0.06);
        const tx = pk.kind === "in" ? pk.fx + (z.sx - pk.fx) * e2 : z.sx + (pk.fx - z.sx) * e2;
        const ty = pk.kind === "in" ? pk.fy + (z.sy - pk.fy) * e2 : z.sy + (pk.fy - z.sy) * e2;
        ctx!.strokeStyle = rgbA(pk.color, 0.45 * (1 - pk.t * 0.5)); ctx!.lineWidth = 1.4;
        ctx!.beginPath(); ctx!.moveTo(tx, ty); ctx!.lineTo(x, y); ctx!.stroke();
        ctx!.globalAlpha = 0.95; ctx!.drawImage(glow(pk.color), x - 3, y - 3, 6, 6); ctx!.globalAlpha = 1;
        if (pk.label) {
          ctx!.globalAlpha = Math.min(1, (1 - pk.t) * 1.4);
          ctx!.font = `600 10px ${SANS}`; ctx!.fillStyle = pk.color;
          ctx!.fillText(pk.label, x + 7, y + 3); ctx!.globalAlpha = 1;
        }
        if (pk.t >= 1) { if (pk.kind === "in") { en[REGIONS[z.region].key] = 1; z.labelUntil = t + 2.0; } packets.splice(i, 1); }
      }

      raf = requestAnimationFrame(frame);
    }

    if (reduce) { ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H); running = true; frame(); running = false; cancelAnimationFrame(raf); }
    else raf = requestAnimationFrame(frame);

    const onVis = () => {
      if (document.hidden) { running = false; cancelAnimationFrame(raf); }
      else if (!reduce) { running = true; raf = requestAnimationFrame(frame); }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => { running = false; cancelAnimationFrame(raf); ro.disconnect(); document.removeEventListener("visibilitychange", onVis); };
  }, [reduce]);

  const liveCount = LIVE.length;

  return (
    <div ref={wrapRef} className="relative w-full h-full overflow-hidden"
      style={{ background: "radial-gradient(circle at 44% 47%, #1b1f27 0%, #15181f 55%, #0f1116 100%)", fontFamily: SANS }}>
      <canvas ref={canvasRef} className="absolute inset-0" />

      {/* title */}
      <div className="absolute top-6 left-7 pointer-events-none select-none">
        <div className="text-[20px] font-semibold tracking-tight" style={{ color: "#e8f1fb", letterSpacing: "-0.02em" }}>Mira</div>
        <div className="text-[11px] mt-0.5" style={{ color: "#5b7390" }}>Neural Core · thinking</div>
      </div>

      {/* always on */}
      <div className="absolute top-6 right-7 flex flex-col items-end gap-2 pointer-events-none">
        <div className="flex items-center gap-2 px-3 h-7 rounded-full" style={{ background: "rgba(125,211,252,0.08)", border: "1px solid rgba(125,211,252,0.18)" }}>
          <span className="nb-beat" style={{ width: 6, height: 6, borderRadius: 9, background: "#34d399", boxShadow: "0 0 8px #34d399" }} />
          <span className="text-[10.5px] tracking-wide" style={{ color: "#a7c4dd" }}>ALWAYS ON · 24/7</span>
        </div>
        <svg width="120" height="22" viewBox="0 0 120 22" className="opacity-90">
          <polyline points="0,11 18,11 22,4 26,18 30,11 56,11 60,5 64,17 68,11 96,11 100,4 104,18 108,11 120,11" fill="none" stroke="rgba(125,211,252,0.2)" strokeWidth="1" />
          <polyline points="0,11 18,11 22,4 26,18 30,11 56,11 60,5 64,17 68,11 96,11 100,4 104,18 108,11 120,11" fill="none" stroke="#7dd3fc" strokeWidth="1.4" strokeDasharray="16 250" className="nb-ekg" />
        </svg>
        <div className="text-[11px] tabular-nums tracking-widest" style={{ color: "#8aa6c2" }}>{clock}</div>
      </div>

      {/* cortex status */}
      <div className="absolute top-[88px] right-7 w-[206px] pointer-events-none">
        <div className="text-[9px] tracking-[0.25em] mb-2 pb-1" style={{ color: "#5b7390", borderBottom: "1px solid rgba(125,211,252,0.12)" }}>MIRA · CORTEX STATUS</div>
        <div className="space-y-[3px]">
          {REGIONS.map((r) => {
            const live = r.status === "live";
            const e = energies[r.key] ?? 0;
            return (
              <div key={r.key} className="flex items-center gap-2 text-[9px] px-1.5 py-[3px] rounded-md"
                style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <span style={{ width: 6, height: 6, borderRadius: 9, flexShrink: 0, background: live ? r.color : "#475569", boxShadow: live ? `0 0 ${4 + e * 8}px ${r.color}` : "none", opacity: live ? 0.6 + e * 0.4 : 0.5 }} />
                <span className="flex-1 truncate tracking-wide" style={{ color: live ? "#9fc0dc" : "#566377" }}>{r.name}</span>
                <span className="tracking-widest" style={{ color: live ? "#34d399" : "#566377", fontSize: 8 }}>{live ? "LIVE" : "SOON"}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* inbox / live activity */}
      <div className="absolute bottom-7 left-7 w-[320px] pointer-events-none">
        <div className="text-[9px] tracking-[0.25em] mb-1.5" style={{ color: "#5b7390" }}>INBOX · LIVE ACTIVITY</div>
        <div className="space-y-[2px]">
          {logs.length === 0 && <div className="text-[9px] tracking-wide" style={{ color: "#3f5266" }}>&gt; awaiting signal…</div>}
          {logs.map((l) => (
            <div key={l.id} className="text-[9.5px] tracking-wide flex items-center gap-2 nb-fade">
              <span className="tabular-nums" style={{ color: "#46627e" }}>{l.t}</span>
              <span style={{ color: l.color }}>›</span>
              <span style={{ color: "#9fc0dc" }}>{l.msg}</span>
            </div>
          ))}
        </div>
      </div>

      {/* vitals */}
      <div className="absolute bottom-7 right-7 flex gap-2.5 pointer-events-none">
        <Stat label="PROCESSED" value={processed} color="#7dd3fc" />
        <Stat label="REPLIES" value={replies} color="#4ade80" />
        <Stat label="COVERAGE" value={coverage} suffix="%" color="#60a5fa" />
        <Stat label="QUEUED" value={queued} color="#22d3ee" />
        <Stat label="THOUGHTS/MIN" value={tpm} color="#a78bfa" />
      </div>

      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[9px] tracking-[0.2em] pointer-events-none" style={{ color: "#3f5266" }}>
        {liveCount} systems live · processing<span className="nb-dots" />
      </div>

      <style>{`
        .nb-beat { animation: nbbeat 1.4s ease-in-out infinite; }
        @keyframes nbbeat { 0%,100% { opacity:1; transform:scale(1);} 50%{opacity:0.45; transform:scale(0.8);} }
        .nb-ekg { animation: nbekg 2.4s linear infinite; }
        @keyframes nbekg { from { stroke-dashoffset: 266; } to { stroke-dashoffset: 0; } }
        .nb-fade { animation: nbfade 0.4s ease-out; }
        @keyframes nbfade { from { opacity: 0; transform: translateX(-4px); } }
        .nb-dots::after { content: "..."; animation: nbdots 1.4s steps(4) infinite; }
        @keyframes nbdots { 0% { content: ""; } 25% { content: "."; } 50% { content: ".."; } 75% { content: "..."; } }
      `}</style>
    </div>
  );
}

function Stat({ label, value, color, suffix }: { label: string; value: number; color: string; suffix?: string }) {
  const v = useCountUp(value);
  return (
    <div className="px-3.5 py-2 rounded-2xl text-center min-w-[82px]"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(3px)" }}>
      <div className="text-[18px] font-semibold tabular-nums leading-tight" style={{ color }}>{v}{suffix || ""}</div>
      <div className="text-[8px] tracking-[0.15em] mt-0.5" style={{ color: "#6a83a0" }}>{label}</div>
    </div>
  );
}
