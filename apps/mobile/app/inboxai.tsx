import { useEffect, useRef, useState } from 'react';
import { ScrollView, View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { Card } from '../src/components/Card';
import { Toggle, SectionLabel } from '../src/components/primitives';
import { Icon } from '../src/components/Icon';
import { colors, radius, space } from '../src/theme';
import {
  useInboxAi,
  usePatchInboxAi,
  useSaveIceBreakers,
  useSaveMenu,
  type IceBreakerRow,
  type MenuItemRow,
} from '../src/api/hooks';

// Inbox AI settings — doc: Mira.dc.html:718-760. Ice breakers (≤4) and
// persistent menu (≤3) are pushed to Instagram via their own POST endpoints;
// the responsiveness/VIP fields are plain PATCHes. Local form state seeds
// once from the loaded config (a `seededRef` guard) so a save's own
// invalidate-refetch doesn't clobber in-progress edits.

const MAX_ICE_BREAKERS = 4;
const MAX_MENU_ITEMS = 3;

type MenuForm = { title: string; type: 'postback' | 'web_url'; payload: string; url: string };

function emptyIceBreaker(): IceBreakerRow {
  return { question: '', payload: '' };
}

function emptyMenuItem(): MenuForm {
  return { title: '', type: 'postback', payload: '', url: '' };
}

export default function InboxAi() {
  const { data } = useInboxAi();
  const patch = usePatchInboxAi();
  const saveIceBreakers = useSaveIceBreakers();
  const saveMenu = useSaveMenu();

  const seededRef = useRef(false);
  const [iceBreakers, setIceBreakers] = useState<IceBreakerRow[]>([]);
  const [menuItems, setMenuItems] = useState<MenuForm[]>([]);
  const [autoSeen, setAutoSeen] = useState(true);
  const [autoTyping, setAutoTyping] = useState(true);
  const [vipThreshold, setVipThreshold] = useState('0');

  useEffect(() => {
    if (seededRef.current || !data) return;
    seededRef.current = true;
    setIceBreakers(data.iceBreakers?.length ? data.iceBreakers : []);
    setMenuItems(
      (data.persistentMenu ?? []).map((m) => ({
        title: m.title ?? '',
        type: m.type ?? 'postback',
        payload: m.payload ?? '',
        url: m.url ?? '',
      }))
    );
    setAutoSeen(data.autoSeen ?? true);
    setAutoTyping(data.autoTyping ?? true);
    setVipThreshold(String(data.vipFollowerThreshold ?? 0));
  }, [data]);

  function updateIceBreaker(i: number, patchFields: Partial<IceBreakerRow>) {
    setIceBreakers((prev) => prev.map((b, idx) => (idx === i ? { ...b, ...patchFields } : b)));
  }
  function addIceBreaker() {
    if (iceBreakers.length >= MAX_ICE_BREAKERS) return;
    setIceBreakers((prev) => [...prev, emptyIceBreaker()]);
  }
  function removeIceBreaker(i: number) {
    setIceBreakers((prev) => prev.filter((_, idx) => idx !== i));
  }
  function doSaveIceBreakers() {
    saveIceBreakers.mutate(iceBreakers);
  }

  function updateMenuItem(i: number, patchFields: Partial<MenuForm>) {
    setMenuItems((prev) => prev.map((m, idx) => (idx === i ? { ...m, ...patchFields } : m)));
  }
  function addMenuItem() {
    if (menuItems.length >= MAX_MENU_ITEMS) return;
    setMenuItems((prev) => [...prev, emptyMenuItem()]);
  }
  function removeMenuItem(i: number) {
    setMenuItems((prev) => prev.filter((_, idx) => idx !== i));
  }
  function doSaveMenu() {
    const items: MenuItemRow[] = menuItems.map((m) =>
      m.type === 'web_url'
        ? { title: m.title.trim(), type: 'web_url', url: m.url.trim() }
        : { title: m.title.trim(), type: 'postback', payload: m.payload.trim() }
    );
    saveMenu.mutate(items);
  }

  function toggleAutoSeen(v: boolean) {
    setAutoSeen(v);
    patch.mutate({ autoSeen: v });
  }
  function toggleAutoTyping(v: boolean) {
    setAutoTyping(v);
    patch.mutate({ autoTyping: v });
  }
  function commitVipThreshold() {
    const n = Math.max(0, Math.round(Number(vipThreshold) || 0));
    setVipThreshold(String(n));
    patch.mutate({ vipFollowerThreshold: n });
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <LinearGradient colors={colors.frame} style={StyleSheet.absoluteFill} />
      <ScreenHeader title="Inbox AI" />

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: space.xl, paddingTop: space.sm, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Ice breakers */}
        <SectionLabel>{`Ice breakers · up to ${MAX_ICE_BREAKERS}`}</SectionLabel>
        {iceBreakers.map((b, i) => (
          <View key={i} style={styles.row}>
            <TextInput
              value={b.question}
              onChangeText={(t) => updateIceBreaker(i, { question: t })}
              placeholder="Question"
              placeholderTextColor={colors.textSubtle}
              style={[styles.input, { flex: 1 }]}
            />
            <TextInput
              value={b.payload}
              onChangeText={(t) => updateIceBreaker(i, { payload: t })}
              placeholder="payload"
              placeholderTextColor={colors.textSubtle}
              style={[styles.input, { width: 92 }]}
            />
            <Pressable onPress={() => removeIceBreaker(i)} hitSlop={8} style={styles.removeBtn}>
              <Icon name="close" size={16} color={colors.textSubtle} />
            </Pressable>
          </View>
        ))}
        {iceBreakers.length < MAX_ICE_BREAKERS && (
          <Pressable onPress={addIceBreaker} style={styles.addRow}>
            <Text style={styles.addRowText}>+ Add ice breaker</Text>
          </Pressable>
        )}
        <Pressable onPress={doSaveIceBreakers} style={styles.saveBtn}>
          <Text style={styles.saveBtnText}>
            {saveIceBreakers.isPending ? 'Saving…' : 'Save & push to Instagram'}
          </Text>
        </Pressable>

        {/* Persistent menu */}
        <SectionLabel style={{ marginTop: space.lg }}>{`Persistent menu · up to ${MAX_MENU_ITEMS}`}</SectionLabel>
        {menuItems.map((m, i) => (
          <View key={i} style={styles.row}>
            <TextInput
              value={m.title}
              onChangeText={(t) => updateMenuItem(i, { title: t })}
              placeholder="Label"
              placeholderTextColor={colors.textSubtle}
              style={[styles.input, { width: 96 }]}
            />
            <Pressable
              onPress={() =>
                updateMenuItem(i, { type: m.type === 'postback' ? 'web_url' : 'postback' })
              }
              style={styles.typeBtn}
            >
              <Text style={styles.typeBtnText}>{m.type === 'postback' ? 'Postback' : 'Link'}</Text>
            </Pressable>
            {m.type === 'web_url' ? (
              <TextInput
                value={m.url}
                onChangeText={(t) => updateMenuItem(i, { url: t })}
                placeholder="https://…"
                placeholderTextColor={colors.textSubtle}
                autoCapitalize="none"
                style={[styles.input, { flex: 1 }]}
              />
            ) : (
              <TextInput
                value={m.payload}
                onChangeText={(t) => updateMenuItem(i, { payload: t })}
                placeholder="payload"
                placeholderTextColor={colors.textSubtle}
                style={[styles.input, { flex: 1 }]}
              />
            )}
            <Pressable onPress={() => removeMenuItem(i)} hitSlop={8} style={styles.removeBtn}>
              <Icon name="close" size={16} color={colors.textSubtle} />
            </Pressable>
          </View>
        ))}
        {menuItems.length < MAX_MENU_ITEMS && (
          <Pressable onPress={addMenuItem} style={styles.addRow}>
            <Text style={styles.addRowText}>+ Add menu item</Text>
          </Pressable>
        )}
        <Pressable onPress={doSaveMenu} style={styles.saveBtn}>
          <Text style={styles.saveBtnText}>{saveMenu.isPending ? 'Saving…' : 'Save & push to Instagram'}</Text>
        </Pressable>

        {/* Responsiveness & VIP */}
        <SectionLabel style={{ marginTop: space.lg }}>Responsiveness & VIP</SectionLabel>
        <Card radius={14} style={styles.listCard}>
          <View style={[styles.toggleRow, styles.rowDivider]}>
            <View style={styles.toggleRowText}>
              <Text style={styles.toggleLabel}>Instant read receipt</Text>
              <Text style={styles.toggleSub}>Mark seen the moment a DM lands</Text>
            </View>
            <Toggle value={autoSeen} onValueChange={toggleAutoSeen} />
          </View>
          <View style={[styles.toggleRow, styles.rowDivider]}>
            <View style={styles.toggleRowText}>
              <Text style={styles.toggleLabel}>Typing indicator</Text>
              <Text style={styles.toggleSub}>Show typing while Mira drafts</Text>
            </View>
            <Toggle value={autoTyping} onValueChange={toggleAutoTyping} />
          </View>
          <View style={styles.toggleRow}>
            <View style={styles.toggleRowText}>
              <Text style={styles.toggleLabel}>VIP radar</Text>
              <Text style={styles.toggleSub}>Alert above N followers (0 = off)</Text>
            </View>
            <TextInput
              value={vipThreshold}
              onChangeText={setVipThreshold}
              onBlur={commitVipThreshold}
              onSubmitEditing={commitVipThreshold}
              keyboardType="number-pad"
              style={styles.vipInput}
            />
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: space.sm },
  input: {
    minWidth: 0,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElev,
    borderRadius: 11,
    paddingHorizontal: 11,
    paddingVertical: 9,
    fontSize: 13.5,
    color: colors.text,
  },
  removeBtn: { paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' },
  typeBtn: {
    height: 36,
    paddingHorizontal: 9,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgInset,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeBtnText: { fontSize: 11.5, color: colors.textMuted, fontWeight: '500' },
  addRow: {
    width: '100%',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
    borderRadius: 11,
    paddingVertical: 9,
    alignItems: 'center',
    marginBottom: space.sm,
  },
  addRowText: { fontSize: 13, fontWeight: '500', color: colors.accentDeep },
  saveBtn: {
    width: '100%',
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
    marginBottom: space.lg,
  },
  saveBtnText: { fontSize: 14, fontWeight: '500', color: colors.accentFg },

  listCard: { borderRadius: 14, overflow: 'hidden' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: space.md },
  toggleRowText: { flex: 1 },
  toggleLabel: { fontSize: 14, fontWeight: '500', color: colors.text },
  toggleSub: { fontSize: 11.5, color: colors.textSubtle, marginTop: 1 },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  vipInput: {
    width: 88,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    borderRadius: 11,
    paddingHorizontal: 11,
    paddingVertical: 9,
    fontSize: 14,
    color: colors.text,
    textAlign: 'right',
  },
});
