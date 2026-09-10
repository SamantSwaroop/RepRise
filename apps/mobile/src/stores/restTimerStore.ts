import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEFAULT_REST_DURATION,
  calculateRemainingSeconds,
  adjustTimerDuration,
  type RestTimerMeta,
  type RestTimerSettings,
} from '@reprise/shared';
import {
  scheduleRestNotification,
  cancelRestNotification,
  triggerTimerFinishedFeedback,
} from '../lib/notifications';

const SETTINGS_STORAGE_KEY = '@reprise/timer_settings';

interface RestTimerStoreState {
  isActive: boolean;
  isPaused: boolean;
  duration: number;
  remaining: number;
  targetEndTime: number | null;
  meta: RestTimerMeta | null;
  scheduledNotificationId: string | null;
  settings: RestTimerSettings;

  // Actions
  loadSettings: () => Promise<void>;
  updateSettings: (partial: Partial<RestTimerSettings>) => Promise<void>;
  startTimer: (seconds?: number, meta?: RestTimerMeta) => Promise<void>;
  pauseTimer: () => Promise<void>;
  resumeTimer: () => Promise<void>;
  addSeconds: (delta: number) => Promise<void>;
  stopTimer: () => Promise<void>;
}

let tickInterval: ReturnType<typeof setInterval> | null = null;

function clearTickInterval() {
  if (tickInterval != null) {
    clearInterval(tickInterval);
    tickInterval = null;
  }
}

export const useRestTimerStore = create<RestTimerStoreState>((set, get) => ({
  isActive: false,
  isPaused: false,
  duration: DEFAULT_REST_DURATION,
  remaining: DEFAULT_REST_DURATION,
  targetEndTime: null,
  meta: null,
  scheduledNotificationId: null,
  settings: {
    defaultDuration: DEFAULT_REST_DURATION,
    autoStart: true,
    soundEnabled: true,
    vibrateEnabled: true,
  },

  loadSettings: async () => {
    try {
      const stored = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        set((state) => ({
          settings: { ...state.settings, ...parsed },
          duration: parsed.defaultDuration ?? state.duration,
          remaining: parsed.defaultDuration ?? state.remaining,
        }));
      }
    } catch {
      // Ignore reading errors
    }
  },

  updateSettings: async (partial) => {
    const updated = { ...get().settings, ...partial };
    AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
    set({ settings: updated });
  },

  startTimer: async (seconds, meta) => {
    clearTickInterval();

    const state = get();
    if (state.scheduledNotificationId) {
      await cancelRestNotification(state.scheduledNotificationId);
    }

    const duration = seconds ?? state.settings.defaultDuration;
    if (duration <= 0) return;

    const now = Date.now();
    const targetEndTime = now + duration * 1000;
    const currentMeta = meta ?? state.meta ?? null;

    let notificationId: string | null = null;
    try {
      notificationId = await scheduleRestNotification({
        seconds: duration,
        workoutId: currentMeta?.workoutId,
      });
    } catch {
      // Ignore notification schedule error
    }

    set({
      isActive: true,
      isPaused: false,
      duration,
      remaining: duration,
      targetEndTime,
      meta: currentMeta,
      scheduledNotificationId: notificationId,
    });

    tickInterval = setInterval(() => {
      const current = get();
      if (!current.isActive || current.isPaused || !current.targetEndTime) {
        return;
      }

      const remaining = calculateRemainingSeconds(current.targetEndTime);

      if (remaining <= 0) {
        clearTickInterval();
        triggerTimerFinishedFeedback();
        set({
          isActive: false,
          isPaused: false,
          remaining: 0,
          targetEndTime: null,
          scheduledNotificationId: null,
        });
      } else {
        set({ remaining });
      }
    }, 1000);
  },

  pauseTimer: async () => {
    const state = get();
    if (!state.isActive || state.isPaused) return;

    clearTickInterval();

    if (state.scheduledNotificationId) {
      await cancelRestNotification(state.scheduledNotificationId);
    }

    const remaining = state.targetEndTime
      ? calculateRemainingSeconds(state.targetEndTime)
      : state.remaining;

    set({
      isPaused: true,
      remaining,
      targetEndTime: null,
      scheduledNotificationId: null,
    });
  },

  resumeTimer: async () => {
    const state = get();
    if (!state.isActive || !state.isPaused || state.remaining <= 0) return;

    clearTickInterval();

    const now = Date.now();
    const targetEndTime = now + state.remaining * 1000;

    let notificationId: string | null = null;
    try {
      notificationId = await scheduleRestNotification({
        seconds: state.remaining,
        workoutId: state.meta?.workoutId,
      });
    } catch {
      // Ignore
    }

    set({
      isPaused: false,
      targetEndTime,
      scheduledNotificationId: notificationId,
    });

    tickInterval = setInterval(() => {
      const current = get();
      if (!current.isActive || current.isPaused || !current.targetEndTime) {
        return;
      }

      const remaining = calculateRemainingSeconds(current.targetEndTime);

      if (remaining <= 0) {
        clearTickInterval();
        triggerTimerFinishedFeedback();
        set({
          isActive: false,
          isPaused: false,
          remaining: 0,
          targetEndTime: null,
          scheduledNotificationId: null,
        });
      } else {
        set({ remaining });
      }
    }, 1000);
  },

  addSeconds: async (delta) => {
    const state = get();
    if (!state.isActive) return;

    const { remaining, duration, targetEndTime } = adjustTimerDuration(
      state.remaining,
      state.duration,
      delta,
    );

    if (state.scheduledNotificationId) {
      await cancelRestNotification(state.scheduledNotificationId);
    }

    if (remaining <= 0) {
      clearTickInterval();
      triggerTimerFinishedFeedback();
      set({
        isActive: false,
        isPaused: false,
        remaining: 0,
        targetEndTime: null,
        scheduledNotificationId: null,
      });
      return;
    }

    let newNotificationId: string | null = null;
    if (!state.isPaused) {
      try {
        newNotificationId = await scheduleRestNotification({
          seconds: remaining,
          workoutId: state.meta?.workoutId,
        });
      } catch {
        // Ignore
      }
    }

    set({
      remaining,
      duration,
      targetEndTime: state.isPaused ? null : targetEndTime,
      scheduledNotificationId: newNotificationId,
    });
  },

  stopTimer: async () => {
    clearTickInterval();
    const state = get();
    if (state.scheduledNotificationId) {
      await cancelRestNotification(state.scheduledNotificationId);
    }

    set({
      isActive: false,
      isPaused: false,
      remaining: 0,
      targetEndTime: null,
      scheduledNotificationId: null,
    });
  },
}));
