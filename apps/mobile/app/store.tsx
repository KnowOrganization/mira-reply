import { useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Icon } from '../src/components/Icon';
import { SkCard, SkLine } from '../src/components/skeleton/primitives';
import { TemplateGallery } from '../src/components/TemplateGallery';
import { CustomizeSheet, type CustomizeSheetHandle } from '../src/components/sheets/CustomizeSheet';
import { colors, space } from '../src/theme';
import { useIgSettings, usePatchIgSettings, useStatus } from '../src/api/hooks';
import { WEB_BASE } from '../src/auth';
import type { StorefrontSettingsInput } from '@shaiz/shared';

// Store preview — the owner opens the LIVE published storefront (same URL
// buyers visit) in an in-app browser sheet via expo-web-browser. The
// CustomizeSheet is the editor; changes show after save + reopen.
// ponytail: expo-web-browser (already a dep) instead of react-native-webview —
// the latter needs a native rebuild the running binary doesn't have.

type StoreSettings = StorefrontSettingsInput & {
  storefrontSlug?: string;
  storefrontEnabled?: boolean;
};

/** Derive a URL-safe store slug from an Instagram handle. */
function deriveSlug(username: string | null): string {
  if (!username) return 'store';
  const clean = username
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return clean || 'store';
}

export default function Store() {
  const router = useRouter();
  const customizeRef = useRef<CustomizeSheetHandle>(null);
  const { data: settings, isLoading } = useIgSettings<StoreSettings>();
  const { data: status } = useStatus();
  const patchSettings = usePatchIgSettings();

  const handle = status?.account?.username ?? null;
  const slug = settings?.storefrontSlug?.trim() ?? '';
  const enabled = !!settings?.storefrontEnabled;
  const settingsInput: StorefrontSettingsInput = settings ?? {};

  // "Store exists" = owner has explicitly picked a template.
  const hasTemplate = !!settings?.storefrontTemplate;

  // Storefront pages (/s/*) are served by the Next web app, reachable via the
  // public web origin (WEB_BASE) — not the API host (which may be localhost).
  const publicOrigin = WEB_BASE.replace(/\/$/, '');
  const storeUrl = slug ? `${publicOrigin}/s/${slug}` : null;
  const canPreview = !!storeUrl && enabled;

  const openStore = () => {
    if (storeUrl) WebBrowser.openBrowserAsync(storeUrl);
  };

  /** Called when the owner selects a template from the gallery.
   *  Derives a slug, patches settings, then opens the customizer. */
  function handleSelectTemplate(id: string) {
    const existingSlug = settings?.storefrontSlug?.trim();
    const newSlug = existingSlug || deriveSlug(handle);
    patchSettings.mutate({
      storefrontTemplate: id,
      storefrontEnabled: true,
      storefrontSlug: newSlug,
    });
    // Give the patch a moment to start, then open the customizer.
    setTimeout(() => customizeRef.current?.present(), 250);
  }

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <LinearGradient colors={colors.frame} style={StyleSheet.absoluteFill} />
        <View style={{ paddingHorizontal: space.xl, paddingTop: 60 }}>
          <SkLine w="60%" h={26} />
          <SkCard radius={16} style={{ marginTop: space.lg, padding: 20 }}>
            <SkLine w="100%" h={120} r={14} />
          </SkCard>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <LinearGradient colors={colors.frame} style={StyleSheet.absoluteFill} />

      {/* Native toolbar — browser chrome around the web page */}
      <View style={styles.toolbar}>
        <Pressable onPress={() => router.back()} style={styles.toolbarBack}>
          <Icon name="chevronLeft" size={20} color={colors.text} />
        </Pressable>
        <View style={styles.urlPill}>
          <Icon name="instagram" size={13} color={colors.textSubtle} />
          <Text style={styles.urlText} numberOfLines={1}>
            {slug ? `/s/${slug}` : `mira.shop/${handle ?? '—'}`}
          </Text>
        </View>
        <Pressable onPress={() => customizeRef.current?.present()} style={styles.editPill}>
          <Text style={styles.editPillText}>Edit</Text>
        </Pressable>
      </View>

      {/* Body — three states */}
      {!hasTemplate ? (
        // ── State 1: no template chosen yet — show the gallery ──────────────
        <View style={styles.galleryContainer}>
          <Text style={styles.galleryHeading}>Pick a template to start</Text>
          <Text style={styles.gallerySubheading}>
            Browse all 10 designs. Tap &quot;Preview&quot; to see a live demo, then &quot;Use this&quot; to pick one.
          </Text>
          <TemplateGallery onSelect={handleSelectTemplate} />
        </View>
      ) : canPreview ? (
        // ── State 2: template chosen + published — show the live store card ──
        <View style={styles.preview}>
          <Pressable style={styles.previewCard} onPress={openStore}>
            <View style={styles.previewIcon}>
              <Icon name="instagram" size={26} color={colors.accent} />
            </View>
            <Text style={styles.previewTitle}>Your store is live</Text>
            <Text style={styles.previewUrl} numberOfLines={1}>{`/s/${slug}`}</Text>
            <View style={styles.previewBtn}>
              <Text style={styles.previewBtnText}>Open live store</Text>
              <Icon name="chevronRight" size={16} color={colors.accentFg} />
            </View>
          </Pressable>
          <Text style={styles.previewHint}>
            Opens the same page buyers see. Edit, save, then reopen to view changes.
          </Text>
        </View>
      ) : (
        // ── State 3: template chosen but not published ──────────────────────
        <View style={styles.unpublished}>
          <View style={styles.unpublishedDot} />
          <Text style={styles.unpublishedTitle}>Store isn&apos;t live yet</Text>
          <Text style={styles.unpublishedBody}>
            {!slug
              ? 'Give your store a slug and enable publishing to preview the live storefront here.'
              : 'Enable publishing in the editor to see the live preview here.'}
          </Text>
          <Pressable style={styles.editPill} onPress={() => customizeRef.current?.present()}>
            <Text style={styles.editPillText}>Open editor</Text>
          </Pressable>
        </View>
      )}

      <CustomizeSheet
        ref={customizeRef}
        initial={settingsInput}
        onSave={(patch) => patchSettings.mutate(patch)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: 'row', alignItems: 'center', gap: space.sm,
    paddingHorizontal: space.lg, paddingTop: 56, paddingBottom: space.sm,
  },
  toolbarBack: {
    width: 34, height: 34, borderRadius: 11,
    backgroundColor: colors.bgElev, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  urlPill: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6,
    height: 34, paddingHorizontal: 12, borderRadius: 10, backgroundColor: colors.bgInset,
  },
  urlText: { fontSize: 12.5, color: colors.textMuted, flex: 1 },
  editPill: {
    height: 34, paddingHorizontal: 13, borderRadius: 10,
    backgroundColor: colors.text, alignItems: 'center', justifyContent: 'center',
  },
  editPillText: { fontSize: 13, fontWeight: '600', color: colors.accentFg },

  // ── gallery (no-template state) ──────────────────────────────────────────
  galleryContainer: {
    flex: 1,
    paddingHorizontal: space.xl,
    paddingTop: space.lg,
  },
  galleryHeading: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.4,
    marginBottom: space.xs,
  },
  gallerySubheading: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
    marginBottom: space.md,
  },

  // ── live store card (published state) ───────────────────────────────────
  preview: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: space.xl, gap: space.md,
  },
  previewCard: {
    width: '100%', alignItems: 'center', gap: space.xs,
    paddingVertical: 32, paddingHorizontal: 20, borderRadius: 20,
    backgroundColor: colors.bgElev, borderWidth: 1, borderColor: colors.border,
  },
  previewIcon: {
    width: 56, height: 56, borderRadius: 18, marginBottom: space.sm,
    backgroundColor: colors.bgInset, alignItems: 'center', justifyContent: 'center',
  },
  previewTitle: {
    fontSize: 17, fontWeight: '600', color: colors.text, letterSpacing: -0.3,
  },
  previewUrl: { fontSize: 13, color: colors.textMuted },
  previewBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: space.md,
    height: 42, paddingHorizontal: 20, borderRadius: 12, backgroundColor: colors.text,
  },
  previewBtnText: { fontSize: 14, fontWeight: '600', color: colors.accentFg },
  previewHint: {
    fontSize: 12.5, color: colors.textSubtle, textAlign: 'center',
    lineHeight: 18, maxWidth: 280,
  },

  // ── unpublished placeholder ──────────────────────────────────────────────
  unpublished: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: space.xl, gap: space.sm,
  },
  unpublishedDot: {
    width: 48, height: 48, borderRadius: 16,
    backgroundColor: colors.bgInset, marginBottom: space.md,
  },
  unpublishedTitle: {
    fontSize: 17, fontWeight: '600', color: colors.text, letterSpacing: -0.3,
  },
  unpublishedBody: {
    fontSize: 14, color: colors.textMuted, textAlign: 'center',
    lineHeight: 20, maxWidth: 280,
  },
});
