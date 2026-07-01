import Svg, { Rect, Polyline, Circle, Path } from 'react-native-svg';

// Small monochrome mini-chart for bento tiles (Mira.dc.html:200/235 `t.viz` —
// VIZART asset map at design/Mira.dc.html:1419). Doc renders a per-tile PNG/SVG
// data-uri above the metric number; we render the RN-native equivalent at the
// same 34px height, full tile width (viewBox stretched via preserveAspectRatio).
export type VizArtKind = 'bars' | 'line' | 'dots' | 'ring';

type Props = { kind: VizArtKind; color: string };

const VIEW_W = 200;
const VIEW_H = 34;

function Bars({ color }: { color: string }) {
  // Descending bar stack, like the doc's pipeline/orders mini-charts.
  const bars = [
    { x: 0, h: 22 },
    { x: 18, h: 16 },
    { x: 36, h: 10 },
  ];
  return (
    <>
      {bars.map((b, i) => (
        <Rect
          key={i}
          x={b.x}
          y={VIEW_H - b.h}
          width={12}
          height={b.h}
          rx={3}
          fill={color}
          opacity={1 - i * 0.22}
        />
      ))}
    </>
  );
}

function Line({ color }: { color: string }) {
  // Ascending trend polyline + end dot, like the doc's analytics viz.
  const points = '0,28 14,24 28,27 42,18 56,21 70,12 84,15 98,6';
  return (
    <>
      <Polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={2.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={98} cy={6} r={3.2} fill={color} />
    </>
  );
}

function Dots({ color }: { color: string }) {
  // A scattered row of dots, like flagged/blocked items being caught.
  const dots = [
    { cx: 6, cy: 22, r: 5, o: 1 },
    { cx: 24, cy: 12, r: 4, o: 0.7 },
    { cx: 42, cy: 26, r: 4, o: 0.5 },
    { cx: 60, cy: 16, r: 3, o: 0.3 },
  ];
  return (
    <>
      {dots.map((d, i) => (
        <Circle key={i} cx={d.cx} cy={d.cy} r={d.r} fill={color} opacity={d.o} />
      ))}
    </>
  );
}

function Ring({ color }: { color: string }) {
  // Thin partial-progress arc, echoing the orbiting-agents "Mira brain" motif.
  return (
    <>
      <Circle cx={17} cy={17} r={14} stroke={color} strokeWidth={2.4} opacity={0.18} fill="none" />
      <Path
        d="M17 3a14 14 0 0 1 9.9 23.9"
        stroke={color}
        strokeWidth={2.4}
        strokeLinecap="round"
        fill="none"
      />
      <Circle cx={26.9} cy={26.9} r={2.6} fill={color} />
    </>
  );
}

export function VizArt({ kind, color }: Props) {
  return (
    <Svg
      width="100%"
      height={VIEW_H}
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      preserveAspectRatio="xMinYMid meet"
    >
      {kind === 'bars' && <Bars color={color} />}
      {kind === 'line' && <Line color={color} />}
      {kind === 'dots' && <Dots color={color} />}
      {kind === 'ring' && <Ring color={color} />}
    </Svg>
  );
}
