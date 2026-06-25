# Hyperframes Composition Brief: Mira

## Objective
Create a short, polished launch-style brag video for Mira — the AI that runs your Instagram.

## Output
- Composition directory: `brag-output/composition/`
- Rendered video: `brag-output/brag.mp4`
- Format: landscape — 1920x1080
- Duration: ~20.8s

## Source Material
- Project root: `/Users/danyaldev/Desktop/Shaiz`
- Primary files read: `README.md`, `apps/web/src/app/s/_components/Storefront.tsx`, `apps/web/src/components/products/ProductsView.tsx`, `apps/web/src/app/globals.css`, `CanvasLayout.tsx`, `MiraLogo`
- Product name: **Mira**
- Tagline / strongest claim: *the AI that runs your Instagram* — watches DMs, replies in your voice, turns DMs into brand deals, and gives every creator a storefront.
- Key UI to recreate: the Mira sunburst logo; the indigo DM bubble; the Opportunities Kanban deal card; the premium `/s/thedslabs` storefront grid (monogram product cards, "Powered by Mira" footer).
- Copy that must appear verbatim:
  - "the AI that runs your Instagram"
  - "do you ship to canada? 👀"
  - "Yes — free shipping over $80, here's the link 🇨🇦"
  - "Replies in your voice. While you sleep."
  - "Brand Deal" · "92%" · "$4,000" · "Turns DMs into deals."
  - "/s/thedslabs" · "Powered by Mira"
  - "Connect Instagram. Mira does the rest."

## Creative Direction
- Tone preset: polished
- Creative direction: a quiet premium product film — "the AI that quietly runs your Instagram"
- Interpretation: fewer scenes, longer holds, confident restraint. Smooth slides/crossfades, large calm type, the indigo accent does the talking. No hype words.
- Angle: Mira is the operator behind the account. The video shows the account running itself — a real DM gets an on-brand reply, a brand deal lands in "Won", a storefront builds itself. You connect once; the work happens.
- Hook: Mira sunburst draws + rotates on near-black dot-grid; wordmark + "the AI that runs your Instagram."
- Outro / punchline: "Connect Instagram. Mira does the rest."
- Avoid: generic SaaS language, abstract filler visuals, unrelated redesign.

## Visual Identity
- Background: `#ffffff` surface on `#f9f9fb` frame; near-black `#0c0c0f` + dot-grid for hook/outro
- Text: `#1a1a1f` primary / `#6b6f76` muted / `#9ca0a8` subtle
- Accent: `#4f6bed` Mira indigo (accent-soft `#eceffd`)
- Display font: Inter 800, letter-spacing -0.04em
- Body font: Inter
- Visual references: sunburst logo, indigo right-aligned DM bubble, Kanban card with confidence badge, 4/5 monogram product cards, sticky storefront header.

## Storyboard
Use `brag-output/brag-plan.md` as the creative contract.

Scene summary:
1. Logo hook — 3s — sunburst draws + rotates, "Mira" + "the AI that runs your Instagram"
2. A DM answering itself — 5.6s — incoming grey bubble, Mira indigo reply types out, caption "Replies in your voice. While you sleep."
3. A brand deal closing — 4.5s — Kanban; card slides Needs Review → Won (Brand Deal · 92% · $4,000), caption "Turns DMs into deals."
4. A storefront building itself — 5.2s — `/s/thedslabs` hero + product cards pop in one by one, "Powered by Mira"
5. Outro — 2.8s — sunburst + "Mira" + "Connect Instagram. Mira does the rest."

## Audio
- Audio role: warm professional bed with sparse motion-matched accents
- Audio arc: soft entry under logo → intimate through DM reply → small lift as deal closes → single swell under storefront → soft resolve on outro
- Music: `assets/music/happy-beats-business-moves-vol-12-by-ende-dot-app.mp3` (~110 BPM)
- Music treatment: constant low bed (~0.45). (Fade-out skipped — framework owns playback; constant volume keeps render robust. Add later if needed.)
- Music cue guidance: preset `assets/music/happy-beats-business-moves-vol-12-by-ende-dot-app.music-cues.json`. Strong cues: 8.74, 10.93, 13.11, 17.47, 18.56. Beat grid (product cards): 13.64 / 14.20 / 14.73 / 15.29. Lock: deal slam → 10.93; storefront hero → 13.11; outro line → 18.56.
- Audio-reactive treatment: **skipped** — using a finite CSS glow "breathing" on the logo instead of per-frame RMS coupling, to keep the render deterministic and robust. (Documented per skill: extraction optional.)
- Audio-coupled moments:
  - DM reply typing — 3 keypress ticks + soft send click
  - Deal lands in Won — drop "thunk" + soft bong, on 10.93
  - Product cards — soft pops on the beat grid
  - Outro logo — single soft bong near 18.56
- SFX selection guidance: ui/rollover + click for soft taps, interface/drop for the deal thunk, interface/bong for announce + logo resolve, keyboard/keypress for typing. Restraint — one accent per moment.
- Audio files: in `assets/music/` and `assets/sfx/`.

## Hyperframes Instructions
- Single standalone `index.html`, one paused GSAP timeline registered at `window.__timelines["main"]`.
- Scenes are `class="clip"` sections, `position:absolute; inset:0`, distinct `data-track-index` per scene for crossfade overlap.
- `<audio>` elements are direct children of root; framework owns playback.
- Show real Mira UI (logo, DM bubble, Kanban card, storefront). Keep all text readable (reading-time floor honored).
- Beat-lock the 3 major moments; snap product cards to the beat grid.
- Run `npm run check` (lint + validate + inspect); fix errors before render.
