# Brag Plan: Mira — Cinematic Launch Film ("Inbox as a Universe")

## What is this app?
Mira is a local AI that runs a creator's Instagram inbox — reads every DM and comment, understands intent, replies in the creator's own voice, and routes buyers, leads, and brand deals automatically. This is a brand launch FILM, not a SaaS demo.

## The angle
An Instagram inbox rendered as a universe. A chaos of message-particles floods dark infinite space, then collapses gravitationally into one glowing gold Mira core that understands intent and routes every message. The reveal: every particle was always part of one intelligent network. Cinematic, After-Effects motion language — parallax depth, camera push, particle simulation, volumetric gold light, kinetic type.

## Hook (first 2-3 seconds)
Black. One ping. The frame floods with streaming message-particles across parallax layers, camera drifting in. The line cuts through and HOLDS: **YOUR INBOX IS NOT NOISE.**

## Key moments (the middle)
- **Gravitational collapse** — the whole stream reverses and rushes inward, converging to a point that ignites gold: the Mira core. **MIRA UNDERSTANDS.**
- **Intelligence / routing** — nodes snap out, pathways light, and a REAL Mira inbox row surfaces (avatar, handle, preview, `24h window` clock, green **live** dot), a gold **Buyer · high intent** tag locks on, then it routes along a lit path back into the network. Kinetic labels flick: intent · route · resolve.
- **Outcomes** — value cards bloom from the core one by one: Question · Order ₹4,200 · Buyer · Lead captured · Brand deal inbound.

## Outro / punchline
Everything inhales back into the core, collapses to a point, and resolves into the **MIRA** wordmark, gold-on-black, with one heavy impact. Tagline: **One mind for every message.**

## User flow worth showing
The real product moment is Scene 3: a faithful Mira inbox conversation row — pulled from the actual `InboxView.tsx` (avatar + display name, last-message preview with the `↩` outbound marker, the `24h window: …` Meta-policy clock, the green `live` SSE dot) — getting an intent tag locked on and routed. The intent/value vocabulary (Buyer, Lead, Brand deal, ₹ values) comes from the real `OpportunitiesView.tsx` classifier.

## Tone
- Preset: cinematic
- Creative direction: premium After-Effects launch film — particle universe, gravitational collapse, volumetric gold light, dramatic reveals over quick cuts, constant motion every frame.
- Interpretation: big motion and dramatic holds; few words, each held long enough to read; pure-black void + a single gold accent; seamless flood→collapse→ignition rather than hard cuts.

## Format: landscape — 1920x1080
## Duration: 24.0s

## Visual identity (from the project — @thedslabs brand / landing)
- Background: #0A0A0A (void)
- Accent: #F4A623 (gold) — the core
- Text: #F5F5F0 / muted #9A9A95
- Display font: Archivo Black (bundled woff2)
- Mono font: JetBrains Mono (bundled woff2) — UI/labels
- Strongest visual element: a single glowing gold node (the core) + the real inbox row

## Share copy (draft)
Your inbox is not noise. Mira reads the intent behind every Instagram DM and routes every buyer, lead, and brand deal — one mind for every message. 🟡

