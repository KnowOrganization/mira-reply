import { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { Icon } from './Icon';
import { colors } from '../theme';

// Instagram reply-window deadline as a glanceable chip. Hierarchy by silence:
// >12h renders nothing; 1-12h grey; <1h warm + slow pulse; both windows dead →
// blocked "Closed". One shared 30s tick app-wide, not per-card timers.

let tickListeners: (() => void)[] = [];
let tickTimer: ReturnType<typeof setInterval> | null = null;
function subscribeTick(fn: () => void) {
  tickListeners.push(fn);
  if (!tickTimer) tickTimer = setInterval(() => tickListeners.forEach((l) => l()), 30_000);
  return () => {
    tickListeners = tickListeners.filter((l) => l !== fn);
    if (!tickListeners.length && tickTimer) { clearInterval(tickTimer); tickTimer = null; }
  };
}

export type WindowInfo =
  | { state: 'open'; msLeft: number; label: string; urgent: boolean }
  | { state: 'closed' }
  | { state: 'silent' };

export function windowInfo(
  windowExpiresAt: number | null | undefined,
  humanAgentExpiresAt: number | null | undefined,
  now = Date.now(),
): WindowInfo {
  const best = Math.max(windowExpiresAt ?? 0, humanAgentExpiresAt ?? 0);
  if (!best) return { state: 'silent' }; // never had an inbound — nothing to count down
  const msLeft = best - now;
  if (msLeft <= 0) return { state: 'closed' };
  if (msLeft > 12 * 3_600_000) return { state: 'silent' };
  const h = Math.floor(msLeft / 3_600_000);
  const m = Math.floor((msLeft % 3_600_000) / 60_000);
  return { state: 'open', msLeft, label: h >= 1 ? `${h}h left` : `${m}m left`, urgent: msLeft < 3_600_000 };
}

/** true when a human reply would 409 (both windows closed) */
export function windowClosed(c: { window_expires_at: number | null; human_agent_window_expires_at: number | null }): boolean {
  const best = Math.max(c.window_expires_at ?? 0, c.human_agent_window_expires_at ?? 0);
  return best > 0 && best <= Date.now();
}

export function WindowChip({ windowExpiresAt, humanAgentExpiresAt }: {
  windowExpiresAt: number | null | undefined;
  humanAgentExpiresAt: number | null | undefined;
}) {
  const [, force] = useState(0);
  useEffect(() => subscribeTick(() => force((n) => n + 1)), []);

  const info = windowInfo(windowExpiresAt, humanAgentExpiresAt);
  const pulse = useRef(new Animated.Value(1)).current;
  const urgent = info.state === 'open' && info.urgent;
  useEffect(() => {
    if (!urgent) { pulse.setValue(1); return; }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.45, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [urgent, pulse]);

  if (info.state === 'silent') return null;
  if (info.state === 'closed') {
    return (
      <View style={[styles.chip, styles.closed]}>
        <Text style={[styles.label, styles.closedLabel]}>Closed</Text>
      </View>
    );
  }
  return (
    <Animated.View style={[styles.chip, info.urgent ? styles.warm : styles.grey, { opacity: pulse }]}>
      <Icon name="clock" size={10} color={info.urgent ? colors.stWarm : colors.textSubtle} />
      <Text style={[styles.label, { color: info.urgent ? colors.stWarm : colors.textMuted }]}>{info.label}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, height: 22, borderRadius: 999,
  },
  grey: { backgroundColor: colors.bgInset },
  warm: { backgroundColor: 'rgba(184,121,28,0.12)' },
  closed: { backgroundColor: colors.bgInset, opacity: 0.7 },
  label: { fontSize: 10.5, fontWeight: '600' },
  closedLabel: { color: colors.textSubtle },
});
