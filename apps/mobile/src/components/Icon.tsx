import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { colors } from '../theme';

// Line-icon set (24x24, stroke). Ported from the doc's inline SVGs, Lucide-style.
// Add names as screens need them — don't pre-scaffold the whole set.
export type IconName =
  | 'home' | 'inbox' | 'flows' | 'opps' | 'user'
  | 'plus' | 'chevronRight' | 'chevronLeft' | 'bell' | 'sparkle'
  | 'send' | 'clock' | 'instagram' | 'settings' | 'check' | 'close' | 'message'
  | 'chat' | 'tag' | 'link' | 'shield'
  | 'pipeline' | 'automations' | 'orders' | 'trendUp' | 'target' | 'megaphone';

const PATHS: Record<IconName, (c: string) => React.ReactNode> = {
  send: (c) => <Path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z" stroke={c} />,
  clock: (c) => (
    <>
      <Circle cx={12} cy={12} r={9} stroke={c} />
      <Path d="M12 7v5l3 2" stroke={c} />
    </>
  ),
  instagram: (c) => (
    <>
      <Rect x={2} y={2} width={20} height={20} rx={6} stroke={c} />
      <Circle cx={12} cy={12} r={4.5} stroke={c} />
      <Circle cx={17.5} cy={6.5} r={1} fill={c} stroke={c} />
    </>
  ),
  settings: (c) => (
    <>
      <Circle cx={12} cy={12} r={3} stroke={c} />
      <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-2.82 1.17V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 8 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 14a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 7.7l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 10 4.6h.09A1.65 1.65 0 0 0 11 3.09V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 2.82 1.17l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 21 10.4h.09" stroke={c} />
    </>
  ),
  check: (c) => <Path d="M20 6 9 17l-5-5" stroke={c} />,
  close: (c) => <Path d="M18 6 6 18M6 6l12 12" stroke={c} />,
  message: (c) => <Path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" stroke={c} />,
  home: (c) => <Path d="M3 9.5 12 3l9 6.5M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" stroke={c} />,
  inbox: (c) => <Path d="M22 12h-6l-2 3h-4l-2-3H2M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z" stroke={c} />,
  flows: (c) => (
    <>
      <Circle cx={6} cy={18} r={3} stroke={c} />
      <Circle cx={18} cy={6} r={3} stroke={c} />
      <Path d="M6 15V9a3 3 0 0 1 3-3h6M18 9a9 9 0 0 1-9 9" stroke={c} />
    </>
  ),
  opps: (c) => (
    <>
      <Circle cx={12} cy={12} r={9} stroke={c} />
      <Circle cx={12} cy={12} r={4.5} stroke={c} />
    </>
  ),
  user: (c) => (
    <>
      <Path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" stroke={c} />
      <Circle cx={12} cy={7} r={4} stroke={c} />
    </>
  ),
  plus: (c) => <Path d="M12 5v14M5 12h14" stroke={c} />,
  chevronRight: (c) => <Path d="m9 18 6-6-6-6" stroke={c} />,
  chevronLeft: (c) => <Path d="m15 18-6-6 6-6" stroke={c} />,
  bell: (c) => <Path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0" stroke={c} />,
  sparkle: (c) => <Path d="M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5 10.1 11.9 4.5 10l5.6-1.4L12 3Z" stroke={c} />,
  chat: (c) => <Path d="M21 11.5a8 8 0 0 1-11.6 7.1L4 20l1.4-5.4A8 8 0 1 1 21 11.5Z" stroke={c} />,
  tag: (c) => (
    <>
      <Path d="M3 3h7l11 11-7 7L3 10z" stroke={c} />
      <Circle cx={7.5} cy={7.5} r={1.6} stroke={c} />
    </>
  ),
  link: (c) => (
    <>
      <Path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" stroke={c} />
      <Path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" stroke={c} />
    </>
  ),
  shield: (c) => <Path d="M12 2 4 5v6c0 5 3.4 8.5 8 10 4.6-1.5 8-5 8-10V5l-8-3Z" stroke={c} />,
  pipeline: (c) => <Path d="M4 6h16M7 12h10M10 18h4" stroke={c} />,
  automations: (c) => (
    <>
      <Circle cx={6} cy={6} r={2.3} stroke={c} />
      <Circle cx={18} cy={18} r={2.3} stroke={c} />
      <Circle cx={18} cy={6} r={2.3} stroke={c} />
      <Path d="M8.3 6H15M18 8.3v7.4M16.1 16.1 9 8.4" stroke={c} />
    </>
  ),
  orders: (c) => (
    <>
      <Path d="M6 8h12l-1 11.5a1 1 0 0 1-1 .9H8a1 1 0 0 1-1-.9Z" stroke={c} />
      <Path d="M9 8a3 3 0 0 1 6 0" stroke={c} />
    </>
  ),
  trendUp: (c) => <Path d="M4 19V5M4 19h16M7 15l4-5 3 3 4-6" stroke={c} />,
  target: (c) => (
    <>
      <Circle cx={12} cy={12} r={3} stroke={c} />
      <Path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke={c} />
    </>
  ),
  megaphone: (c) => (
    <>
      <Path d="M3 11l18-5v12L3 14v-3Z" stroke={c} />
      <Path d="M11.6 16.8A3 3 0 0 1 6 16" stroke={c} />
    </>
  ),
};

type Props = { name: IconName; size?: number; color?: string; strokeWidth?: number };

export function Icon({ name, size = 22, color = colors.text, strokeWidth = 2 }: Props) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {PATHS[name](color)}
    </Svg>
  );
}
