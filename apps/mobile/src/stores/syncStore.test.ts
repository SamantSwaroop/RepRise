import { useSyncStore } from './syncStore';

describe('syncStore', () => {
  beforeEach(() => {
    useSyncStore.getState().reset();
  });

  it('initializes with default online idle state and 0 pending count', () => {
    const state = useSyncStore.getState();
    expect(state.status).toBe('idle');
    expect(state.isOnline).toBe(true);
    expect(state.pendingCount).toBe(0);
    expect(state.lastSyncedAt).toBeNull();
    expect(state.error).toBeNull();
    expect(state.isModalVisible).toBe(false);
  });

  it('updates online/offline status correctly', () => {
    useSyncStore.getState().setOnline(false);
    expect(useSyncStore.getState().isOnline).toBe(false);
    expect(useSyncStore.getState().status).toBe('offline');

    useSyncStore.getState().setOnline(true);
    expect(useSyncStore.getState().isOnline).toBe(true);
    expect(useSyncStore.getState().status).toBe('idle');
  });

  it('tracks pending outbox mutation count', () => {
    useSyncStore.getState().setPendingCount(5);
    expect(useSyncStore.getState().pendingCount).toBe(5);
  });

  it('updates error and sets status to error', () => {
    useSyncStore.getState().setError('Network timeout');
    expect(useSyncStore.getState().error).toBe('Network timeout');
    expect(useSyncStore.getState().status).toBe('error');

    useSyncStore.getState().setError(null);
    expect(useSyncStore.getState().error).toBeNull();
    expect(useSyncStore.getState().status).toBe('idle');
  });

  it('controls sync details modal visibility', () => {
    useSyncStore.getState().setModalVisible(true);
    expect(useSyncStore.getState().isModalVisible).toBe(true);
    useSyncStore.getState().setModalVisible(false);
    expect(useSyncStore.getState().isModalVisible).toBe(false);
  });
});
