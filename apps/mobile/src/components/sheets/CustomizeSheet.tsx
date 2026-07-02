import { forwardRef, useImperativeHandle, useRef, useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet } from 'react-native';
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { Toggle } from '../primitives';
import { TemplateGallery } from '../TemplateGallery';
import { colors, radius, space } from '../../theme';
import type { StorefrontSettingsInput } from '@shaiz/shared';
import { STOREFRONT_TEMPLATES, DEFAULT_TEMPLATE } from '@shaiz/shared';

// Customize-shop sheet — template, store name, accent swatches, hero layout, headline/tagline,
// buy-label, currency, checkout toggle. The template section shows the current template name
// with a "Change template →" button that flips to the full TemplateGallery sub-view.
// Selecting in the gallery returns to the edit view with the new template applied.
export type CustomizeSheetHandle = { present: () => void; dismiss: () => void };

const SNAP_POINTS = ['92%'];
const SWATCHES = ['#5A5FE0', '#D14343', '#1F9D6B', '#B8791C', '#4346C0', '#18181B'];
const BUY_LABELS: NonNullable<StorefrontSettingsInput['storefrontBuyLabel']>[] = ['Buy', 'Shop', 'Order'];
const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP'] as const;

type Props = {
  initial: StorefrontSettingsInput;
  onSave: (patch: Partial<StorefrontSettingsInput>) => void;
};

