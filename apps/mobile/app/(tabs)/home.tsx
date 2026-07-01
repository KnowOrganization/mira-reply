import { ScrollView, View, Text, Image, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Card } from '../../src/components/Card';
import { Glass } from '../../src/components/Glass';
import { Icon, type IconName } from '../../src/components/Icon';
import { VizArt, type VizArtKind } from '../../src/components/VizArt';
import { colors, radius, space, shadow } from '../../src/theme';
import {
  useStatus,
  useDashboard,
  useProducts,
  useAutomations,
  useFlaggedModeration,
  useOpportunities,
  useScheduledPosts,
} from '../../src/api/hooks';
import { SkHomeHero } from '../../src/components/skeleton/units';

// Home: solid-white coverage hero + inbox CTA + bento cards (first 4) + storefront
// + a plain list section (last 4) — capping the bento-card rhythm at 4 instead of
// spreading 8 tiles across identical cards, per user feedback ("all cards and
// cards and cards"). Command Center + Campaigns dropped entirely (also per
// feedback) — their routes (app/cmd.tsx, app/campaigns.tsx) stay on disk, just
// lose their Home entry point.
type Tile = { route: string; label: string; icon: IconName; viz: VizArtKind; danger?: boolean };
const CARD_TILES: Tile[] = [
  { route: '/(tabs)/opps', label: 'Pipeline', icon: 'pipeline', viz: 'bars' },
  { route: '/(tabs)/flows', label: 'Automations', icon: 'automations', viz: 'dots' },
  { route: '/guard', label: 'Guard', icon: 'shield', viz: 'dots', danger: true },
  { route: '/orders', label: 'Orders', icon: 'orders', viz: 'line' },
];
const LIST_TILES: Tile[] = [
  { route: '/catalog', label: 'Catalog', icon: 'sparkle', viz: 'bars' },
  { route: '/analytics', label: 'Analytics', icon: 'trendUp', viz: 'line' },
  { route: '/publish', label: 'Schedule', icon: 'send', viz: 'line' },
  { route: '/brain', label: 'Brain', icon: 'opps', viz: 'ring' },
];

// Ticket-notch "bite" count for the storefront divider (Mira.dc.html:219) — RN has
// no CSS mask, so we approximate the scalloped perforation with a row of small
// circles in the card's background color, spaced ~28px apart (doc's mask tile size).
const STORE_NOTCH_COUNT = 13;

const GUARD_TILE_BG = 'rgba(209,67,67,0.13)';

// /api/ig/dashboard shape (apps/api/src/services/analytics-service.ts getDashboard) —
// only the fields this screen renders.
type Dashboard = {
  coverage: number;
  totalReplies: number;
  totalComments: number;
  knowledge: { total: number };
};

// Doc's per-tile metric/sub-caption (Mira.dc.html:2016-2028), backed by real hooks
// where one exists; Orders has no real payments pipeline so it stays static.
type HomeData = {
  dash?: Dashboard;
  flowsActive: number;
  flaggedCount: number;
  pipelineValue: number;
  scheduledCount: number;
  productCount: number;
  inStockCount: number;
};
function tileMeta(route: string, d: HomeData): { metric: string; sub: string } {
  switch (route) {
    case '/brain':
      return { metric: String(d.dash?.knowledge.total ?? 0), sub: 'facts learned' };
    case '/(tabs)/opps':
      return { metric: `$${d.pipelineValue}`, sub: 'open value' };
    case '/(tabs)/flows':
      return { metric: String(d.flowsActive), sub: 'active flows' };
    case '/guard':
      return { metric: String(d.flaggedCount), sub: 'flagged' };
    case '/orders':
      return { metric: '0', sub: 'new orders' };
    case '/catalog':
      return { metric: String(d.productCount), sub: `${d.inStockCount} in stock` };
    case '/analytics':
      return { metric: `${d.dash?.coverage ?? 0}%`, sub: 'comments covered' };
    case '/publish':
      return { metric: String(d.scheduledCount), sub: 'post · schedule' };
    default:
      return { metric: '—', sub: '' };
  }
}

// Placeholder draft-avatar peek for the Inbox CTA row (Mira.dc.html:192) — no
// drafts-peek hook is imported in this file yet.
// TODO: wire real draft avatars once a peek hook exists
const DRAFT_PEEK_BG = [colors.accent, colors.accentDeep, colors.stProgress];

