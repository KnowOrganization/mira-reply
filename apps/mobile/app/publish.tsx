import { useMemo, useRef, useState } from 'react';
import { View, Text, Image, Pressable, ScrollView, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { Card } from '../src/components/Card';
import { Icon } from '../src/components/Icon';
import { CalendarMonth, type DayPost } from '../src/components/CalendarMonth';
import { ComposeSheet, type ComposeSheetHandle } from '../src/components/sheets/ComposeSheet';
import { colors, radius, space } from '../src/theme';
import { SkLine, SkRepeat } from '../src/components/skeleton/primitives';
import { SkScheduledCard } from '../src/components/skeleton/units';
import {
  useScheduledPosts,
  usePublishQuota,
  useSchedulePost,
  useUpdateScheduled,
  usePublishNow,
  useDeleteScheduled,
  useBestTimes,
  type ScheduledPost,
} from '../src/api/hooks';

// "Schedule" screen — Later.com-style visual planner workflow (calendar +
// queue + grid preview + AI compose), replacing the old single flat-list
// compose form. Title/route stay "Schedule"/"publish" per the earlier
// explicit rename decision.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const VIEWS = ['Calendar', 'Queue', 'Grid'] as const;

function formatWhen(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function dateKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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
  const bestTimes = useBestTimes();
  const schedulePost = useSchedulePost();
  const updateScheduled = useUpdateScheduled();
  const publishNow = usePublishNow();
  const deleteScheduled = useDeleteScheduled();
  const composeRef = useRef<ComposeSheetHandle>(null);

  const [view, setView] = useState<(typeof VIEWS)[number]>('Calendar');
  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(dateKey(Date.now()));

  const posts = scheduled.data?.posts ?? [];
  const bestHour = bestTimes.data?.hours?.[0] ?? null;

  const postsByDay = useMemo(() => {
    const map: Record<string, DayPost[]> = {};
    for (const p of posts) {
      const key = dateKey(p.scheduledAt);
      (map[key] ??= []).push({ id: p.id, status: p.status });
    }
    return map;
  }, [posts]);

  const dayPosts = selectedDate ? posts.filter((p) => dateKey(p.scheduledAt) === selectedDate) : [];

  const gridPosts = useMemo(
    () => [...posts].sort((a, b) => b.scheduledAt - a.scheduledAt).filter((p) => p.status !== 'failed'),
    [posts],
  );

  function openCompose(post?: ScheduledPost, forDate?: string) {
    const d = forDate ? new Date(`${forDate}T12:00:00`) : undefined;
    composeRef.current?.present(post ?? null, d);
  }

  function handleSave(body: Parameters<typeof schedulePost.mutate>[0], editingId: string | null) {
    if (editingId) updateScheduled.mutate({ id: editingId, ...body });
    else schedulePost.mutate(body);
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <LinearGradient colors={colors.frame} style={StyleSheet.absoluteFill} />
      <ScreenHeader title="Schedule" />
      <ScrollView
        contentContainerStyle={{ padding: space.xl, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Quota line */}
        {quota.isLoading ? (
          <SkLine w={160} h={13} style={{ marginBottom: space.md }} />
        ) : quota.data ? (
          <Text style={styles.quotaLine}>
            {quota.data.quotaUsage} of {quota.data.quotaTotal} scheduled today
          </Text>
        ) : null}

        {/* View toggle */}
        <View style={styles.segment}>
          {VIEWS.map((v) => (
            <Pressable key={v} onPress={() => setView(v)} style={[styles.segmentBtn, view === v && styles.segmentBtnActive]}>
              <Text style={[styles.segmentText, view === v && styles.segmentTextActive]}>{v}</Text>
            </Pressable>
          ))}
        </View>

        {view === 'Calendar' && (
          <>
            <Card radius={radius.lg} style={styles.calCard}>
              <CalendarMonth
                year={calYear}
                month={calMonth}
                postsByDay={postsByDay}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                onChangeMonth={(delta) => {
                  let m = calMonth + delta, y = calYear;
                  if (m < 0) { m = 11; y -= 1; } else if (m > 11) { m = 0; y += 1; }
                  setCalMonth(m); setCalYear(y);
                }}
              />
            </Card>

            <View style={styles.dayHeader}>
              <Text style={styles.dayHeaderText}>
                {selectedDate ? new Date(`${selectedDate}T12:00:00`).toDateString() : 'Pick a day'}
              </Text>
              <Pressable onPress={() => openCompose(undefined, selectedDate ?? undefined)} style={styles.addDayBtn}>
                <Icon name="plus" size={14} color={colors.accentDeep} />
                <Text style={styles.addDayText}>Add</Text>
              </Pressable>
            </View>

            {dayPosts.length === 0 ? (
              <Text style={styles.emptyDayText}>Nothing scheduled this day.</Text>
            ) : (
              dayPosts.map((p) => (
                <Pressable key={p.id} onPress={() => openCompose(p)} style={styles.row}>
                  {p.imageUrl ? <Image source={{ uri: p.imageUrl }} style={styles.thumb} /> : null}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.caption} numberOfLines={1}>{p.caption || 'Untitled post'}</Text>
                    <Text style={styles.when}>{formatWhen(p.scheduledAt)}</Text>
                  </View>
                  <Text style={[styles.status, { color: statusColor(p.status) }]}>{p.status}</Text>
                  {p.status === 'scheduled' && (
                    <Pressable onPress={() => deleteScheduled.mutate(p.id)} hitSlop={8} style={styles.deleteBtn}>
                      <Icon name="close" size={14} color={colors.textSubtle} />
                    </Pressable>
                  )}
                </Pressable>
              ))
            )}
          </>
        )}

        {view === 'Queue' && (
          <>
            <View style={styles.rowHeaderWrap}>
              <Pressable onPress={() => openCompose()} style={styles.newPostBtn}>
                <Icon name="plus" size={15} color={colors.accentFg} />
                <Text style={styles.newPostText}>New post</Text>
              </Pressable>
            </View>
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
              posts.map((p: ScheduledPost) => (
                <Pressable key={p.id} onPress={() => openCompose(p)} style={styles.row}>
                  {p.imageUrl ? <Image source={{ uri: p.imageUrl }} style={styles.thumb} /> : null}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.caption} numberOfLines={1}>{p.caption || 'Untitled post'}</Text>
                    <Text style={styles.when}>{formatWhen(p.scheduledAt)}</Text>
                  </View>
                  <Text style={[styles.status, { color: statusColor(p.status) }]}>{p.status}</Text>
                  {p.status === 'scheduled' && (
                    <Pressable onPress={() => deleteScheduled.mutate(p.id)} hitSlop={8} style={styles.deleteBtn}>
                      <Icon name="close" size={14} color={colors.textSubtle} />
                    </Pressable>
                  )}
                </Pressable>
              ))
            )}
          </>
        )}

        {view === 'Grid' && (
          <>
            <Text style={styles.gridHint}>How your profile grid will look, newest first.</Text>
            <View style={styles.grid}>
              {gridPosts.length === 0 ? (
                <Text style={styles.emptyDayText}>Nothing to preview yet.</Text>
              ) : (
                gridPosts.map((p) => (
                  <Pressable key={p.id} onPress={() => openCompose(p)} style={styles.gridCell}>
                    {p.imageUrl ? (
                      <Image source={{ uri: p.imageUrl }} style={styles.gridImage} />
                    ) : (
                      <View style={[styles.gridImage, styles.gridPlaceholder]} />
                    )}
                    {p.status === 'scheduled' && (
                      <View style={styles.gridBadge}>
                        <Icon name="clock" size={10} color="#fff" />
                      </View>
                    )}
                  </Pressable>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>

      <ComposeSheet ref={composeRef} bestHour={bestHour} onSave={handleSave} onPublishNow={(body) => publishNow.mutate(body)} />
    </View>
  );
}

const styles = StyleSheet.create({
  quotaLine: { fontSize: 13, color: colors.textMuted, marginBottom: space.md },

  segment: { flexDirection: 'row', backgroundColor: colors.bgInset, borderRadius: 11, padding: 3, marginBottom: space.lg },
  segmentBtn: { flex: 1, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  segmentBtnActive: { backgroundColor: colors.bgElev },
  segmentText: { fontSize: 13, fontWeight: '500', color: colors.textMuted },
  segmentTextActive: { color: colors.text },

  calCard: { padding: space.lg, marginBottom: space.lg },

  dayHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.sm },
  dayHeaderText: { fontSize: 13, fontWeight: '600', color: colors.text },
  addDayBtn: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  addDayText: { fontSize: 13, fontWeight: '500', color: colors.accent },
  emptyDayText: { fontSize: 13, color: colors.textSubtle, paddingVertical: space.lg, textAlign: 'center' },

  rowHeaderWrap: { marginBottom: space.md },
  newPostBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 44, borderRadius: radius.pill, backgroundColor: colors.accent },
  newPostText: { fontSize: 14, fontWeight: '600', color: colors.accentFg },

  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  thumb: { width: 38, height: 38, borderRadius: radius.sm, backgroundColor: colors.bgInset },
  caption: { fontSize: 14, fontWeight: '500', color: colors.text },
  when: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  status: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  deleteBtn: { padding: 4 },

  empty: {},
  emptyInner: { alignItems: 'center', gap: space.sm, paddingVertical: space.xxl },
  emptyText: { fontSize: 15, fontWeight: '500', color: colors.textMuted },

  gridHint: { fontSize: 12.5, color: colors.textSubtle, marginBottom: space.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 2 },
  gridCell: { width: '32.6%', aspectRatio: 1 },
  gridImage: { width: '100%', height: '100%', backgroundColor: colors.bgInset },
  gridPlaceholder: { backgroundColor: colors.accentSoft },
  gridBadge: { position: 'absolute', top: 4, right: 4, width: 18, height: 18, borderRadius: 9, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
});
