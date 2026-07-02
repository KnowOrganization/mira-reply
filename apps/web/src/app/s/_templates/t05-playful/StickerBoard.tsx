"use client";
// t05-playful — StickerBoard: die-cut product stickers scattered around the
// hero board. Each sticker is DRAGGABLE + FLINGABLE (framer-motion drag with
// dragSnapToOrigin, so it always springs home). The name-tag chip below each
// sticker is a plain <a> OUTSIDE the drag surface, so drag and tap never
// conflict. All positions/rotations come from a hardcoded deterministic slot
// table (no Math.random) — motion.div SSRs as a plain div, so the server and
// client render identical markup.
import { motion, useReducedMotion } from "framer-motion";
import { StoreImage } from "../../_components/StoreImage";

export type BoardSticker = {
  id: string;
  /** detail-page href — null renders a non-link chip */
  href: string | null;
  /** chip text (usually the product title) */
  label: string;
  title: string;
  imageUrl: string | null;
  monogram: string;
};

type Slot = {
  pos: React.CSSProperties; // left/right/top/bottom offsets
  size: string;             // clamp() width of the die-cut circle
  rotate: number;           // resting tilt (deg)
  delay: number;            // pop-in stagger (s)
  chipRotate: number;       // chip tilt (deg)
};

// 5 slots hugging the board edges — headline stays readable in the middle.
const SLOTS: Slot[] = [
  { pos: { left: "4%", top: "11%" },     size: "clamp(92px, 15vw, 178px)",  rotate: -8, delay: 0.1,  chipRotate: -3 },
  { pos: { right: "4%", top: "8%" },     size: "clamp(84px, 13vw, 152px)",  rotate: 7,  delay: 0.25, chipRotate: 4 },
  { pos: { left: "2%", bottom: "15%" },  size: "clamp(80px, 12vw, 142px)",  rotate: 5,  delay: 0.4,  chipRotate: -4 },
  { pos: { right: "6%", bottom: "12%" }, size: "clamp(96px, 16vw, 190px)",  rotate: -6, delay: 0.55, chipRotate: 3 },
  { pos: { left: "40%", bottom: "3%" },  size: "clamp(76px, 11vw, 128px)",  rotate: 10, delay: 0.7,  chipRotate: -2 },
];

// 1–2 products (+ hero) live BIG in the board when the menu section hides.
const SLOTS_BIG: Slot[] = [
  { pos: { left: "6%", top: "12%" },     size: "clamp(140px, 30vw, 300px)", rotate: -7, delay: 0.15, chipRotate: -3 },
  { pos: { right: "5%", bottom: "10%" }, size: "clamp(130px, 27vw, 270px)", rotate: 6,  delay: 0.4,  chipRotate: 3 },
  { pos: { right: "8%", top: "9%" },     size: "clamp(100px, 18vw, 190px)", rotate: 9,  delay: 0.65, chipRotate: -4 },
];

export default function StickerBoard({
  stickers,
  big = false,
}: {
  stickers: BoardSticker[];
  big?: boolean;
}) {
  const reduced = useReducedMotion();
  const slots = big ? SLOTS_BIG : SLOTS;
  const list = stickers.slice(0, slots.length);

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 3 }}>
      {list.map((s, i) => {
        const slot = slots[i];
        return (
          <div
            key={s.id}
            className="t05-slot t05-pop"
            style={{
              position: "absolute",
              ...slot.pos,
              width: slot.size,
              pointerEvents: "auto",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 10,
              animationDelay: `${slot.delay}s`,
            }}
          >
            <motion.div
              drag={!reduced}
              dragSnapToOrigin
              dragElastic={0.6}
              whileDrag={{ scale: 1.1, rotate: 0, zIndex: 9 }}
              className="t05-diecut"
              style={{
                rotate: slot.rotate,
                width: "100%",
                aspectRatio: "1 / 1",
                borderRadius: "50%",
                border: "6px solid #fff",
                background: "#fff",
                overflow: "hidden",
                boxShadow: "0 4px 10px rgba(58,43,32,.14), 0 18px 38px rgba(58,43,32,.18)",
                cursor: reduced ? "default" : "grab",
                touchAction: "none",
              }}
            >
              <StoreImage
                src={s.imageUrl}
                alt={s.title}
                monogram={s.monogram}
                eager={i < 2}
                style={{
                  width: "100%",
                  height: "100%",
                  display: "block",
                  borderRadius: "50%",
                  pointerEvents: "none",
                  userSelect: "none",
                }}
              />
            </motion.div>
            {s.href ? (
              <a
                href={s.href}
                className="t05-nametag"
                style={{ transform: `rotate(${slot.chipRotate}deg)` }}
              >
                {s.label} →
              </a>
            ) : (
              <span
                className="t05-nametag"
                style={{ transform: `rotate(${slot.chipRotate}deg)` }}
              >
                {s.label}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
