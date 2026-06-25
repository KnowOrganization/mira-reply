# Composition Brief: Mira — Launch Film

**Format:** 1920×1080 landscape. **Duration:** 24.6s. **Tone:** app-store + cinematic, keynote (Stripe Sessions / Vercel Ship / Linear / Apple).

**System (reuse from prior cut):** pure-black `.cine` stage (radial indigo wash + faint dot grid + inset vignette), `.glass` surfaces, Inter, accent #4f6bed, green #3f9e63 WON, text #f5f5f5. 32-spoke radial Mira burst (`buildSunburst`).

**Scenes / beat-locks (music vol-12, 109.96 BPM):**
1. 0–3.0 Logo bloom — burst + "Mira" + "Local AI for Instagram, in your voice." bong @0.4.
2. 3.0–6.2 Flood — 4 DM bubbles cascade beat-grid 3.3/3.85/4.4/4.95, unread badge counts to 247.
3. 6.2–10.0 Intent — DM isolates, flow line draws, 3 chips light (Question/Buyer/Brand deal) last @8.74 cue.
4. 10.0–13.6 Reply — out-bubble slams + glow @10.93 cue, Hinglish words type, callout "Unique every time · Never flagged."
5. 13.6–17.4 Deal — card in @13.7, green glow + WON stamp @15.84 cue, ₹3,20,000 · 92% confident.
6. 17.4–21.0 Stats — 3 cards one-per-strong-beat @17.47/18.56/19.66, count up 94% / 3.2 hrs / 0 flags, hold set.
7. 21.0–24.6 Outro — burst re-bloom, "Mira", "Connect Instagram. Mira does the rest.", music fade out @24.0.

**Audio:** bgm fade-in to 0.26; sparse motion-matched SFX (select ticks on flood, rollover on chips/stats, key ticks under typing, bong on blooms/WON). One sound per event.

**Count-ups:** GSAP tween on a plain object + onUpdate → textContent (deterministic, no Date/random).