export const CustomizeSheet = forwardRef<CustomizeSheetHandle, Props>(({ initial, onSave }, ref) => {
  const sheetRef = useRef<any>(null);
  const [view, setView] = useState<'edit' | 'gallery'>('edit');
  const [title, setTitle] = useState(initial.storefrontTitle ?? '');
  const [accent, setAccent] = useState(initial.storefrontAccent ?? SWATCHES[0]);
  const [layout, setLayout] = useState<'minimal' | 'split'>(initial.storefrontHeroLayout ?? 'split');
  const [headline, setHeadline] = useState(initial.storefrontHeroHeadline ?? '');
  const [tagline, setTagline] = useState(initial.storefrontHeroTagline ?? '');
  const [buyLabel, setBuyLabel] = useState(initial.storefrontBuyLabel ?? 'Buy');
  const [showFeatured, setShowFeatured] = useState(initial.storefrontShowFeatured ?? true);
  const [showAbout, setShowAbout] = useState(initial.storefrontShowAbout ?? false);
  const [templateId, setTemplateId] = useState(initial.storefrontTemplate ?? DEFAULT_TEMPLATE);
  const [currency, setCurrency] = useState<string>(initial.storefrontCurrency ?? 'INR');
  const [checkoutEnabled, setCheckoutEnabled] = useState(initial.storefrontCheckoutEnabled ?? false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'done'>('idle');

  useEffect(() => {
    setTitle(initial.storefrontTitle ?? '');
    setAccent(initial.storefrontAccent ?? SWATCHES[0]);
    setLayout(initial.storefrontHeroLayout ?? 'split');
    setHeadline(initial.storefrontHeroHeadline ?? '');
    setTagline(initial.storefrontHeroTagline ?? '');
    setBuyLabel(initial.storefrontBuyLabel ?? 'Buy');
    setShowFeatured(initial.storefrontShowFeatured ?? true);
    setShowAbout(initial.storefrontShowAbout ?? false);
    setTemplateId(initial.storefrontTemplate ?? DEFAULT_TEMPLATE);
    setCurrency(initial.storefrontCurrency ?? 'INR');
    setCheckoutEnabled(initial.storefrontCheckoutEnabled ?? false);
  }, [initial]);

  useImperativeHandle(ref, () => ({
    present: () => { setView('edit'); sheetRef.current?.present(); },
    dismiss: () => sheetRef.current?.dismiss(),
  }));

  function save() {
    if (saveState !== 'idle') return;
    setSaveState('saving');
    onSave({
      storefrontTitle: title.trim(),
      storefrontAccent: accent,
      storefrontHeroLayout: layout,
      storefrontHeroHeadline: headline.trim(),
      storefrontHeroTagline: tagline.trim(),
      storefrontBuyLabel: buyLabel,
      storefrontShowFeatured: showFeatured,
      storefrontShowAbout: showAbout,
      storefrontTemplate: templateId,
      storefrontCurrency: currency,
      storefrontCheckoutEnabled: checkoutEnabled,
    });
    setTimeout(() => setSaveState('done'), 700);
    setTimeout(() => {
      setSaveState('idle');
      sheetRef.current?.dismiss();
    }, 1800);
  }

  const saveBtnLabel =
    saveState === 'saving' ? 'Publishing…' :
    saveState === 'done'   ? 'Live now ✓' :
    'Save';

  const currentTemplateName =
    STOREFRONT_TEMPLATES.find((t) => t.id === templateId)?.name ?? templateId;

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={SNAP_POINTS}
      backdropComponent={(p) => <BottomSheetBackdrop {...p} appearsOnIndex={0} disappearsOnIndex={-1} />}
      backgroundStyle={styles.sheetBg}
      handleIndicatorStyle={styles.handle}
    >
      <BottomSheetView style={styles.body}>

        {/* ── Gallery sub-view ─────────────────────────────────────────────── */}
        {view === 'gallery' ? (
          <>
            {/* Gallery nav header */}
            <View style={styles.galleryNav}>
              <Pressable onPress={() => setView('edit')} style={styles.backBtn} hitSlop={12}>
                <Text style={styles.backBtnText}>← Back</Text>
              </Pressable>
              <Text style={styles.galleryTitle}>Choose template</Text>
              <View style={{ width: 60 }} />
            </View>
            <TemplateGallery
              current={templateId}
              onSelect={(id) => {
                setTemplateId(id);
                setView('edit');
              }}
            />
          </>
        ) : (
        /* ── Edit view ─────────────────────────────────────────────────────── */
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={styles.title}>Customize storefront</Text>

            {/* Template — current name + change button */}
            <Text style={styles.label}>Template</Text>
            <Pressable style={styles.templateRow} onPress={() => setView('gallery')}>
              <View style={styles.templateRowLeft}>
                <Text style={styles.templateRowName}>{currentTemplateName}</Text>
                <Text style={styles.templateRowHint} numberOfLines={1}>
                  {STOREFRONT_TEMPLATES.find((t) => t.id === templateId)?.blurb ?? ''}
                </Text>
              </View>
              <Text style={styles.changeTemplateBtn}>Change →</Text>
            </Pressable>

            {/* Store name */}
            <Text style={styles.label}>Store name</Text>
            <TextInput value={title} onChangeText={setTitle} placeholder="Shop"
              placeholderTextColor={colors.textSubtle} style={styles.input} />

            {/* Accent color */}
            <Text style={styles.label}>Accent color</Text>
            <View style={styles.swatchRow}>
              {SWATCHES.map((c) => (
                <Pressable key={c} onPress={() => setAccent(c)}
                  style={[styles.swatch, { backgroundColor: c }, accent === c && styles.swatchActive]} />
              ))}
            </View>

            {/* Hero layout */}
            <Text style={styles.label}>Hero layout</Text>
            <View style={styles.segment}>
              {(['minimal', 'split'] as const).map((l) => (
                <Pressable key={l} onPress={() => setLayout(l)}
                  style={[styles.segmentBtn, layout === l && styles.segmentBtnActive]}>
                  <Text style={[styles.segmentText, layout === l && styles.segmentTextActive]}>
                    {l === 'minimal' ? 'Minimal' : 'Split'}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Headline */}
            <Text style={styles.label}>Headline</Text>
            <TextInput value={headline} onChangeText={setHeadline}
              placeholder="Defaults to store name" placeholderTextColor={colors.textSubtle} style={styles.input} />

            {/* Tagline */}
            <Text style={styles.label}>Tagline</Text>
            <TextInput value={tagline} onChangeText={setTagline}
              placeholder="One line about your shop" placeholderTextColor={colors.textSubtle} style={styles.input} />

            {/* Buy button label */}
            <Text style={styles.label}>Buy button label</Text>
            <View style={styles.segment}>
              {BUY_LABELS.map((l) => (
                <Pressable key={l} onPress={() => setBuyLabel(l)}
                  style={[styles.segmentBtn, buyLabel === l && styles.segmentBtnActive]}>
                  <Text style={[styles.segmentText, buyLabel === l && styles.segmentTextActive]}>{l}</Text>
                </Pressable>
              ))}
            </View>

            {/* Currency */}
            <Text style={styles.label}>Currency</Text>
            <View style={styles.segment}>
              {CURRENCIES.map((c) => (
                <Pressable key={c} onPress={() => setCurrency(c)}
                  style={[styles.segmentBtn, currency === c && styles.segmentBtnActive]}>
                  <Text style={[styles.segmentText, currency === c && styles.segmentTextActive]}>{c}</Text>
                </Pressable>
              ))}
            </View>

            {/* Toggles */}
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Show featured rail</Text>
              <Toggle value={showFeatured} onValueChange={setShowFeatured} />
            </View>
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Show about section</Text>
              <Toggle value={showAbout} onValueChange={setShowAbout} />
            </View>
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Enable card checkout</Text>
              <Toggle value={checkoutEnabled} onValueChange={setCheckoutEnabled} />
            </View>

            {/* Save button */}
            <Pressable
              style={[
                styles.saveBtn,
                saveState === 'done' && { backgroundColor: colors.stDone },
                saveState === 'saving' && { opacity: 0.7 },
              ]}
              onPress={save}>
              <Text style={styles.saveBtnText}>{saveBtnLabel}</Text>
            </Pressable>
          </ScrollView>
        )}
      </BottomSheetView>
    </BottomSheetModal>
  );
});
CustomizeSheet.displayName = 'CustomizeSheet';

const styles = StyleSheet.create({
  sheetBg: { backgroundColor: colors.bgElev, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  handle: { backgroundColor: colors.borderStrong, width: 36 },
  body: { flex: 1, paddingHorizontal: space.xl, paddingTop: space.sm },

  // ── gallery sub-view ─────────────────────────────────────────────────────
  galleryNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.md,
    paddingTop: space.xs,
  },
  backBtn: { paddingVertical: 4 },
  backBtnText: { fontSize: 14, fontWeight: '500', color: colors.accent },
  galleryTitle: {
    fontSize: 15, fontWeight: '600', color: colors.text, letterSpacing: -0.2,
  },

  // ── edit view ────────────────────────────────────────────────────────────
  title: { fontSize: 17, fontWeight: '600', color: colors.text, marginBottom: space.lg },

  label: {
    fontSize: 11, fontWeight: '500', letterSpacing: 0.6,
    color: colors.textSubtle, textTransform: 'uppercase',
    marginBottom: 6, marginTop: space.md,
  },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 11,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14.5,
    color: colors.text, backgroundColor: colors.bgElev,
  },

  // template row (current template + change button)
  templateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 11,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.bgInset,
    gap: space.sm,
  },
  templateRowLeft: { flex: 1 },
  templateRowName: { fontSize: 14, fontWeight: '600', color: colors.text },
  templateRowHint: { fontSize: 11.5, color: colors.textMuted, marginTop: 2 },
  changeTemplateBtn: { fontSize: 13, fontWeight: '500', color: colors.accent },

  swatchRow: { flexDirection: 'row', gap: space.sm },
  swatch: { width: 32, height: 32, borderRadius: 16 },
  swatchActive: {
    borderWidth: 3, borderColor: colors.bgElev,
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 4, shadowOffset: { width: 0, height: 0 },
  },

  segment: {
    flexDirection: 'row', backgroundColor: colors.bgInset,
    borderRadius: 11, padding: 3,
  },
  segmentBtn: {
    flex: 1, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
  },
  segmentBtnActive: { backgroundColor: colors.bgElev },
  segmentText: { fontSize: 13, fontWeight: '500', color: colors.textMuted },
  segmentTextActive: { color: colors.text },

  toggleRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginTop: space.lg,
  },
  toggleLabel: { fontSize: 14, fontWeight: '500', color: colors.text },

  saveBtn: {
    height: 50, borderRadius: 14, backgroundColor: colors.text,
    alignItems: 'center', justifyContent: 'center',
    marginTop: space.xl, marginBottom: space.xl,
  },
  saveBtnText: { fontSize: 15, fontWeight: '600', color: colors.accentFg },
});
