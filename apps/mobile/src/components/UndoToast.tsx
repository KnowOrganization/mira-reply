import { useCallback, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, LayoutAnimation } from 'react-native';
import { colors, shadow } from '../theme';
import { haptics } from '../lib/haptics';

// Undo instead of confirm: a committed swipe hides the card immediately and
// arms a 4s timer behind this pill; Undo cancels the timer and the card
// springs back via LayoutAnimation. The mutation only fires when the timer
// lapses — so a "sent" card can never resurrect after the fact.

const UNDO_MS = 4_000;

type Pending = { id: string; label: string; commit: () => void };

export function usePendingAction() {
  const [pending, setPending] = useState<Pending | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const start = useCallback((p: Pending) => {
    // an earlier pending action commits immediately when a new one starts
    if (timer.current) { clearTimeout(timer.current); }
    setPending((prev) => { prev?.commit(); return p; });
    timer.current = setTimeout(() => {
      setPending((cur) => { if (cur?.id === p.id) { p.commit(); return null; } return cur; });
      timer.current = null;
    }, UNDO_MS);
  }, []);

  const undo = useCallback(() => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setPending(null);
    haptics.select();
  }, []);

  return { pending, start, undo, pendingId: pending?.id ?? null };
}

export function UndoToast({ label, onUndo }: { label: string; onUndo: () => void }) {
  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <View style={styles.pill}>
        <Text style={styles.label} numberOfLines={1}>{label}</Text>
        <Pressable onPress={onUndo} hitSlop={10}>
          <Text style={styles.undo}>Undo</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 108, alignItems: 'center' },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 16, height: 44, borderRadius: 999,
    backgroundColor: 'rgba(24,24,27,0.94)',
    maxWidth: '86%',
    ...shadow.pop,
  },
  label: { flexShrink: 1, fontSize: 13, color: '#fff' },
  undo: { fontSize: 13, fontWeight: '700', color: '#a5a8ff' },
});
