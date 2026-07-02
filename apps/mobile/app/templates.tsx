import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { Card } from '../src/components/Card';
import { Icon } from '../src/components/Icon';
import { Chip } from '../src/components/primitives';
import { colors, radius, space } from '../src/theme';
import { TEMPLATES } from '../src/automationTemplates';

// Templates gallery (doc: Mira.dc.html:1044-1067) — "Create blank" + prebuilt
// flow cards. Pure navigation, zero API calls: both paths open the builder in
// DRAFT mode (/flow/new), and nothing is persisted until the user saves there.

export default function Templates() {
  const router = useRouter();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <LinearGradient colors={colors.frame} style={StyleSheet.absoluteFill} />
      <ScreenHeader title="Templates" />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.intro}>
          Start from a prebuilt flow — tap Use template to drop it into the builder.
        </Text>

        <Pressable
          onPress={() => router.push('/flow/new')}
          style={({ pressed }) => [pressed && styles.pressed]}
        >
          <Card radius={radius.lg} style={styles.blankCard}>
            <View style={styles.blankIcon}>
              <Icon name="plus" size={20} color={colors.accentFg} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.blankTitle}>Create blank</Text>
              <Text style={styles.blankSub}>Start with an empty canvas</Text>
            </View>
            <Icon name="chevronRight" size={18} color={colors.textSubtle} />
          </Card>
        </Pressable>

        {TEMPLATES.map((t) => (
          <Card key={t.id} radius={radius.lg} style={styles.templateCard}>
            <View style={styles.templateHead}>
              <View style={styles.templateIcon}>
                <Icon name={t.icon} size={19} color={colors.accentDeep} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.templateName}>{t.name}</Text>
                <Text style={styles.templateDesc}>{t.desc}</Text>
              </View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow} contentContainerStyle={{ gap: space.xs }}>
              {t.chips.map((cp, i) => (
                <View key={cp.label} style={styles.chipWrap}>
                  <Chip label={cp.label} tone={cp.tone} small />
                  {i < t.chips.length - 1 ? <Icon name="chevronRight" size={11} color={colors.textSubtle} /> : null}
                </View>
              ))}
            </ScrollView>

            <Pressable
              onPress={() => router.push(`/flow/new?template=${t.id}`)}
              style={({ pressed }) => [styles.useBtn, pressed && styles.pressed]}
            >
              <Text style={styles.useBtnText}>Use template</Text>
              <Icon name="chevronRight" size={14} color={colors.accentFg} />
            </Pressable>
          </Card>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.9 },

  intro: { fontSize: 13, color: colors.textMuted, lineHeight: 18.5, marginHorizontal: space.xs, marginBottom: space.md },

  blankCard: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    padding: 14, marginBottom: 11,
  },
  blankIcon: {
    width: 38, height: 38, borderRadius: 11, backgroundColor: colors.text,
    alignItems: 'center', justifyContent: 'center',
  },
  blankTitle: { fontSize: 14.5, fontWeight: '500', color: colors.text },
  blankSub: { fontSize: 12, color: colors.textSubtle, marginTop: 1 },

  templateCard: { padding: 14, marginBottom: 11 },
  templateHead: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  templateIcon: {
    width: 38, height: 38, borderRadius: 11, backgroundColor: colors.accentSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  templateName: { fontSize: 14.5, fontWeight: '500', color: colors.text },
  templateDesc: { fontSize: 12, color: colors.textMuted, marginTop: 2, lineHeight: 16.5 },

  chipsRow: { marginTop: 11 },
  chipWrap: { flexDirection: 'row', alignItems: 'center', gap: 5 },

  useBtn: {
    marginTop: 13, height: 38, borderRadius: 11, backgroundColor: colors.text,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  useBtnText: { fontSize: 13, fontWeight: '500', color: colors.accentFg },
});
