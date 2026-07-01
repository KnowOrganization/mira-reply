import { ScrollView, View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { Card } from '../src/components/Card';
import { Icon, type IconName } from '../src/components/Icon';
import { Chip, type ChipTone } from '../src/components/primitives';
import { colors, radius, space } from '../src/theme';
import { useCreateAutomation } from '../src/api/hooks';

// Templates gallery (doc: Mira.dc.html:1044-1067) — "Create blank" + a list of
// prebuilt-flow cards, each with icon/name/desc + step chips + "Use template".
// There's no templates table in the backend, so the definitions below are a
// static, hardcoded list (mirrors web's automation node-type union).

type TemplateDef = {
  id: string;
  name: string;
  desc: string;
  icon: IconName;
  chips: { label: string; tone: ChipTone }[];
};

const TEMPLATES: TemplateDef[] = [
  {
    id: 'welcome-dm',
    name: 'Welcome DM',
    desc: 'Greet new commenters and open the conversation in DMs.',
    icon: 'message',
    chips: [
      { label: 'Comment', tone: 'grey' },
      { label: 'Opening message', tone: 'accent' },
      { label: 'Follow-up', tone: 'grey' },
    ],
  },
  {
    id: 'giveaway',
    name: 'Giveaway',
    desc: 'Capture entrants from a comment trigger and confirm their entry by DM.',
    icon: 'sparkle',
    chips: [
      { label: 'Comment', tone: 'grey' },
      { label: 'Giveaway', tone: 'accent' },
      { label: 'Entry #', tone: 'done' },
    ],
  },
  {
    id: 'faq-auto-reply',
    name: 'FAQ auto-reply',
    desc: 'Answer common questions automatically with a public reply.',
    icon: 'inbox',
    chips: [
      { label: 'Comment', tone: 'grey' },
      { label: 'Comment reply', tone: 'accent' },
    ],
  },
  {
    id: 'discount-code-drop',
    name: 'Discount code drop',
    desc: 'Hand out a unique single-use code from a pool when someone comments.',
    icon: 'flows',
    chips: [
      { label: 'Comment', tone: 'grey' },
      { label: 'Discount code', tone: 'accent' },
      { label: 'DM', tone: 'grey' },
    ],
  },
  {
    id: 'lead-capture',
    name: 'Lead capture',
    desc: 'Ask a qualifying question, gate on follow, and collect a lead form.',
    icon: 'user',
    chips: [
      { label: 'DM', tone: 'grey' },
      { label: 'Follow gate', tone: 'warm' },
      { label: 'Lead form', tone: 'accent' },
    ],
  },
];

export default function Templates() {
  const router = useRouter();
  const createAutomation = useCreateAutomation();

  function goToNewFlow() {
    if (createAutomation.isPending) return;
    createAutomation.mutate(undefined, {
      onSuccess: ({ automation }) => {
        router.push(`/flow/${automation.id}`);
      },
    });
  }

  function useTemplate(_template: TemplateDef) {
    // TODO: prefill nodes from template — the create endpoint only accepts a
    // name today, so this creates a blank automation and opens it in the
    // builder, same as "Create blank", until the API can seed `template.id`'s
    // nodes/edges server-side.
    goToNewFlow();
  }

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
          onPress={goToNewFlow}
          disabled={createAutomation.isPending}
          style={({ pressed }) => [pressed && styles.pressed]}
        >
          <Card radius={radius.lg} style={styles.blankCard}>
            <View style={styles.blankIcon}>
              {createAutomation.isPending ? (
                <ActivityIndicator color={colors.accentFg} />
              ) : (
                <Icon name="plus" size={20} color={colors.accentFg} />
              )}
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
              onPress={() => useTemplate(t)}
              disabled={createAutomation.isPending}
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