## Audio direction
- Role: SFX-driven cinematic sound design — NOT upbeat music. No suitable cinematic music track is bundled (only upbeat "Happy Beats"), and upbeat pop would fight the film, so this cut runs **music-free** with sparse, impactful trailer-style SFX. (Drop a dark cinematic bed into the composition's assets/music/ and it can be re-rendered with a bed under the same beats.)
- Music: none (intentional — see above)
- SFX posture: sparse, warm, low-HF — one single ping to open, an impact as particles compress, a heavy soft impact on core ignition (~7.6s), select-lock on the intent tag, light rollover flicks on the kinetic labels, casino card-place taps as value cards bloom, one heavy bell on the logo land (~22.2s).
- Self-defined beats (no track): ignition ~7.6s; value cards every ~0.7s 16.5→19.3; logo land ~22.2s.
- Audio-reactive treatment: N/A without a bed — the core glow breathes via a deterministic yoyo pulse instead (no waveform/EQ graphics, per direction).
- Restraint rule: one sound per event; long stretches stay near-silent so the impacts land. No music, no busy ticking.

## Music cue guidance
- No music track (intentional). Beats are author-defined; the two anchor moments (ignition ~7.6s, logo land ~22.2s) carry the heavy impacts. If a cinematic track is later added, lock its rising-swell peak to 7.6s and its resolve to 22.2s.

## Storyboard

### Scene 1 — Chaos / The Flood — 5.0s
Black, one ping. The frame floods with ~120 message-particles (dots + 6 real-preview DM chips like "collab? we'd pay", "price for the tee?") streaming through dark space across 3 parallax depth layers; camera drifts in (slow scale push). Hook line cuts through and HOLDS: **YOUR INBOX IS NOT NOISE.**
Sequential/interaction: none (continuous particle drift)
Audio intent: a lone ping, then near-silent pressure.
Audio-coupled idea: single ping at 0.3s.
Music: none.
Transition mood: seamless (same particle field) → Scene 2

### Scene 2 — Gravitational Pull / Core Ignition — 5.2s
The stream reverses — every particle rushes inward, converging to a point that ignites GOLD: the Mira core. Volumetric gold bloom, camera push. Line: **MIRA UNDERSTANDS.**
Sequential/interaction: collapse (staggered inward rush)
Audio intent: compression → a single heavy ignition impact.
Audio-coupled idea: soft impact ~6.9s (compression), heavy impact on ignition 7.6s.
Music: none.
Transition mood: dramatic bloom → Scene 3

### Scene 3 — Intelligence / Routing — 6.4s
Nodes snap out from the core, connector pathways illuminate (SVG draw). A REAL Mira inbox row surfaces center (avatar "AK", @ayaan.k, preview "collab for our brand — we'd pay ↩", `24h window: 6h 12m left`, green live dot), a gold **Buyer · high intent** tag locks on. Hold row + tag ~1.4s, then it routes along a lit path back into the network. Kinetic labels flick along paths: intent · route · resolve.
Sequential/interaction: yes — nodes snap out; tag locks (select sound); 3 labels flick one by one; row routes.
Audio intent: precise, intelligent.
Audio-coupled idea: tick as row surfaces; select-lock on tag (12.0s); rollover flick per label.
Music: none.
Transition mood: lit-path sweep → Scene 4

### Scene 4 — Outcomes / Value Cards — 5.0s
Value cards bloom from the core one by one, every-other-beat (~0.7s apart, ~0.8s settle each, then hold the full set): **Question** · **Order · ₹4,200** · **Buyer · high intent** · **Lead · captured** · **Brand deal · inbound**.
Sequential/interaction: yes — 5 cards bloom on the beat grid (card-place sounds), full set holds ~1.5s.
Audio intent: results stacking, satisfying.
Audio-coupled idea: casino card-place tap per card (16.5/17.2/17.9/18.6/19.3).
Music: none.
Transition mood: inhale → Scene 5

### Scene 5 — Convergence / Logo — 3.0s
Every card and particle inhales back into the core; it collapses to a point and resolves into the **MIRA** wordmark (Archivo Black, gold-on-black, full-bleed). Tagline: **One mind for every message.** One heavy bell impact on the logo land.
Sequential/interaction: convergence collapse.
Audio intent: final resolve, one heavy hit.
Audio-coupled idea: heavy bell impact on logo land ~22.2s.
Music: none.
Transition mood: fade to black — end

**Music mood for this video:** none (intentional — SFX-driven cinematic)
**Audio summary:** A lone ping opens a near-silent flood; the collapse compresses to one heavy ignition impact; sparse select/flick sounds carry the routing; casino card-place taps mark each value card; one heavy bell lands the logo. Silence between events makes the impacts cinematic.
