// TemplateGallery — reusable list of all 10 storefront templates.
// Used by store.tsx (empty-state gallery) and CustomizeSheet.tsx (change-template view).
// Each card: name + blurb, a coloured accent swatch, a "Preview" button (in-app browser
// via expo-web-browser) and a "Use this" / "Selected" action button.
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { STOREFRONT_TEMPLATES } from '@shaiz/shared';
import { colors, space, radius, shadow } from '../theme';
import { WEB_BASE } from '../auth';

/** Per-template accent swatch colours for visual distinction in the gallery. */
const ACCENTS: Record<string, string> = {
  't01-editorial': '#4f6bed',
  't02-brutalist': '#18181b',
  't03-luxe':      '#c9a96e',
  't04-neon':      '#00e5ff',
  't05-playful':   '#f43f5e',
  't06-magazine':  '#0891b2',
  't07-drop':      '#a855f7',
  't08-market':    '#f59e0b',
  't09-boutique':  '#71717a',
  't10-typo':      '#3b3b3b',
};

type Props = {
  /** Id of the currently-selected template (used to render the "Selected" / "Active" state). */
  current?: string;
  /** Called when the user taps "Use this" on a template. */
  onSelect: (id: string) => void;
};

export function TemplateGallery({ current, onSelect }: Props) {
  const origin = WEB_BASE.replace(/\/$/, '');

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.list}
    >
      {STOREFRONT_TEMPLATES.map((t) => {
        const isActive = current === t.id;
        const accentColor = ACCENTS[t.id] ?? colors.accent;

        return (
          <View
            key={t.id}
            style={[styles.card, isActive && styles.cardActive]}
          >
            {/* Header row: swatch + name + active badge */}
            <View style={styles.header}>
              <View style={[styles.swatch, { backgroundColor: accentColor }]} />
              <Text
                style={[styles.name, isActive && styles.nameActive]}
                numberOfLines={1}
              >
                {t.name}
              </Text>
              {isActive && (
                <View style={styles.activePill}>
                  <Text style={styles.activePillText}>Active</Text>
                </View>
              )}
            </View>

            {/* Blurb */}
            <Text style={styles.blurb} numberOfLines={2}>
              {t.blurb}
            </Text>

            {/* Action row */}
            <View style={styles.actions}>
              <Pressable
                style={({ pressed }) => [
                  styles.previewBtn,
                  pressed && { opacity: 0.7 },
                ]}
                onPress={() =>
                  WebBrowser.openBrowserAsync(`${origin}/s/preview/${t.id}`)
                }
              >
                <Text style={styles.previewBtnText}>Preview ↗</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.selectBtn,
                  isActive && styles.selectBtnActive,
                  pressed && !isActive && { opacity: 0.7 },
                ]}
                onPress={() => { if (!isActive) onSelect(t.id); }}
              >
                <Text
                  style={[
                    styles.selectBtnText,
                    isActive && styles.selectBtnTextActive,
                  ]}
                >
                  {isActive ? 'Selected' : 'Use this'}
                </Text>
              </Pressable>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: space.sm,
    paddingBottom: space.xxl,
  },

  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.bgElev,
    padding: space.md,
    gap: space.sm,
    ...shadow.card,
  },
  cardActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  swatch: {
    width: 22,
    height: 22,
    borderRadius: 6,
  },
  name: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    letterSpacing: -0.2,
  },
  nameActive: {
    color: colors.accentDeep,
  },
  activePill: {
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  activePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.accentFg,
    letterSpacing: 0.4,
  },

  blurb: {
    fontSize: 12.5,
    color: colors.textMuted,
    lineHeight: 17,
  },

  actions: {
    flexDirection: 'row',
    gap: space.sm,
    marginTop: space.xs,
  },
  previewBtn: {
    flex: 1,
    height: 36,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewBtnText: {
    fontSize: 12.5,
    fontWeight: '500',
    color: colors.textMuted,
  },
  selectBtn: {
    flex: 1,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.bgInset,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectBtnActive: {
    backgroundColor: colors.accentSoft,
  },
  selectBtnText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.text,
  },
  selectBtnTextActive: {
    color: colors.accentDeep,
  },
});
