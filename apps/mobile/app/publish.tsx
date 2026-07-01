import { useState } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  TextInput,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { Card } from '../src/components/Card';
import { Icon } from '../src/components/Icon';
import { colors, radius, space } from '../src/theme';
import { SkLine, SkRepeat } from '../src/components/skeleton/primitives';
import { SkScheduledCard } from '../src/components/skeleton/units';
import {
  useScheduledPosts,
  usePublishQuota,
  useSchedulePost,
  usePublishNow,
  useDeleteScheduled,
  type ScheduledPost,
} from '../src/api/hooks';

// "Schedule" screen (file/route stays /publish, title kept per explicit
// rename decision — doc's "Publish" title is stale, see plan notes).
// Doc structure (Mira.dc.html:678-702): inline quota line, always-visible
// compose with +1h/+3h/+1d quick-schedule, single "QUEUE & HISTORY" list.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const QUICK = [
  { label: '+1h', ms: 60 * 60 * 1000 },
  { label: '+3h', ms: 3 * 60 * 60 * 1000 },
  { label: '+1d', ms: 24 * 60 * 60 * 1000 },
] as const;

function formatWhen(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function statusColor(status: string): string {
  const s = status.toLowerCase();
  if (s === 'published' || s === 'done' || s === 'sent') return colors.stDone;
  if (s === 'failed' || s === 'error') return colors.stBlocked;
  return colors.stWarm;
}

export default function Publish() {
  const scheduled = useScheduledPosts();
  const quota = usePublishQuota();
  const schedulePost = useSchedulePost();
  const publishNow = usePublishNow();
  const deleteScheduled = useDeleteScheduled();

  const [caption, setCaption] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [quickOffset, setQuickOffset] = useState<number>(QUICK[0].ms);

  const posts = scheduled.data?.posts ?? [];
  const busy = schedulePost.isPending || publishNow.isPending;

  function buildBody() {
    const trimmed = imageUrl.trim();
    return {
      caption: caption.trim() || undefined,
      imageUrl: trimmed || undefined,
      mediaType: 'IMAGE' as const,
    };
  }

  function reset() {
    setCaption('');
    setImageUrl('');
  }

  function onSchedule() {
    if (busy) return;
    schedulePost.mutate({ ...buildBody(), scheduledAt: Date.now() + quickOffset }, { onSuccess: reset });
  }

  function onPublishNow() {
    if (busy) return;
    publishNow.mutate(buildBody(), { onSuccess: reset });
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <LinearGradient colors={colors.frame} style={StyleSheet.absoluteFill} />
      <ScreenHeader title="Schedule" />
      <ScrollView
        contentContainerStyle={{ padding: space.xl, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Card radius={radius.lg} style={styles.form}>
          <View style={styles.formInner}>
            {/* Inline quota line */}
            {quota.isLoading ? (
              <SkLine w={160} h={13} style={{ marginBottom: space.md }} />
            ) : quota.data ? (
              <Text style={styles.quotaLine}>
                {quota.data.quotaUsage} of {quota.data.quotaTotal} scheduled today
              </Text>
            ) : null}

            <TextInput
              value={imageUrl}
              onChangeText={setImageUrl}
              placeholder="Image URL"
              placeholderTextColor={colors.textSubtle}
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
            />
            <TextInput
              value={caption}
              onChangeText={setCaption}
              placeholder="Write a caption…"
              placeholderTextColor={colors.textSubtle}
              multiline
              style={[styles.input, styles.captionInput]}
            />

            <Pressable
              onPress={onPublishNow}
              disabled={busy}
              style={({ pressed }) => [styles.btnPrimary, pressed && styles.pressed]}
            >
              {publishNow.isPending ? (
                <ActivityIndicator color={colors.accentFg} />
              ) : (
                <Text style={styles.btnPrimaryText}>Publish now</Text>
              )}
            </Pressable>

            {/* Quick-schedule row */}
            <View style={styles.quickRow}>
              {QUICK.map((q) => (
                <Pressable
                  key={q.label}
                  onPress={() => setQuickOffset(q.ms)}
                  style={[styles.quickBtn, quickOffset === q.ms && styles.quickBtnActive]}
                >
                  <Text style={[styles.quickBtnText, quickOffset === q.ms && styles.quickBtnTextActive]}>{q.label}</Text>
                </Pressable>
              ))}
              <Pressable
                onPress={onSchedule}
                disabled={busy}
                style={({ pressed }) => [styles.quickScheduleBtn, pressed && styles.pressed]}
              >
                {schedulePost.isPending ? (
                  <ActivityIndicator color={colors.text} size="small" />
                ) : (
                  <Text style={styles.quickScheduleText}>Schedule</Text>
                )}
              </Pressable>
            </View>
            <Text style={styles.hint}>Schedules for {formatWhen(Date.now() + quickOffset)}</Text>
          </View>
        </Card>

        {/* Combined queue + history */}
        <Text style={styles.section}>Queue & history</Text>
        {scheduled.isLoading ? (
          <SkRepeat n={3}>{(i) => <SkScheduledCard key={i} />}</SkRepeat>
        ) : posts.length === 0 ? (
          <Card radius={radius.lg} style={styles.empty}>
            <View style={styles.emptyInner}>
              <Icon name="plus" size={22} color={colors.textSubtle} />
              <Text style={styles.emptyText}>Nothing scheduled.</Text>
            </View>
          </Card>
        ) : (
          posts.map((p: ScheduledPost) => {
            const canDel = p.status === 'scheduled';
            return (
              <View key={p.id} style={styles.row}>
                {p.imageUrl ? <Image source={{ uri: p.imageUrl }} style={styles.thumb} /> : null}
                <View style={{ flex: 1 }}>
                  <Text style={styles.caption} numberOfLines={1}>{p.caption || 'Untitled post'}</Text>
                  <Text style={styles.when}>{formatWhen(p.scheduledAt)}</Text>
                </View>
                <Text style={[styles.status, { color: statusColor(p.status) }]}>{p.status}</Text>
                {canDel && (
                  <Pressable onPress={() => deleteScheduled.mutate(p.id)} hitSlop={8} style={styles.deleteBtn}>
                    <Icon name="close" size={14} color={colors.textSubtle} />
                  </Pressable>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { marginBottom: space.lg },
  formInner: { padding: space.lg, gap: space.md },
  quotaLine: { fontSize: 13, color: colors.textMuted },
  input: {
    backgroundColor: colors.bgElev, borderRadius: 11, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: space.md, paddingVertical: space.md, fontSize: 15, color: colors.text,
  },
  captionInput: { minHeight: 70, textAlignVertical: 'top' },

  btnPrimary: { height: 46, borderRadius: radius.pill, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  btnPrimaryText: { fontSize: 15, fontWeight: '600', color: colors.accentFg },

  quickRow: { flexDirection: 'row', gap: space.sm, marginTop: space.xs },
  quickBtn: { height: 38, paddingHorizontal: space.md, borderRadius: 10, backgroundColor: colors.bgInset, alignItems: 'center', justifyContent: 'center' },
  quickBtnActive: { backgroundColor: colors.text },
  quickBtnText: { fontSize: 13, fontWeight: '500', color: colors.textMuted },
  quickBtnTextActive: { color: colors.accentFg },
  quickScheduleBtn: { flex: 1, height: 38, borderRadius: 10, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  quickScheduleText: { fontSize: 13, fontWeight: '600', color: colors.text },
  hint: { fontSize: 11.5, color: colors.textSubtle },

  section: { fontSize: 11, fontWeight: '500', letterSpacing: 0.6, color: colors.textSubtle, textTransform: 'uppercase', marginBottom: space.md },

  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  thumb: { width: 38, height: 38, borderRadius: radius.sm, backgroundColor: colors.bgInset },
  caption: { fontSize: 14, fontWeight: '500', color: colors.text },
  when: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  status: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  deleteBtn: { padding: 4 },

  empty: {},
  emptyInner: { alignItems: 'center', gap: space.sm, paddingVertical: space.xxl },
  emptyText: { fontSize: 15, fontWeight: '500', color: colors.textMuted },

  pressed: { opacity: 0.8, transform: [{ scale: 0.97 }] },
});
