import { forwardRef, useImperativeHandle, useRef, useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet } from 'react-native';
import BottomSheetModal, { BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { Toggle } from '../primitives';
import { colors, space } from '../../theme';
import type { StorefrontSettingsInput } from '@shaiz/shared';

// Customize-shop sheet (doc: Mira.dc.html:1369-1405) — store name, 6 accent
// swatches, hero-layout segment, headline/tagline, buy-label segment,
// show-featured/show-about toggles. Storefront's preview lives on the page;
// this sheet is the editor.
export type CustomizeSheetHandle = { present: () => void; dismiss: () => void };

const SWATCHES = ['#5A5FE0', '#D14343', '#1F9D6B', '#B8791C', '#4346C0', '#18181B'];
const BUY_LABELS: NonNullable<StorefrontSettingsInput['storefrontBuyLabel']>[] = ['Buy', 'Shop', 'Order'];
// Module-level, not inline — see SettingsSheet.tsx for why a fresh array
// literal per render is unsafe with @gorhom/bottom-sheet's snapPoints.
const SNAP_POINTS = ['85%'];

type Props = {
  initial: StorefrontSettingsInput;
  onSave: (patch: Partial<StorefrontSettingsInput>) => void;
};

export const CustomizeSheet = forwardRef<CustomizeSheetHandle, Props>(({ initial, onSave }, ref) => {
  const sheetRef = useRef<any>(null);
  const [title, setTitle] = useState(initial.storefrontTitle ?? '');
  const [accent, setAccent] = useState(initial.storefrontAccent ?? SWATCHES[0]);
  const [layout, setLayout] = useState<'minimal' | 'split'>(initial.storefrontHeroLayout ?? 'split');
  const [headline, setHeadline] = useState(initial.storefrontHeroHeadline ?? '');
  const [tagline, setTagline] = useState(initial.storefrontHeroTagline ?? '');
  const [buyLabel, setBuyLabel] = useState(initial.storefrontBuyLabel ?? 'Buy');
  const [showFeatured, setShowFeatured] = useState(initial.storefrontShowFeatured ?? true);
  const [showAbout, setShowAbout] = useState(initial.storefrontShowAbout ?? false);

  useEffect(() => {
    setTitle(initial.storefrontTitle ?? '');
    setAccent(initial.storefrontAccent ?? SWATCHES[0]);
    setLayout(initial.storefrontHeroLayout ?? 'split');
    setHeadline(initial.storefrontHeroHeadline ?? '');
    setTagline(initial.storefrontHeroTagline ?? '');
    setBuyLabel(initial.storefrontBuyLabel ?? 'Buy');
    setShowFeatured(initial.storefrontShowFeatured ?? true);
    setShowAbout(initial.storefrontShowAbout ?? false);
  }, [initial]);

  useImperativeHandle(ref, () => ({
    present: () => sheetRef.current?.present(),
    dismiss: () => sheetRef.current?.dismiss(),
  }));

  function save() {
    onSave({
      storefrontTitle: title.trim(),
      storefrontAccent: accent,
      storefrontHeroLayout: layout,
      storefrontHeroHeadline: headline.trim(),
      storefrontHeroTagline: tagline.trim(),
      storefrontBuyLabel: buyLabel,
      storefrontShowFeatured: showFeatured,
      storefrontShowAbout: showAbout,
    });
    sheetRef.current?.dismiss();
  }

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={SNAP_POINTS}
      backdropComponent={(p) => <BottomSheetBackdrop {...p} appearsOnIndex={0} disappearsOnIndex={-1} />}
      backgroundStyle={styles.sheetBg}
      handleIndicatorStyle={styles.handle}
    >
      <BottomSheetView style={styles.body}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Customize storefront</Text>

          <Text style={styles.label}>Store name</Text>
          <TextInput value={title} onChangeText={setTitle} placeholder="Shop" placeholderTextColor={colors.textSubtle} style={styles.input} />

          <Text style={styles.label}>Accent color</Text>
          <View style={styles.swatchRow}>
            {SWATCHES.map((c) => (
              <Pressable key={c} onPress={() => setAccent(c)} style={[styles.swatch, { backgroundColor: c }, accent === c && styles.swatchActive]} />
            ))}
          </View>

          <Text style={styles.label}>Hero layout</Text>
          <View style={styles.segment}>
            {(['minimal', 'split'] as const).map((l) => (
              <Pressable key={l} onPress={() => setLayout(l)} style={[styles.segmentBtn, layout === l && styles.segmentBtnActive]}>
                <Text style={[styles.segmentText, layout === l && styles.segmentTextActive]}>{l === 'minimal' ? 'Minimal' : 'Split'}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Headline</Text>
          <TextInput value={headline} onChangeText={setHeadline} placeholder="Defaults to store name" placeholderTextColor={colors.textSubtle} style={styles.input} />

          <Text style={styles.label}>Tagline</Text>
          <TextInput value={tagline} onChangeText={setTagline} placeholder="One line about your shop" placeholderTextColor={colors.textSubtle} style={styles.input} />

          <Text style={styles.label}>Buy button label</Text>
          <View style={styles.segment}>
            {BUY_LABELS.map((l) => (
              <Pressable key={l} onPress={() => setBuyLabel(l)} style={[styles.segmentBtn, buyLabel === l && styles.segmentBtnActive]}>
                <Text style={[styles.segmentText, buyLabel === l && styles.segmentTextActive]}>{l}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Show featured rail</Text>
            <Toggle value={showFeatured} onValueChange={setShowFeatured} />
          </View>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Show about section</Text>
            <Toggle value={showAbout} onValueChange={setShowAbout} />
          </View>

          <Pressable style={styles.saveBtn} onPress={save}>
            <Text style={styles.saveBtnText}>Save</Text>
          </Pressable>
        </ScrollView>
      </BottomSheetView>
    </BottomSheetModal>
  );
});
CustomizeSheet.displayName = 'CustomizeSheet';

const styles = StyleSheet.create({
  sheetBg: { backgroundColor: colors.bgElev, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  handle: { backgroundColor: colors.borderStrong, width: 36 },
  body: { flex: 1, paddingHorizontal: space.xl, paddingTop: space.sm },
  title: { fontSize: 17, fontWeight: '600', color: colors.text, marginBottom: space.lg },

  label: { fontSize: 11, fontWeight: '500', letterSpacing: 0.6, color: colors.textSubtle, textTransform: 'uppercase', marginBottom: 6, marginTop: space.md },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 11,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14.5, color: colors.text, backgroundColor: colors.bgElev,
  },

  swatchRow: { flexDirection: 'row', gap: space.sm },
  swatch: { width: 32, height: 32, borderRadius: 16 },
  swatchActive: { borderWidth: 3, borderColor: colors.bgElev, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 4, shadowOffset: { width: 0, height: 0 } },

  segment: { flexDirection: 'row', backgroundColor: colors.bgInset, borderRadius: 11, padding: 3 },
  segmentBtn: { flex: 1, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  segmentBtnActive: { backgroundColor: colors.bgElev },
  segmentText: { fontSize: 13, fontWeight: '500', color: colors.textMuted },
  segmentTextActive: { color: colors.text },

  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.lg },
  toggleLabel: { fontSize: 14, fontWeight: '500', color: colors.text },

  saveBtn: { height: 50, borderRadius: 14, backgroundColor: colors.text, alignItems: 'center', justifyContent: 'center', marginTop: space.xl, marginBottom: space.xl },
  saveBtnText: { fontSize: 15, fontWeight: '600', color: colors.accentFg },
});
