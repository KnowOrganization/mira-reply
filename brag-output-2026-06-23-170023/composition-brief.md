# Hyperframes Composition Brief: Mira — closing deals (vertical, fast)

## Objective
A fast, vertical (9:16) keynote-grade brag reel about ONE thing: Mira closing brand deals hiding in your Instagram DMs.

## Output
- Composition dir: `brag-output-2026-06-23-170023/composition/`
- Video: `brag-output-2026-06-23-170023/brag.mp4`
- Format: vertical — 1080x1920
- Duration: ~15.4s (fast)

## Source Material
- Product: **Mira** — the AI that runs your Instagram; this cut = Opportunities/deal-closing only.
- Copy verbatim:
  - "got a collab budget — $5k? 👀"
  - "THERE'S MONEY IN YOUR DMs"
  - "Brand Deal" · "92% confident" · "$4,000"
  - "WON" · "$4,000 / $2,800 / $6,500" · "CLOSED."
  - "$23,400" · "CLOSED THIS MONTH"
  - "Close deals in your sleep."

## Creative Direction
- Tone: cinematic, FAST variant. Black/glass/glow keynote look but snappy — quick reveals (0.4–0.7s), tight ~1s holds, staccato WON hits, a quick count-up. Energetic, vertical-feed-ready.
- Direction (verbatim): "Apple keynote meets Linear and Arc Browser. Cinematic black backgrounds, floating UI elements, elegant typography, slow dramatic reveals, subtle ambient sound, premium motion design and world-class SaaS craftsmanship. just talk about closing deals and make video fasttttt and in vertical reel ratio"
- Avoid: storefront, general "replies", slow drags, generic SaaS lines, clutter.

## Visual Identity
- BG: `#000000` + faint dot-grid + center bloom + vignette
- Glass: `rgba(255,255,255,0.05)` fill, `rgba(255,255,255,0.10)` border, soft shadow + indigo bloom; WON = green `#3f9e63` glow
- Accent `#4f6bed`; win green `#3f9e63`; text `#f5f5f5`/muted; tracked uppercase kickers; huge tabular payoff number
- Font: Inter (local woff2) — 800 tight + 500 wide-tracked uppercase

## Storyboard (use brag-plan.md)
1. Hook DM — 2.4s — glass bubble "got a collab budget — $5k? 👀" + "THERE'S MONEY IN YOUR DMs"
2. Detect — 3.2s — bubble → deal card "Brand Deal · 92% confident · $4,000"
3. Close fast — 4.6s — 3 stacked cards slam to WON ($4,000/$2,800/$6,500) on beats 8.02/8.74/9.29 + "CLOSED."
4. Payoff — 3.2s — count-up to "$23,400" + "CLOSED THIS MONTH", land ~10.93
5. Outro — 2.8s — sunburst + "Mira" + "Close deals in your sleep."

## Audio
- Ambient bed `assets/music/...vol-12....mp3` @ ~0.4, fast fade in, fade under outro (timeline volume keyframes).
- Cues: strong 8.74 / 10.93 / 13.11; WON beat grid 8.02 / 8.74 / 9.29; lock payoff number land 10.93.
- SFX: bong_001 chime per WON + payoff; drop_001 thunk on stack; rollover ticks. Punchy, clean.
- Audio-reactive: subtle finite glow pulses (RMS extraction skipped — deterministic).
- Files in assets/music + assets/sfx.

## Hyperframes Instructions
- Single standalone `index.html`, 1080x1920 root, one paused GSAP timeline `window.__timelines["main"]`.
- Scenes = `class="clip"` absolute inset:0, distinct track-index, quick crossfades through black.
- Count-up = gsap tween on a proxy object with onUpdate writing toLocaleString text (deterministic).
- `<audio>` direct root children with ids; bgm volume via timeline keyframes.
- Run `npm run check`; 0 errors before render.
