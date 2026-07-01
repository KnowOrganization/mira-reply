import { useMemo, useState } from 'react';
import { View, Text, TextInput, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Path } from 'react-native-svg';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { Card } from '../src/components/Card';
import { Chip, type ChipTone } from '../src/components/primitives';
import { colors, radius, space } from '../src/theme';
import { useContacts, type Contact } from '../src/api/hooks';

// Contacts — searchable CRM list (Mira.dc.html:763-777). Same data shape that
// drives Opportunities, here as a flat, filterable directory with lead score.

const STATUS_TONE: Record<string, ChipTone> = {
  hot: 'warm',
  vip: 'done',
  customer: 'done',
  warm: 'accent',
  cold: 'grey',
};

function toneFor(status: string): ChipTone {
  return STATUS_TONE[status] ?? 'grey';
}

function avatarBg(username: string): string {
  // small fixed palette keyed off the first letter, just for visual variety
  const palette = ['#3f3f46', '#52525b', '#71717a', '#5A5FE0'];
  const code = username.charCodeAt(0) || 0;
  return palette[code % palette.length];
}

function SearchIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.textSubtle} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={11} cy={11} r={7} />
      <Path d="m20 20-3-3" />
    </Svg>
  );
}

function ContactRow({ contact, last }: { contact: Contact; last: boolean }) {
  const initial = (contact.username || '?').charAt(0).toUpperCase();
  return (
    <View style={[styles.row, !last && styles.rowDivider]}>
      <View style={[styles.avatar, { backgroundColor: avatarBg(contact.username) }]}>
        <Text style={styles.avatarText}>{initial}</Text>
      </View>
      <View style={styles.rowBody}>
        <View style={styles.rowHead}>
          <Text style={styles.username} numberOfLines={1}>{contact.username}</Text>
          <Chip label={contact.status} tone={toneFor(contact.status)} small />
        </View>
        <Text style={styles.meta} numberOfLines={1}>
          {contact.commentCount} comment{contact.commentCount === 1 ? '' : 's'} · {contact.repliedCount} replied
        </Text>
      </View>
      <View style={styles.scoreBadge}>
        <Text style={styles.scoreText}>{contact.leadScore}</Text>
      </View>
    </View>
  );
}

export default function Contacts() {
  const { data, isLoading } = useContacts();
  const [query, setQuery] = useState('');

  const contacts = data?.contacts ?? [];
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((c) => c.username?.toLowerCase().includes(q));
  }, [contacts, query]);

  return (
    <View style={styles.root}>
      <LinearGradient colors={colors.frame} style={StyleSheet.absoluteFill} />
      <ScreenHeader title="Contacts" />

      <View style={styles.searchWrap}>
        <SearchIcon />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search contacts"
          placeholderTextColor={colors.textSubtle}
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: space.xl, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <ActivityIndicator color={colors.accent} style={styles.loading} />
        ) : visible.length === 0 ? (
          <Card radius={16} style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              {contacts.length === 0 ? 'No contacts yet.' : 'No contacts match your search.'}
            </Text>
          </Card>
        ) : (
          <Card radius={15} style={styles.listCard}>
            {visible.map((c, i) => (
              <ContactRow key={c.igUserId} contact={c} last={i === visible.length - 1} />
            ))}
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: space.sm,
    backgroundColor: colors.bgInset, borderRadius: 12,
    paddingVertical: 10, paddingHorizontal: 12,
    marginHorizontal: space.xl, marginBottom: space.lg,
  },
  searchInput: { flex: 1, fontSize: 13.5, color: colors.text, padding: 0 },

  loading: { marginTop: space.xxl },

  listCard: { borderRadius: 15, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 11 },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText: { fontSize: 14, fontWeight: '500', color: '#fff' },
  rowBody: { flex: 1, minWidth: 0 },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  username: { fontSize: 14.5, fontWeight: '500', color: colors.text, flexShrink: 1 },
  meta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  scoreBadge: {
    minWidth: 28, paddingHorizontal: 6, height: 22, borderRadius: radius.pill,
    backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  scoreText: { fontSize: 12, fontWeight: '600', color: colors.accentDeep },

  emptyCard: { padding: space.xl, alignItems: 'center', marginTop: space.md },
  emptyText: { fontSize: 14, color: colors.textMuted, textAlign: 'center' },
});