export default function Home() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: status, isLoading } = useStatus();
  const { data: dash } = useDashboard<Dashboard>();
  const { data: productsData } = useProducts();
  const { data: automationsData } = useAutomations();
  const { data: flaggedData } = useFlaggedModeration();
  const { data: oppsData } = useOpportunities();
  const { data: scheduledData } = useScheduledPosts();
  const products = productsData?.products ?? [];
  const inStockCount = products.filter((p) => p.available).length;
  const homeData: HomeData = {
    dash,
    flowsActive: (automationsData?.automations ?? []).filter((a) => a.enabled).length,
    flaggedCount: (flaggedData?.flagged ?? []).length,
    pipelineValue: (oppsData?.opportunities ?? [])
      .filter((o) => o.status !== 'won' && o.status !== 'lost')
      .reduce((sum, o) => sum + (o.value_estimate ?? 0), 0),
    scheduledCount: (scheduledData?.posts ?? []).filter((p) => p.status === 'scheduled').length,
    productCount: products.length,
    inStockCount,
  };
  const live = !!status?.connected;
  const handle = status?.account?.username;
  const pct = dash?.coverage ?? (live ? 100 : 0);
  const initials = handle ? handle.slice(0, 2).toUpperCase() : null;
  const pendingCount = status?.pendingCount ?? 0;

  return (
    <View style={styles.root}>
      <LinearGradient colors={colors.frame} style={StyleSheet.absoluteFill} />
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: space.xl,
          paddingTop: insets.top + space.lg,
          paddingBottom: 120,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Good evening</Text>
          <Pressable onPress={() => router.navigate('/(tabs)/you' as never)}>
            <Glass variant="light" radius={20} style={styles.avatar}>
              {initials ? (
                <Text style={styles.avatarText}>{initials}</Text>
              ) : (
                <Icon name="user" size={18} color={colors.accentDeep} />
              )}
            </Glass>
          </Pressable>
        </View>

        {/* Hero — comment coverage */}
        {isLoading && !status ? (
          <SkHomeHero />
        ) : (
          <Card glow radius={20} style={styles.hero}>
            <Text style={styles.heroEyebrow}>Here's how Mira is handling things</Text>
            <View style={styles.heroNumberRow}>
              <Text style={styles.heroNumber}>{pct}%</Text>
              <Text style={styles.heroNumberLabel}>of comments{'\n'}covered</Text>
            </View>
            <View style={styles.statsRow}>
              <Text style={styles.statText}>
                <Text style={styles.statValue}>{dash?.totalReplies ?? 0}</Text> replies
              </Text>
              <Text style={styles.statText}>
                <Text style={styles.statValue}>{dash?.totalComments ?? 0}</Text> comments
              </Text>
              <Text style={styles.statText}>
                <Text style={styles.statValue}>{dash?.knowledge.total ?? 0}</Text> facts
              </Text>
            </View>
          </Card>
        )}

        {/* Inbox CTA */}
        <Pressable
          onPress={() => router.navigate('/(tabs)/inbox' as never)}
          style={({ pressed }) => [styles.ctaWrap, pressed && styles.pressed]}
        >
          <Card radius={20} style={styles.ctaCard}>
            <View style={styles.ctaTile}>
              <Icon name="message" size={22} color={colors.accentFg} />
            </View>
            <View style={styles.ctaText}>
              <View style={styles.ctaTitleRow}>
                <Text style={styles.ctaTitle}>Inbox</Text>
                <View style={styles.ctaBadge}>
                  <Text style={styles.ctaBadgeText}>{pendingCount} new</Text>
                </View>
              </View>
              <Text style={styles.ctaSub}>Review drafts & DMs</Text>
            </View>
            <View style={styles.ctaAvatars}>
              {DRAFT_PEEK_BG.map((bg, i) => (
                <View
                  key={i}
                  style={[styles.ctaAvatar, { backgroundColor: bg, marginLeft: i === 0 ? 0 : -8 }]}
                >
                  <Icon name="user" size={13} color={colors.accentFg} />
                </View>
              ))}
            </View>
            <Icon name="chevronRight" size={20} color={colors.textSubtle} />
          </Card>
        </Pressable>

        {/* Bento tiles — capped at 4 */}
        <View style={styles.grid}>
          {CARD_TILES.map((t) => {
            const meta = tileMeta(t.route, homeData);
            const isTab = t.route.startsWith('/(tabs)/');
            return (
              <Pressable
                key={t.route}
                onPress={() =>
                  isTab ? router.navigate(t.route as never) : router.push(t.route as never)
                }
                style={({ pressed }) => [styles.tileWrap, pressed && styles.pressed]}
              >
                <Card radius={18} style={styles.tile}>
                  <View
                    style={[styles.tileIcon, t.danger && styles.tileIconDanger]}
                  >
                    <Icon
                      name={t.icon}
                      size={18}
                      color={t.danger ? colors.stBlocked : colors.accentDeep}
                    />
                  </View>
                  <View style={styles.tileViz}>
                    <VizArt
                      kind={t.viz}
                      color={t.danger ? colors.stBlocked : colors.accentDeep}
                    />
                  </View>
                  <View style={styles.spacer} />
                  <View>
                    <Text style={[styles.tileMetric, t.danger && styles.tileMetricDanger]}>
                      {meta.metric}
                    </Text>
                    <Text style={styles.tileLabel}>{t.label}</Text>
                    <Text style={styles.tileSub}>{meta.sub}</Text>
                  </View>
                </Card>
              </Pressable>
            );
          })}
        </View>

        {/* Storefront — dark gradient header + ticket-notch divider + product
            strip + footer caption (Mira.dc.html:210-230). */}
        <Pressable
          onPress={() => router.push('/store' as never)}
          style={({ pressed }) => [styles.storeWrap, pressed && styles.pressed]}
        >
          <Card radius={18} style={styles.storeCard}>
            <LinearGradient
              colors={[colors.accent, colors.accentDeep]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0.7, y: 1 }}
              style={styles.storeHeader}
            >
              <View style={styles.storeHeaderIcon}>
                <Icon name="sparkle" size={18} color="#fff" />
              </View>
              <View style={styles.storeHeaderText}>
                <View style={styles.storeHeaderTitleRow}>
                  <Text style={styles.storeHeaderTitle}>Storefront</Text>
                  <View style={styles.storeLiveBadge}>
                    <View style={styles.storeLiveDot} />
                    <Text style={styles.storeLiveText}>Live</Text>
                  </View>
                </View>
              </View>
              <Icon name="chevronRight" size={18} color="rgba(255,255,255,0.85)" />
            </LinearGradient>

            {/* ticket-notch perforation (CSS mask approximated with bg-colored bites) */}
            <View style={styles.storeNotchRow} pointerEvents="none">
              {Array.from({ length: STORE_NOTCH_COUNT }).map((_, i) => (
                <View key={i} style={styles.storeNotchDot} />
              ))}
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.storeScrollContent}
            >
              {(products.length > 0 ? products.slice(0, 6) : [null, null, null, null]).map(
                (p, i) =>
                  p ? (
                    <View key={p.id} style={styles.storeThumbWrap}>
                      {p.imageUrl ? (
                        <Image source={{ uri: p.imageUrl }} style={styles.storeThumb} />
                      ) : (
                        <View style={styles.storeThumbPlaceholder}>
                          <Text style={styles.storeThumbMonogram}>
                            {p.title.trim() ? p.title.trim()[0].toUpperCase() : '?'}
                          </Text>
                        </View>
                      )}
                      <Text style={styles.storeThumbTitle} numberOfLines={1}>
                        {p.title}
                      </Text>
                      {p.priceText ? (
                        <Text style={styles.storeThumbPrice}>{p.priceText}</Text>
                      ) : null}
                    </View>
                  ) : (
                    // TODO: wire real products — placeholder while catalog is empty
                    <View key={`ph-${i}`} style={styles.storeThumbWrap}>
                      <View style={styles.storeThumbPlaceholder}>
                        <Icon name="sparkle" size={18} color={colors.accentDeep} />
                      </View>
                    </View>
                  ),
              )}
            </ScrollView>

            <View style={styles.storeFooter}>
              <Text style={styles.storeFooterText}>
                {/* TODO: wire real in-stock + auto-build status once available */}
                {products.length} products · {inStockCount} in stock · auto-built from your
                catalog
              </Text>
            </View>
          </Card>
        </Pressable>

        {/* More — plain list rows, not bento cards (deliberate visual break from
            the card grid above; reuses the same hairline-row pattern as
            app/catalog.tsx and app/contacts.tsx). */}
        <View style={styles.listSection}>
          {LIST_TILES.map((t, i) => {
            const meta = tileMeta(t.route, homeData);
            return (
              <Pressable
                key={t.route}
                onPress={() => router.push(t.route as never)}
                style={({ pressed }) => [
                  styles.listRow,
                  i < LIST_TILES.length - 1 && styles.listRowDivider,
                  pressed && styles.pressed,
                ]}
              >
                <View style={[styles.listIcon, t.danger && styles.tileIconDanger]}>
                  <Icon name={t.icon} size={17} color={t.danger ? colors.stBlocked : colors.accentDeep} />
                </View>
                <View style={styles.listBody}>
                  <Text style={styles.listLabel}>{t.label}</Text>
                  <Text style={styles.listSub}>{meta.sub}</Text>
                </View>
                <Text style={styles.listMetric}>{meta.metric}</Text>
                <Icon name="chevronRight" size={16} color={colors.textSubtle} />
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  pressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },

  // header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.lg,
  },
  eyebrow: { fontSize: 15, fontWeight: '500', color: colors.text },
  avatar: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 14, fontWeight: '600', color: colors.accentDeep },

  // hero
  hero: { marginTop: space.xl, padding: 20 },
  heroEyebrow: { fontSize: 12.5, fontWeight: '500', color: colors.textSubtle },
  heroNumberRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 11,
    marginTop: space.xs,
  },
  heroNumber: {
    fontSize: 60,
    fontWeight: '500',
    letterSpacing: -2,
    color: colors.text,
    // lineHeight must be >= fontSize in RN or large glyphs (esp. numerals)
    // get clipped at the top — doc's CSS line-height:.82 doesn't translate
    // safely here, so this trades exact ratio for correct rendering.
    lineHeight: 64,
  },
  heroNumberLabel: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 8,
    lineHeight: 17,
  },
  statsRow: { flexDirection: 'row', gap: 22, marginTop: 16 },
  statText: { fontSize: 12.5, color: colors.textMuted },
  statValue: { fontSize: 12.5, fontWeight: '600', color: colors.text },

  // inbox CTA
  ctaWrap: { marginTop: space.md },
  ctaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
  },
  ctaTile: {
    width: 46,
    height: 46,
    borderRadius: 13,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.card,
  },
  ctaText: { flex: 1 },
  ctaTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ctaTitle: { fontSize: 17, fontWeight: '500', color: colors.text },
  ctaBadge: {
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  ctaBadgeText: { fontSize: 11, fontWeight: '500', color: colors.accentFg },
  ctaSub: { fontSize: 12.5, color: colors.textMuted, marginTop: 2 },
  ctaAvatars: { flexDirection: 'row', alignItems: 'center', marginRight: 9 },
  ctaAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.bgElev,
  },

  // bento grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 11,
    marginTop: space.md,
  },
  tileWrap: { width: '48%' },
  tile: { padding: 15, minHeight: 142, flexDirection: 'column' },
  tileIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileIconDanger: { backgroundColor: GUARD_TILE_BG },
  tileViz: { marginTop: 13 },
  spacer: { flex: 1 },
  tileMetric: { fontSize: 23, fontWeight: '500', letterSpacing: -0.69, color: colors.text, lineHeight: 23 },
  tileMetricDanger: { color: colors.stBlocked },
  tileLabel: { fontSize: 13.5, fontWeight: '500', color: colors.text, marginTop: 6 },
  tileSub: { fontSize: 12, color: colors.textSubtle, marginTop: 1 },

  // "more" list section — plain rows, not cards
  listSection: {
    backgroundColor: colors.bgElev,
    borderRadius: 16,
    marginTop: 11,
    shadowColor: '#14151a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  listRowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  listIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listBody: { flex: 1 },
  listLabel: { fontSize: 14, fontWeight: '500', color: colors.text },
  listSub: { fontSize: 12, color: colors.textSubtle, marginTop: 1 },
  listMetric: { fontSize: 14.5, fontWeight: '500', color: colors.text },

  // storefront
  storeWrap: { marginTop: 11 },
  storeCard: { padding: 0 },
  storeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 13,
  },
  storeHeaderIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeHeaderText: { flex: 1, minWidth: 0 },
  storeHeaderTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  storeHeaderTitle: { fontSize: 16.5, fontWeight: '500', letterSpacing: -0.16, color: '#fff' },
  storeLiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  storeLiveDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: colors.stDone },
  storeLiveText: { fontSize: 9, fontWeight: '500', letterSpacing: 0.5, color: '#fff' },

  // ticket-notch divider: row of card-bg circles half-overlapping the gradient's
  // bottom edge, approximating the doc's CSS-mask scalloped cutout.
  storeNotchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginTop: -8,
    height: 16,
  },
  storeNotchDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.bgElev,
  },

  storeScrollContent: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 5,
    paddingBottom: 14,
    backgroundColor: colors.bgInset,
  },
  storeThumbWrap: { width: 76 },
  storeThumb: {
    width: 76,
    height: 76,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElev,
  },
  storeThumbPlaceholder: {
    width: 76,
    height: 76,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeThumbMonogram: { fontSize: 19, fontWeight: '700', color: colors.accentDeep },
  storeThumbTitle: { fontSize: 11.5, fontWeight: '500', marginTop: 7, color: colors.text },
  storeThumbPrice: { fontSize: 11.5, color: colors.textSubtle, marginTop: 1 },

  storeFooter: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  storeFooterText: { fontSize: 12.5, color: colors.textMuted },
});
