import { create } from 'zustand';
import type { SyncStatus } from '@reprise/shared';

interface SyncStoreState {
  status: SyncStatus;
  isOnline: boolean;
  pendingCount: number;
  lastSyncedAt: string | null;
  error: string | null;
  isModalVisible: boolean;

  setStatus: (status: SyncStatus) => void;
  setOnline: (isOnline: boolean) => void;
  setPendingCount: (count: number) => void;
  setLastSyncedAt: (timestamp: string | null) => void;
  setError: (error: string | null) => void;
  setModalVisible: (visible: boolean) => void;
  reset: () => void;
}

export const useSyncStore = create<SyncStoreState>((set) => ({
  status: 'idle',
  isOnline: true,
  pendingCount: 0,
  lastSyncedAt: null,
  error: null,
  isModalVisible: false,

  setStatus: (status) => set({ status }),
  setOnline: (isOnline) => set({ isOnline, status: !isOnline ? 'offline' : 'idle' }),
  setPendingCount: (pendingCount) => set({ pendingCount }),
  setLastSyncedAt: (lastSyncedAt) => set({ lastSyncedAt }),
  setError: (error) => set({ error, status: error ? 'error' : 'idle' }),
  setModalVisible: (isModalVisible) => set({ isModalVisible }),
  reset: () =>
    set({
      status: 'idle',
      isOnline: true,
      pendingCount: 0,
      lastSyncedAt: null,
      error: null,
      isModalVisible: false,
    }),
}));
