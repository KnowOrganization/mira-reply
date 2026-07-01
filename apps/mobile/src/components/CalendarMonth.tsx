import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Icon } from './Icon';
import { colors, radius, space } from '../theme';

// Later.com-style "Visual Planner" month grid, hand-rolled (no calendar lib —
// this is bounded enough to build with plain Date math + Views, matching the
// rest of the app's convention of hand-building visual components).
export type DayPost = { id: string; status: string };
export type CalendarMonthProps = {
  year: number;
  month: number; // 0-11
  postsByDay: Record<string, DayPost[]>; // key: 'YYYY-MM-DD'
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  onChangeMonth: (delta: number) => void;
};

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function dateKey(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function dotColor(status: string): string {
  if (status === 'published') return colors.stDone;
  if (status === 'failed') return colors.stBlocked;
  return colors.stWarm; // scheduled
}

export function CalendarMonth({ year, month, postsByDay, selectedDate, onSelectDate, onChangeMonth }: CalendarMonthProps) {
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayKey = dateKey(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <View>
      <View style={styles.header}>
        <Pressable onPress={() => onChangeMonth(-1)} hitSlop={8} style={styles.navBtn}>
          <Icon name="chevronLeft" size={17} color={colors.textMuted} />
        </Pressable>
        <Text style={styles.title}>{MONTH_NAMES[month]} {year}</Text>
        <Pressable onPress={() => onChangeMonth(1)} hitSlop={8} style={styles.navBtn}>
          <Icon name="chevronRight" size={17} color={colors.textMuted} />
        </Pressable>
      </View>

      <View style={styles.weekdayRow}>
        {WEEKDAYS.map((w, i) => (
          <Text key={i} style={styles.weekdayText}>{w}</Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((day, i) => {
          if (day === null) return <View key={i} style={styles.cell} />;
          const key = dateKey(year, month, day);
          const posts = postsByDay[key] ?? [];
          const isToday = key === todayKey;
          const isSelected = key === selectedDate;
          return (
            <Pressable key={i} onPress={() => onSelectDate(key)} style={styles.cell}>
              <View style={[styles.dayCircle, isSelected && styles.dayCircleSelected]}>
                <Text style={[
                  styles.dayText,
                  isToday && !isSelected && styles.dayTextToday,
                  isSelected && styles.dayTextSelected,
                ]}>
                  {day}
                </Text>
              </View>
              <View style={styles.dotsRow}>
                {posts.slice(0, 3).map((p) => (
                  <View key={p.id} style={[styles.dot, { backgroundColor: dotColor(p.status) }]} />
                ))}
                {posts.length > 3 && <Text style={styles.moreText}>+{posts.length - 3}</Text>}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.md },
  navBtn: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 15, fontWeight: '500', color: colors.text },

  weekdayRow: { flexDirection: 'row' },
  weekdayText: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '500', color: colors.textSubtle, marginBottom: 6 },

  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 4, minHeight: 46 },
  dayCircle: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  dayCircleSelected: { backgroundColor: colors.accent },
  dayText: { fontSize: 13, color: colors.text },
  dayTextToday: { fontWeight: '700', color: colors.accentDeep },
  dayTextSelected: { fontWeight: '600', color: colors.accentFg },

  dotsRow: { flexDirection: 'row', gap: 3, marginTop: 3, height: 6, alignItems: 'center' },
  dot: { width: 5, height: 5, borderRadius: 2.5 },
  moreText: { fontSize: 8, color: colors.textSubtle, marginLeft: 1 },
});
