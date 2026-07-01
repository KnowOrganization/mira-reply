// Native Publishing — compose a post, publish now or schedule it (+1h/+3h/+1d),
// see the queue + 50/24h quota. /api/ig/publishing/*.
import { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, Image } from 'react-native';
import { apiGet, apiPost, apiDel } from '../api';
import { Screen, Card, SectionTitle, Btn, Row, Loading } from './ui';
import { T } from './theme';

type Post = { id: string; caption: string; imageUrl: string | null; scheduledAt: number; status: string; mediaId: string | null; error: string | null };
const STATUS: Record<string, string> = { scheduled: T.warm, published: T.done, failed: T.blocked };

export function PublishScreen({ onMenu }: { onMenu?: () => void }) {
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<Post[]>([]);
  const [quota, setQuota] = useState<{ quotaUsage: number; quotaTotal: number } | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  async function load() {
    try {
      const [p, q] = await Promise.all([
        apiGet<{ posts: Post[] }>('/api/ig/publishing/scheduled'),
        apiGet<{ quotaUsage: number; quotaTotal: number }>('/api/ig/publishing/quota').catch(() => null),
      ]);
      setPosts(p.posts || []); setQuota(q);
    } catch {}
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function publishNow() {
    if (!imageUrl.trim()) return;
    setBusy(true); setMsg('');
    try { const r = await apiPost<{ mediaId: string }>('/api/ig/publishing/now', { imageUrl: imageUrl.trim(), caption }); setMsg('Published ✓ ' + r.mediaId); setImageUrl(''); setCaption(''); load(); }
    catch { setMsg('Publish failed'); }
    setBusy(false);
  }
  async function schedule(hours: number) {
    if (!imageUrl.trim()) return;
    setBusy(true); setMsg('');
    try { await apiPost('/api/ig/publishing/scheduled', { imageUrl: imageUrl.trim(), caption, scheduledAt: Date.now() + hours * 3600_000 }); setMsg(`Scheduled in ${hours}h`); setImageUrl(''); setCaption(''); load(); }
    catch { setMsg('Schedule failed'); }
    setBusy(false);
  }
  async function del(id: string) { try { await apiDel(`/api/ig/publishing/scheduled/${id}`); load(); } catch {} }

  if (loading) return <Screen title="Publish" onMenu={onMenu}><Loading /></Screen>;

  return (
    <Screen title="Publish" onMenu={onMenu} subtitle="Publish now or schedule for later — scheduled posts fire on their own. 50 per 24h.">
      <Card>
        {quota ? <Text style={{ fontSize: 11.5, color: T.subtle, marginBottom: 10 }}>{quota.quotaUsage}/{quota.quotaTotal} published this 24h</Text> : null}
        <TextInput value={imageUrl} onChangeText={setImageUrl} placeholder="Public image URL (https://…)" placeholderTextColor={T.subtle} style={input} />
        <TextInput value={caption} onChangeText={setCaption} placeholder="Caption…" placeholderTextColor={T.subtle} multiline style={[input, { height: 78, paddingTop: 9, marginTop: 8 }]} />
        <View style={{ marginTop: 10 }}><Btn label="Publish now" onPress={publishNow} disabled={busy || !imageUrl.trim()} /></View>
        <Row style={{ marginTop: 8 }}>
          {[1, 3, 24].map((h) => (
            <Pressable key={h} onPress={() => schedule(h)} disabled={busy || !imageUrl.trim()} style={{ flex: 1, height: 36, borderRadius: 10, backgroundColor: T.bgInset, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 12.5, fontWeight: '600', color: imageUrl.trim() ? T.text : T.subtle }}>+{h === 24 ? '1d' : h + 'h'}</Text>
            </Pressable>
          ))}
        </Row>
        {msg ? <Text style={{ fontSize: 12, color: T.muted, marginTop: 8 }}>{msg}</Text> : null}
      </Card>

      <SectionTitle>Queue & history</SectionTitle>
      <Card>
        {posts.length === 0 ? <Text style={{ fontSize: 12.5, color: T.subtle }}>Nothing yet.</Text> : posts.map((p) => (
          <Row key={p.id} style={{ paddingVertical: 9, borderTopWidth: 1, borderTopColor: T.border }}>
            {p.imageUrl ? <Image source={{ uri: p.imageUrl }} style={{ width: 36, height: 36, borderRadius: 8 }} /> : null}
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12.5, color: T.text }} numberOfLines={1}>{p.caption || '(no caption)'}</Text>
              <Text style={{ fontSize: 11, color: T.subtle }}>{p.scheduledAt > 0 ? new Date(p.scheduledAt).toLocaleString() : 'now'}{p.error ? ' · ' + p.error : ''}</Text>
            </View>
            <Text style={{ fontSize: 10.5, fontWeight: '700', color: STATUS[p.status] || T.subtle }}>{p.status}</Text>
            {p.status === 'scheduled' ? <Pressable onPress={() => del(p.id)}><Text style={{ fontSize: 16, color: T.subtle }}>×</Text></Pressable> : null}
          </Row>
        ))}
      </Card>
    </Screen>
  );
}

const input = { height: 40, borderRadius: 11, borderWidth: 1, borderColor: T.border, backgroundColor: T.bg, paddingHorizontal: 12, fontSize: 14, color: T.text } as const;
