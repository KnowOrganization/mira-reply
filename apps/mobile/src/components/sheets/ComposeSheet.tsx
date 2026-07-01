import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { View, Text, TextInput, Image, Pressable, ScrollView, ActivityIndicator, Alert, Platform, StyleSheet } from 'react-native';
import BottomSheetModal, { BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { Icon } from '../Icon';
import { colors, space } from '../../theme';
import { useGenerateCaption, useUploadImage, type ScheduledPost, type PublishBody } from '../../api/hooks';

// Compose sheet — Later.com-style compose flow: camera/gallery photo picker
// (uploaded to our own API for a real public URL — IG's Graph API fetches
// image_url itself, see routes/uploads.ts), caption + AI writer, content-type
// segment, real date+time picker, a best-time suggestion chip. Handles both
// create (post=null) and edit (post set, pre-filled, PATCH on save).
//
// The date/time picker is `display="spinner"` on iOS, not "inline" — the
// inline variant renders a full native calendar widget with its own system
// styling (mismatched against the app's design, looked broken nested in the
// sheet) and its continuous onChange events were corrupting the surrounding
// BottomSheetModal's internal state badly enough that it wouldn't reopen
// after being dismissed. Spinner is compact, fixed-height, and doesn't have
// either problem. Android keeps the native modal-dialog "default" display,
// the idiomatic pattern there (inline/spinner aren't well supported).
export type ComposeSheetHandle = { present: (post?: ScheduledPost | null, date?: Date) => void; dismiss: () => void };

const MAX_IMAGES = 10;
const MEDIA_TYPES = ['IMAGE', 'CAROUSEL', 'VIDEO', 'REELS'] as const;

type Props = {
  bestHour: number | null;
  onSave: (body: PublishBody, editingId: string | null) => void;
  onPublishNow: (body: PublishBody) => void;
};

function fmtTime(d: Date): string {
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export const ComposeSheet = forwardRef<ComposeSheetHandle, Props>(({ bestHour, onSave, onPublishNow }, ref) => {
  const sheetRef = useRef<any>(null);
  const generateCaption = useGenerateCaption();
  const uploadImage = useUploadImage();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [showUrlField, setShowUrlField] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [mediaType, setMediaType] = useState<(typeof MEDIA_TYPES)[number]>('IMAGE');
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);

  useImperativeHandle(ref, () => ({
    present: (post, initialDate) => {
      if (post) {
        setEditingId(post.id);
        setCaption(post.caption);
        setImages(post.images.length ? post.images : post.imageUrl ? [post.imageUrl] : []);
        setMediaType((post.mediaType as (typeof MEDIA_TYPES)[number]) ?? 'IMAGE');
        setDate(new Date(post.scheduledAt));
      } else {
        setEditingId(null);
        setCaption('');
        setImages([]);
        setMediaType('IMAGE');
        const d = initialDate ? new Date(initialDate) : new Date(Date.now() + 60 * 60 * 1000);
        setDate(d);
      }
      setUrlInput('');
      setShowUrlField(false);
      setShowPicker(false);
      sheetRef.current?.present();
    },
    dismiss: () => sheetRef.current?.dismiss(),
  }));

  function addImages(next: string[]) {
    const merged = [...images, ...next].slice(0, MAX_IMAGES);
    setImages(merged);
    if (merged.length > 1 && mediaType === 'IMAGE') setMediaType('CAROUSEL');
  }
  function removeImage(i: number) {
    const next = images.filter((_, idx) => idx !== i);
    setImages(next);
    if (next.length <= 1 && mediaType === 'CAROUSEL') setMediaType('IMAGE');
  }
  function addUrlImage() {
    const url = urlInput.trim();
    if (!url || images.length >= MAX_IMAGES) return;
    addImages([url]);
    setUrlInput('');
  }

  async function uploadAssets(assets: ImagePicker.ImagePickerAsset[]) {
    const remaining = MAX_IMAGES - images.length;
    const picked = assets.filter((a) => a.base64).slice(0, remaining);
    if (!picked.length) return;
    setUploading(true);
    try {
      const urls = await Promise.all(
        picked.map((a) => uploadImage.mutateAsync({ base64: a.base64!, ext: (a.fileName?.split('.').pop() || 'jpg') })),
      );
      addImages(urls);
    } catch {
      Alert.alert('Upload failed', 'Could not upload one or more photos. Try again.');
    } finally {
      setUploading(false);
    }
  }

  async function pickFromLibrary() {
    if (images.length >= MAX_IMAGES) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Photo access needed', 'Enable photo access in Settings to add post photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      base64: true,
      quality: 0.7,
      allowsMultipleSelection: true,
      selectionLimit: MAX_IMAGES - images.length,
    });
    if (!result.canceled) await uploadAssets(result.assets);
  }

  async function takePhoto() {
    if (images.length >= MAX_IMAGES) return;
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Camera access needed', 'Enable camera access in Settings to take a post photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.7 });
    if (!result.canceled) await uploadAssets(result.assets);
  }

  // bestHour is a UTC hour-of-day (see repos.ts:bestPostingHours) — apply it
  // via setUTCHours so the resulting instant is right regardless of the
  // device's local timezone, then bump to the next occurrence if that's
  // already in the past.
  function useBestTime() {
    if (bestHour == null) return;
    const d = new Date(date);
    d.setUTCHours(bestHour, 0, 0, 0);
    if (d.getTime() < Date.now()) d.setUTCDate(d.getUTCDate() + 1);
    setDate(d);
  }

  // Local-time label for the suggestion chip — bestHour is UTC, so anchor a
  // throwaway UTC instant and read it back in the device's local time.
  const bestHourLocalLabel = bestHour == null ? null : (() => {
    const d = new Date();
    d.setUTCHours(bestHour, 0, 0, 0);
    return d.toLocaleTimeString(undefined, { hour: 'numeric', hour12: true });
  })();

  function buildBody(): PublishBody {
    return {
      caption: caption.trim() || undefined,
      imageUrl: images[0] ?? undefined,
      images: images.length > 1 ? images : undefined,
      mediaType,
      scheduledAt: date.getTime(),
    };
  }

  function save() {
    onSave(buildBody(), editingId);
    sheetRef.current?.dismiss();
  }
  function publishNow() {
    onPublishNow(buildBody());
    sheetRef.current?.dismiss();
  }

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={['90%']}
      backdropComponent={(p) => <BottomSheetBackdrop {...p} appearsOnIndex={0} disappearsOnIndex={-1} />}
      backgroundStyle={styles.sheetBg}
      handleIndicatorStyle={styles.handle}
    >
      <BottomSheetView style={styles.body}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>{editingId ? 'Edit post' : 'New post'}</Text>

          <Text style={styles.label}>Photos {images.length > 1 ? '· carousel' : ''}</Text>
          {images.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoRow}>
              {images.map((uri, i) => (
                <View key={`${uri}-${i}`} style={styles.photoWrap}>
                  <Image source={{ uri }} style={styles.photo} />
                  <Pressable onPress={() => removeImage(i)} style={styles.photoRemove} hitSlop={6}>
                    <Icon name="close" size={12} color="#fff" />
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          )}

          <View style={styles.pickerRow}>
            <Pressable onPress={takePhoto} disabled={uploading || images.length >= MAX_IMAGES} style={styles.pickerBtn}>
              <Icon name="camera" size={16} color={colors.accentDeep} />
              <Text style={styles.pickerBtnText}>Camera</Text>
            </Pressable>
            <Pressable onPress={pickFromLibrary} disabled={uploading || images.length >= MAX_IMAGES} style={styles.pickerBtn}>
              {uploading ? (
                <ActivityIndicator size="small" color={colors.accentDeep} />
              ) : (
                <>
                  <Icon name="image" size={16} color={colors.accentDeep} />
                  <Text style={styles.pickerBtnText}>Photo library</Text>
                </>
              )}
            </Pressable>
          </View>

          {showUrlField ? (
            <View style={styles.urlRow}>
              <TextInput
                value={urlInput}
                onChangeText={setUrlInput}
                placeholder="Paste an image URL"
                placeholderTextColor={colors.textSubtle}
                autoCapitalize="none"
                autoCorrect={false}
                style={[styles.input, styles.urlInput]}
              />
              <Pressable onPress={addUrlImage} disabled={!urlInput.trim()} style={styles.addUrlBtn}>
                <Icon name="plus" size={16} color={colors.accentDeep} />
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={() => setShowUrlField(true)} style={styles.urlToggle}>
              <Text style={styles.urlToggleText}>Or paste an image URL</Text>
            </Pressable>
          )}

          <Text style={styles.label}>Caption</Text>
          <TextInput
            value={caption}
            onChangeText={setCaption}
            placeholder="Write a caption…"
            placeholderTextColor={colors.textSubtle}
            multiline
            style={[styles.input, styles.captionInput]}
          />
          <Pressable
            onPress={() => generateCaption.mutate(images.length ? 'A product/lifestyle photo for this post' : caption || 'A general update', { onSuccess: (r) => setCaption(r.caption) })}
            disabled={generateCaption.isPending}
            style={styles.aiBtn}
          >
            {generateCaption.isPending ? (
              <ActivityIndicator size="small" color={colors.accentDeep} />
            ) : (
              <>
                <Icon name="sparkle" size={13} color={colors.accentDeep} />
                <Text style={styles.aiBtnText}>Generate caption</Text>
              </>
            )}
          </Pressable>

          <Text style={styles.label}>Content type</Text>
          <View style={styles.segment}>
            {MEDIA_TYPES.map((t) => (
              <Pressable key={t} onPress={() => setMediaType(t)} style={[styles.segmentBtn, mediaType === t && styles.segmentBtnActive]}>
                <Text style={[styles.segmentText, mediaType === t && styles.segmentTextActive]}>{t === 'CAROUSEL' ? 'Carousel' : t[0] + t.slice(1).toLowerCase()}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>When</Text>
          {Platform.OS === 'android' ? (
            <Pressable onPress={() => setShowPicker(true)} style={styles.dateBtn}>
              <Icon name="clock" size={15} color={colors.textMuted} />
              <Text style={styles.dateBtnText}>{fmtTime(date)}</Text>
            </Pressable>
          ) : (
            <View style={styles.dateBtn}>
              <Icon name="clock" size={15} color={colors.textMuted} />
              <Text style={styles.dateBtnText}>{fmtTime(date)}</Text>
            </View>
          )}
          {Platform.OS === 'ios' ? (
            <DateTimePicker
              value={date}
              mode="datetime"
              display="spinner"
              style={styles.spinner}
              onChange={(_, selected) => {
                if (selected) setDate(selected);
              }}
            />
          ) : (
            showPicker && (
              <DateTimePicker
                value={date}
                mode="datetime"
                display="default"
                onChange={(event, selected) => {
                  setShowPicker(false);
                  if (event.type === 'set' && selected) setDate(selected);
                }}
              />
            )
          )}
          {bestHourLocalLabel != null && (
            <Pressable onPress={useBestTime} style={styles.bestTimeChip}>
              <Text style={styles.bestTimeText}>
                Best time: {bestHourLocalLabel} · your followers are most active then
              </Text>
            </Pressable>
          )}

          <Pressable style={styles.saveBtn} onPress={save}>
            <Text style={styles.saveBtnText}>{editingId ? 'Save changes' : 'Schedule'}</Text>
          </Pressable>
          {!editingId && (
            <Pressable style={styles.publishNowBtn} onPress={publishNow}>
              <Text style={styles.publishNowText}>Publish now instead</Text>
            </Pressable>
          )}
        </ScrollView>
      </BottomSheetView>
    </BottomSheetModal>
  );
});
ComposeSheet.displayName = 'ComposeSheet';

const styles = StyleSheet.create({
  sheetBg: { backgroundColor: colors.bgElev, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  handle: { backgroundColor: colors.borderStrong, width: 36 },
  body: { flex: 1, paddingHorizontal: space.xl, paddingTop: space.sm },
  title: { fontSize: 17, fontWeight: '600', color: colors.text, marginBottom: space.lg },

  label: { fontSize: 11, fontWeight: '500', letterSpacing: 0.6, color: colors.textSubtle, textTransform: 'uppercase', marginBottom: 6, marginTop: space.md },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 11,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14.5, color: colors.text, backgroundColor: colors.bgElev,
  },
  captionInput: { minHeight: 80, textAlignVertical: 'top' },

  photoRow: { marginBottom: space.sm },
  photoWrap: { width: 72, height: 72, marginRight: 8 },
  photo: { width: 72, height: 72, borderRadius: 12, backgroundColor: colors.bgInset },
  photoRemove: { position: 'absolute', top: -5, right: -5, width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },

  pickerRow: { flexDirection: 'row', gap: space.sm },
  pickerBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, height: 44, borderRadius: 11, backgroundColor: colors.accentSoft },
  pickerBtnText: { fontSize: 13.5, fontWeight: '500', color: colors.accentDeep },

  urlToggle: { marginTop: space.sm, alignSelf: 'flex-start' },
  urlToggleText: { fontSize: 12.5, color: colors.textSubtle, textDecorationLine: 'underline' },
  urlRow: { flexDirection: 'row', gap: space.sm, marginTop: space.sm },
  urlInput: { flex: 1 },
  addUrlBtn: { width: 42, height: 42, borderRadius: 11, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },

  aiBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: space.sm },
  aiBtnText: { fontSize: 12.5, fontWeight: '500', color: colors.accentDeep },

  segment: { flexDirection: 'row', backgroundColor: colors.bgInset, borderRadius: 11, padding: 3 },
  segmentBtn: { flex: 1, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  segmentBtnActive: { backgroundColor: colors.bgElev },
  segmentText: { fontSize: 12, fontWeight: '500', color: colors.textMuted },
  segmentTextActive: { color: colors.text },

  dateBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.border, borderRadius: 11, paddingHorizontal: 12, paddingVertical: 11, backgroundColor: colors.bgElev },
  dateBtnText: { fontSize: 14.5, color: colors.text, fontWeight: '500' },
  spinner: { alignSelf: 'center', marginTop: space.xs },

  bestTimeChip: { marginTop: space.sm, backgroundColor: colors.accentSoft, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9 },
  bestTimeText: { fontSize: 12, color: colors.accentDeep, fontWeight: '500' },

  saveBtn: { height: 50, borderRadius: 14, backgroundColor: colors.text, alignItems: 'center', justifyContent: 'center', marginTop: space.xl },
  saveBtnText: { fontSize: 15, fontWeight: '600', color: colors.accentFg },
  publishNowBtn: { height: 44, alignItems: 'center', justifyContent: 'center', marginBottom: space.xl },
  publishNowText: { fontSize: 13.5, fontWeight: '500', color: colors.textMuted },
});
