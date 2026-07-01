// Shared native primitives for the feature screens (Haze look).
import type { ReactNode } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { T } from './theme';

export function Screen({ title, subtitle, onMenu, children }: { title: string; subtitle?: string; onMenu?: () => void; children: ReactNode }) {
  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <View style={{ paddingTop: 58, paddingHorizontal: 18, paddingBottom: 10 }}>
        {onMenu ? (
          <Pressable onPress={onMenu} hitSlop={10} style={{ marginBottom: 10, width: 30 }}>
            <View style={{ width: 19, height: 2, borderRadius: 2, backgroundColor: T.text, marginBottom: 4 }} />
            <View style={{ width: 19, height: 2, borderRadius: 2, backgroundColor: T.text, marginBottom: 4 }} />
            <View style={{ width: 13, height: 2, borderRadius: 2, backgroundColor: T.text }} />
          </Pressable>
        ) : null}
        <Text style={{ fontSize: 30, fontWeight: '600', letterSpacing: -1, color: T.text }}>{title}</Text>
        {subtitle ? <Text style={{ fontSize: 13, color: T.muted, marginTop: 3, lineHeight: 18 }}>{subtitle}</Text> : null}
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 18, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: object }) {
  return (
    <View style={[{ backgroundColor: T.bgElev, borderRadius: 16, borderWidth: 1, borderColor: T.border, padding: 14, marginBottom: 12 }, style]}>
      {children}
    </View>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <Text style={{ fontSize: 11.5, fontWeight: '600', letterSpacing: 0.5, color: T.subtle, marginBottom: 8, marginLeft: 4, textTransform: 'uppercase' }}>{children}</Text>;
}

export function Btn({ label, onPress, kind = 'primary', disabled, small }: { label: string; onPress: () => void; kind?: 'primary' | 'ghost' | 'danger'; disabled?: boolean; small?: boolean }) {
  const bg = disabled ? T.bgInset : kind === 'primary' ? T.accent : kind === 'danger' ? T.blocked : 'transparent';
  const fg = disabled ? T.subtle : kind === 'ghost' ? T.accentDeep : '#fff';
  return (
    <Pressable onPress={disabled ? undefined : onPress} style={{ height: small ? 34 : 44, borderRadius: 12, backgroundColor: bg, borderWidth: kind === 'ghost' ? 1.5 : 0, borderColor: T.borderStrong, borderStyle: kind === 'ghost' ? 'dashed' : 'solid', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 }}>
      <Text style={{ color: fg, fontSize: small ? 13 : 14, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}

export function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <Pressable onPress={() => onChange(!on)} style={{ width: 48, height: 29, borderRadius: 999, backgroundColor: on ? T.accent : T.borderStrong, padding: 3, justifyContent: 'center' }}>
      <View style={{ width: 23, height: 23, borderRadius: 999, backgroundColor: '#fff', alignSelf: on ? 'flex-end' : 'flex-start' }} />
    </Pressable>
  );
}

export function Input({ value, onChangeText, placeholder, keyboardType, style }: { value: string; onChangeText: (t: string) => void; placeholder?: string; keyboardType?: 'numeric' | 'default'; style?: object }) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={T.subtle}
      keyboardType={keyboardType}
      style={[{ height: 40, borderRadius: 11, borderWidth: 1, borderColor: T.border, backgroundColor: T.bg, paddingHorizontal: 12, fontSize: 14, color: T.text }, style]}
    />
  );
}

export function Row({ children, style }: { children: ReactNode; style?: object }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 8 }, style]}>{children}</View>;
}

export function Pill({ label, color, bg }: { label: string; color: string; bg: string }) {
  return <Text style={{ fontSize: 10.5, fontWeight: '700', color, backgroundColor: bg, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999, overflow: 'hidden' }}>{label}</Text>;
}

export function Loading() {
  return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 }}><ActivityIndicator color={T.accent} /></View>;
}

export function Empty({ text }: { text: string }) {
  return <Text style={{ fontSize: 13, color: T.subtle, textAlign: 'center', paddingVertical: 40 }}>{text}</Text>;
}
