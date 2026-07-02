// Thin expo-haptics wrapper — every call is fire-and-forget and safe to no-op
// (simulator, web, or module missing). Moments are named for intent, not API.
import * as Haptics from 'expo-haptics';

const safe = (fn: () => Promise<void>) => { fn().catch(() => {}); };

export const haptics = {
  /** crossing an action threshold (swipe past commit point) */
  threshold: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  /** an action committed (send fired) */
  success: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  /** something failed / sprang back */
  error: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
  /** a sheet/overlay opened */
  open: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** segmented/tab selection change */
  select: () => safe(() => Haptics.selectionAsync()),
};
