// ─── Rest Timer Shared Types & Utilities ──────────────────────────────

export const PRESET_REST_DURATIONS = [30, 60, 90, 120, 180, 240, 300] as const;
export const DEFAULT_REST_DURATION = 90; // 1m 30s

export interface RestTimerSettings {
  defaultDuration: number;
  autoStart?: boolean;
  soundEnabled?: boolean;
  vibrateEnabled?: boolean;
}

export interface RestTimerMeta {
  workoutId?: string;
}

export interface RestTimerState {
  isActive: boolean;
  isPaused: boolean;
  duration: number;
  remaining: number;
  targetEndTime: number | null;
  meta: RestTimerMeta | null;
  settings: RestTimerSettings;
}

/**
 * Format total seconds into MM:SS string (e.g. 90 -> "01:30", 5 -> "00:05").
 */
export function formatTimerSeconds(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safeSeconds / 60);
  const secs = safeSeconds % 60;
  const mm = String(mins).padStart(2, '0');
  const ss = String(secs).padStart(2, '0');
  return `${mm}:${ss}`;
}

/**
 * Calculate remaining seconds from targetEndTime in a drift-free manner.
 */
export function calculateRemainingSeconds(targetEndTime: number, now: number = Date.now()): number {
  const diffMs = targetEndTime - now;
  if (diffMs <= 0) return 0;
  return Math.ceil(diffMs / 1000);
}

/**
 * Safely adjust current timer by delta seconds (e.g. +30 or -15),
 * recalculating targetEndTime, remaining, and total duration.
 */
export function adjustTimerDuration(
  currentRemaining: number,
  currentDuration: number,
  delta: number,
  now: number = Date.now(),
): { remaining: number; duration: number; targetEndTime: number } {
  const newRemaining = Math.max(0, currentRemaining + delta);
  const newDuration = Math.max(newRemaining, currentDuration + delta);
  const newTargetEndTime = now + newRemaining * 1000;
  return {
    remaining: newRemaining,
    duration: newDuration,
    targetEndTime: newTargetEndTime,
  };
}
