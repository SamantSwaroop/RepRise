import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRestTimerStore } from './restTimerStore';

describe('restTimerStore', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    await useRestTimerStore.getState().stopTimer();
  });

  afterEach(async () => {
    await useRestTimerStore.getState().stopTimer();
  });

  it('initializes with default rest duration and idle state', () => {
    const state = useRestTimerStore.getState();
    expect(state.isActive).toBe(false);
    expect(state.isPaused).toBe(false);
    expect(state.duration).toBe(90);
    expect(state.remaining).toBe(0);
  });

  it('starts timer with specified duration and targetEndTime', async () => {
    await useRestTimerStore.getState().startTimer(120, {
      workoutId: 'test-workout-uuid',
    });

    const state = useRestTimerStore.getState();
    expect(state.isActive).toBe(true);
    expect(state.isPaused).toBe(false);
    expect(state.duration).toBe(120);
    expect(state.remaining).toBe(120);
    expect(state.targetEndTime).toBeGreaterThan(Date.now());
    expect(state.meta?.workoutId).toBe('test-workout-uuid');
  });

  it('pauses and resumes timer accurately', async () => {
    await useRestTimerStore.getState().startTimer(60);
    await useRestTimerStore.getState().pauseTimer();

    expect(useRestTimerStore.getState().isActive).toBe(true);
    expect(useRestTimerStore.getState().isPaused).toBe(true);

    await useRestTimerStore.getState().resumeTimer();
    expect(useRestTimerStore.getState().isActive).toBe(true);
    expect(useRestTimerStore.getState().isPaused).toBe(false);
  });

  it('adjusts timer duration with addSeconds (+30s)', async () => {
    await useRestTimerStore.getState().startTimer(60);
    await useRestTimerStore.getState().addSeconds(30);

    const state = useRestTimerStore.getState();
    expect(state.duration).toBe(90);
    expect(state.remaining).toBeGreaterThan(85);
  });

  it('stops timer and resets state', async () => {
    await useRestTimerStore.getState().startTimer(60);
    await useRestTimerStore.getState().stopTimer();

    const state = useRestTimerStore.getState();
    expect(state.isActive).toBe(false);
    expect(state.isPaused).toBe(false);
    expect(state.targetEndTime).toBeNull();
  });

  it('persists timer settings updates to AsyncStorage', async () => {
    await useRestTimerStore.getState().updateSettings({
      defaultDuration: 180,
      autoStart: false,
    });

    const state = useRestTimerStore.getState();
    expect(state.settings.defaultDuration).toBe(180);
    expect(state.settings.autoStart).toBe(false);

    const stored = await AsyncStorage.getItem('@reprise/timer_settings');
    expect(stored).toBeTruthy();
    expect(JSON.parse(stored!).defaultDuration).toBe(180);
  });
});
