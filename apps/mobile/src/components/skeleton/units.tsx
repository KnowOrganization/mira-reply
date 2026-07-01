import { View, StyleSheet } from 'react-native';
import { SkCard, SkLine, SkCircle, SkChip, SkThumb } from './primitives';
import { space, radius } from '../../theme';

// One blueprint per real card shape already built this session — each
// matches its screen's actual layout (Card radius, row structure, primitive
// placements) so the loading state reads as "this card, loading" rather than
// a generic gray block.

// ── Opportunities (app/(tabs)/opps.tsx) ───────────────────────────────────────
export function SkOppCard() {
  return (
    <SkCard radius={18} style={st.card}>
      <View style={st.row}>
        <SkCircle size={42} />
        <View style={st.flex}>
          <SkLine w="55%" h={14} />
          <SkLine w="35%" h={11} style={st.mt6} />
        </View>
        <SkCircle size={44} />
      </View>
      <View style={[st.row, st.mt12]}>
        <SkChip w={70} />
        <View style={st.spacer} />
        <SkLine w={50} h={16} />
      </View>
      <SkLine w="90%" h={12} style={st.mt12} />
      <SkLine w="60%" h={12} style={st.mt6} />
      <SkLine w="100%" h={2} style={st.mt16} />
      <SkLine w="100%" h={38} r={11} style={st.mt12} />
    </SkCard>
  );
}

// ── Flows / Automations (app/(tabs)/flows.tsx) ───────────────────────────────
export function SkFlowCard() {
  return (
    <SkCard radius={16} style={st.card}>
      <View style={st.row}>
        <SkThumb size={38} r={11} />
        <View style={st.flex}>
          <SkLine w="50%" h={14} />
        </View>
        <SkCircle size={18} />
      </View>
      <View style={[st.row, st.mt12]}>
        <SkChip w={64} />
        <SkChip w={50} style={st.ml6} />
        <SkChip w={50} style={st.ml6} />
      </View>
      <View style={[st.row, st.mt16]}>
        <SkLine w="40%" h={11} />
        <View style={st.spacer} />
        <View style={st.toggleBlock} />
      </View>
    </SkCard>
  );
}

// ── Inbox drafts (app/(tabs)/inbox.tsx) ───────────────────────────────────────
export function SkDraftCard() {
  return (
    <SkCard radius={18} style={st.card}>
      <View style={st.row}>
        <SkCircle size={38} />
        <View style={st.flex}>
          <SkLine w="40%" h={13} />
          <View style={[st.row, st.mt6]}>
            <SkLine w="30%" h={11} />
            <SkChip w={44} h={16} style={st.ml6} />
          </View>
        </View>
      </View>
      <SkLine w="100%" h={40} r={11} style={st.mt12} />
      <SkLine w="100%" h={50} r={11} style={st.mt12} />
      <View style={[st.row, st.mt12]}>
        <SkLine w="35%" h={11} />
        <View style={st.spacer} />
        <SkChip w={32} h={32} />
        <SkChip w={72} h={32} style={st.ml6} />
      </View>
    </SkCard>
  );
}

// ── Catalog / storefront products (app/catalog.tsx, app/store.tsx) ───────────
export function SkProductCard() {
  return (
    <SkCard radius={18} style={st.card}>
      <View style={st.row}>
        <SkThumb size={60} r={13} />
        <View style={[st.flex, st.justifyCenter]}>
          <SkLine w="65%" h={14} />
          <SkChip w={54} h={18} style={st.mt6} />
          <SkLine w="85%" h={11} style={st.mt6} />
        </View>
      </View>
    </SkCard>
  );
}

// ── Guard rules (app/guard.tsx) ───────────────────────────────────────────────
export function SkRuleCard() {
  return (
    <SkCard radius={16} style={st.card}>
      <View style={st.row}>
        <View style={st.flex}>
          <SkLine w="60%" h={14} />
        </View>
        <SkChip w={56} />
      </View>
      <View style={[st.row, st.mt12]}>
        <SkLine w="30%" h={11} />
        <View style={st.spacer} />
        <View style={st.toggleBlock} />
      </View>
    </SkCard>
  );
}

// ── Scheduled posts (app/publish.tsx) ─────────────────────────────────────────
export function SkScheduledCard() {
  return (
    <SkCard radius={18} style={st.card}>
      <View style={st.row}>
        <View style={st.flex}>
          <SkLine w="90%" h={13} />
          <SkLine w="60%" h={13} style={st.mt6} />
          <View style={[st.row, st.mt12]}>
            <SkChip w={70} />
            <SkChip w={56} style={st.ml6} />
          </View>
        </View>
        <SkThumb size={60} r={13} />
      </View>
    </SkCard>
  );
}

// ── Brain stat tiles / Home bento (app/brain.tsx, app/(tabs)/home.tsx) ───────
export function SkStatTile() {
  return (
    <SkCard radius={15} style={st.statTile}>
      <SkLine w={32} h={22} />
      <SkLine w="70%" h={11} style={st.mt6} />
    </SkCard>
  );
}

// ── Home hero (app/(tabs)/home.tsx) ───────────────────────────────────────────
export function SkHomeHero() {
  return (
    <SkCard radius={20} style={st.heroCard}>
      <SkLine w="45%" h={12} />
      <SkLine w="35%" h={48} style={st.mt12} />
      <View style={[st.row, st.mt16]}>
        <SkLine w={90} h={12} />
        <SkLine w={60} h={12} style={st.ml6} />
      </View>
    </SkCard>
  );
}

// ── Profile header (app/(tabs)/you.tsx) ───────────────────────────────────────
export function SkProfileHeader() {
  return (
    <View style={st.profileWrap}>
      <SkCircle size={88} />
      <SkLine w={140} h={18} style={st.mt12} />
      <SkLine w={100} h={13} style={st.mt6} />
    </View>
  );
}

const st = StyleSheet.create({
  card: { marginBottom: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  flex: { flex: 1 },
  spacer: { flex: 1 },
  justifyCenter: { justifyContent: 'center', gap: 0 },
  mt6: { marginTop: 6 },
  mt12: { marginTop: 12 },
  mt16: { marginTop: 16 },
  ml6: { marginLeft: 6 },
  toggleBlock: { width: 48, height: 29, borderRadius: radius.pill, backgroundColor: '#0000000d' },
  statTile: { flex: 1, alignItems: 'center', padding: 13 },
  heroCard: { padding: 20 },
  profileWrap: { alignItems: 'center', paddingVertical: 20 },
});
