import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { Card } from '../../src/components/Card';
import { Chip } from '../../src/components/primitives';
import { colors, radius, space } from '../../src/theme';
import {
  useFunnelEntries,
  useDrawWinner,
  useDiscountCodes,
  useRedeemCode,
  useAbResults,
  type FunnelEntry,
  type DiscountCodeRow,
  type AbResult,
} from '../../src/api/hooks';

// Funnel Studio results viewer: giveaway entrants + "Draw a winner", discount
// code redemption tracker, A/B test result bars. Mirrors design/Mira.dc.html
// FUNNEL RESULTS section (~L625-675) — three independently-empty sections, all
// scoped to the funnel automation id passed in the route.

export default function FunnelResultsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const entriesQ = useFunnelEntries(id);
  const drawWinner = useDrawWinner(id);
  const codesQ = useDiscountCodes(id);
  const redeemCode = useRedeemCode(id);
  const abQ = useAbResults(id);

  const entries = entriesQ.data?.entries ?? [];
  const codes = codesQ.data?.codes ?? [];
  const results = abQ.data?.results ?? [];

  const winner = entries.find((e) => e.won) ?? null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <LinearGradient colors={colors.frame} style={StyleSheet.absoluteFill} />
      <ScreenHeader title="Funnel results" />
      <ScrollView
        contentContainerStyle={{ padding: space.xl, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Giveaway entries */}
        <Text style={styles.sectionLabel}>
          Giveaway · {entries.length} entrant{entries.length === 1 ? '' : 's'}
        </Text>
        <Card radius={radius.lg} style={styles.card}>
          <View style={styles.cardInner}>
            <Pressable
              onPress={() => drawWinner.mutate()}
              disabled={drawWinner.isPending || entries.length === 0}
              style={({ pressed }) => [
                styles.drawBtn,
                (drawWinner.isPending || entries.length === 0) && styles.drawBtnDisabled,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.drawBtnText}>
                {drawWinner.isPending ? 'Drawing…' : '🏆 Draw a winner'}
              </Text>
            </Pressable>

            {winner && (
              <View style={styles.winnerBanner}>
                <Text style={styles.winnerText}>
                  🏆 Winner: {winner.fromUsername ?? winner.fromUserId} (entry #{winner.entryNumber})
                </Text>
              </View>
            )}

            {entries.length === 0 ? (
              <Text style={styles.emptyText}>No entries yet.</Text>
            ) : (
              entries.map((e) => <EntryRow key={e.id} entry={e} />)
            )}
          </View>
        </Card>

        {/* Discount codes */}
        <Text style={[styles.sectionLabel, { marginTop: space.xl }]}>
          Discount codes · {codes.filter((c) => c.redeemedAt).length}/{codes.length} redeemed
        </Text>
        <Card radius={radius.lg} style={styles.card}>
          <View style={styles.cardInner}>
            {codes.length === 0 ? (
              <Text style={styles.emptyText}>No codes issued yet.</Text>
            ) : (
              codes.map((c) => (
                <CodeRow
                  key={c.id}
                  code={c}
                  onRedeem={() => redeemCode.mutate(c.code)}
                  redeeming={redeemCode.isPending && redeemCode.variables === c.code}
                />
              ))
            )}
          </View>
        </Card>

        {/* A/B results */}
        <Text style={[styles.sectionLabel, { marginTop: space.xl }]}>A/B test</Text>
        <Card radius={radius.lg} style={styles.card}>
          <View style={styles.cardInner}>
            {results.length === 0 ? (
              <Text style={styles.emptyText}>No A/B data yet.</Text>
            ) : (
              results.map((r) => <AbBar key={r.variant} result={r} />)
            )}
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}

function EntryRow({ entry }: { entry: FunnelEntry }) {
  return (
    <View style={styles.row}>
      <Text style={styles.entryNum}>{entry.entryNumber}</Text>
      <Text style={styles.entryWho} numberOfLines={1}>
        {entry.fromUsername ?? entry.fromUserId}
      </Text>
      {entry.won && <Chip label="Won" tone="warm" small />}
    </View>
  );
}

function CodeRow({
  code,
  onRedeem,
  redeeming,
}: {
  code: DiscountCodeRow;
  onRedeem: () => void;
  redeeming: boolean;
}) {
  const redeemed = !!code.redeemedAt;
  return (
    <View style={styles.row}>
      <Text style={styles.codeText}>{code.code}</Text>
      <Text style={styles.codeWho} numberOfLines={1}>
        {code.issuedToUsername ?? code.issuedTo}
      </Text>
      {redeemed ? (
        <Chip label="Redeemed" tone="done" small />
      ) : (
        <Pressable
          onPress={onRedeem}
          disabled={redeeming}
          style={({ pressed }) => [styles.redeemBtn, pressed && styles.pressed]}
        >
          <Text style={styles.redeemBtnText}>{redeeming ? 'Redeeming…' : 'Redeem'}</Text>
        </Pressable>
      )}
    </View>
  );
}

function AbBar({ result }: { result: AbResult }) {
  const rate = result.assigned > 0 ? Math.round((result.converted / result.assigned) * 100) : 0;
  return (
    <View style={styles.abRow}>
      <View style={styles.abHeader}>
        <Text style={styles.abLabel}>Variant {result.variant + 1}</Text>
        <Text style={styles.abSub}>
          {result.converted}/{result.assigned} · {rate}%
        </Text>
      </View>
      <View style={styles.abTrack}>
        <View style={[styles.abFill, { width: `${rate}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7, transform: [{ scale: 0.97 }] },

  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: space.sm,
  },

  card: { marginBottom: space.md },
  cardInner: { padding: space.lg },

  emptyText: { fontSize: 13, color: colors.textSubtle, textAlign: 'center', paddingVertical: space.md },

  drawBtn: {
    width: '100%',
    backgroundColor: colors.stBlocked,
    borderRadius: radius.md - 3,
    paddingVertical: 11,
    alignItems: 'center',
    marginBottom: space.sm,
  },
  drawBtnDisabled: { opacity: 0.5 },
  drawBtnText: { fontSize: 13.5, fontWeight: '500', color: '#fff' },

  winnerBanner: {
    backgroundColor: colors.accentSoft,
    borderRadius: radius.sm,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    marginBottom: space.sm,
  },
  winnerText: { fontSize: 13, fontWeight: '500', color: colors.accentDeep },

  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: 7 },
  entryNum: { fontSize: 11, fontWeight: '500', color: colors.textSubtle, width: 34 },
  entryWho: { fontSize: 13, color: colors.text, flex: 1 },

  codeText: { fontSize: 13, fontWeight: '500', color: colors.text },
  codeWho: { fontSize: 12, color: colors.textSubtle, flex: 1 },
  redeemBtn: {
    backgroundColor: 'rgba(184,121,28,0.14)',
    borderRadius: 7,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  redeemBtnText: { fontSize: 11, fontWeight: '500', color: colors.stWarm },

  abRow: { marginBottom: space.md },
  abHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  abLabel: { fontSize: 12.5, fontWeight: '500', color: colors.text },
  abSub: { fontSize: 12, color: colors.textMuted },
  abTrack: { height: 8, borderRadius: 5, backgroundColor: colors.bgInset, overflow: 'hidden' },
  abFill: { height: 8, borderRadius: 5, backgroundColor: colors.accent },
});
