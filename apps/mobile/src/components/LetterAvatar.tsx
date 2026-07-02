import { View, Text, StyleSheet } from 'react-native';

// Seeded letter avatar — no profile photos exist in the data model, so the
// letter tile is a deliberate brand element: pastel background + deep letter
// in the same hue (mirrors the accentSoft/accentDeep pairing), hue seeded from
// the id so a contact keeps their color everywhere.
export function LetterAvatar({ id, name, size = 30 }: { id: string; name?: string | null; size?: number }) {
  const letter = (name?.trim() || id || '?').charAt(0).toUpperCase();
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  const hue = hash % 360;
  const bg = `hsl(${hue}, 55%, 91%)`;
  const fg = `hsl(${hue}, 45%, 38%)`;
  return (
    <View style={[styles.tile, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }]}>
      <Text style={[styles.letter, { color: fg, fontSize: size * 0.44 }]}>{letter}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { alignItems: 'center', justifyContent: 'center' },
  letter: { fontWeight: '600' },
});
