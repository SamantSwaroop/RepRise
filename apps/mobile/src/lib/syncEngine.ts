import { AppState, type AppStateStatus } from 'react-native';
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import type { SyncRequest, SyncResponse } from '@reprise/shared';
import { api } from './api';
import { queryClient } from './queryClient';
import { useAuthStore } from '../stores/authStore';
import { useSyncStore } from '../stores/syncStore';
import {
  getPendingMutations,
  removeProcessedMutations,
  getPendingCount,
  getLastSyncedAt,
  setLastSyncedAt,
  onMutationEnqueued,
} from '../db/syncQueue';
import { upsertOfflineExercises, deleteOfflineExercise } from '../db/exerciseRepository';
import {
  upsertWorkoutsFromServer,
  deleteWorkoutsFromServer,
  deleteWorkoutExercisesFromServer,
  deleteSetsFromServer,
} from '../db/workoutRepository';
import {
  upsertTemplatesFromServer,
  deleteTemplatesFromServer,
  deleteTemplateExercisesFromServer,
} from '../db/templateRepository';
import { toast } from '../stores/toastStore';

// ─── Sync Engine State ─────────────────────────────────────────────

let isSyncing = false;
let syncPromise: Promise<boolean> | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let isInitialized = false;

// ─── Core Sync Function ────────────────────────────────────────────

export async function syncNow(options?: { force?: boolean }): Promise<boolean> {
  // If already in flight, return existing execution
  if (isSyncing && syncPromise) {
    return syncPromise;
  }

  syncPromise = (async () => {
    const user = useAuthStore.getState().user;
    if (!user?.id) {
      useSyncStore.getState().setStatus('idle');
      return false;
    }

    // Check connectivity
    const netState = await NetInfo.fetch();
    const isConnected = !!(netState.isConnected && netState.isInternetReachable !== false);
    useSyncStore.getState().setOnline(isConnected);

    const pendingCount = await getPendingCount(user.id);
    useSyncStore.getState().setPendingCount(pendingCount);

    if (!isConnected && !options?.force) {
      useSyncStore.getState().setStatus('offline');
      return false;
    }

    isSyncing = true;
    useSyncStore.getState().setStatus('syncing');
    useSyncStore.getState().setError(null);

    try {
      const clientTimestamp = new Date().toISOString();
      const lastSyncAt = await getLastSyncedAt();
      const mutations = await getPendingMutations(user.id);

      const payload: SyncRequest = {
        clientTimestamp,
        lastSyncAt,
        mutations,
      };

      const res = await api<SyncResponse>('/sync', {
        method: 'POST',
        body: payload as unknown as Record<string, unknown>,
      });

      // 1. Process server changes into SQLite
      if (res?.changes) {
        const { exercises, workouts, templates, deletedIds } = res.changes;

        if (exercises && exercises.length > 0) {
          await upsertOfflineExercises(exercises);
        }

        if (workouts && workouts.length > 0) {
          await upsertWorkoutsFromServer(workouts);
        }

        if (templates && templates.length > 0) {
          await upsertTemplatesFromServer(templates);
        }

        if (deletedIds && deletedIds.length > 0) {
          const workoutIdsToDelete = deletedIds.filter((d) => d.entityType === 'workout').map((d) => d.id);
          const workoutExIdsToDelete = deletedIds.filter((d) => d.entityType === 'workout_exercise').map((d) => d.id);
          const setIdsToDelete = deletedIds.filter((d) => d.entityType === 'workout_set').map((d) => d.id);
          const templateIdsToDelete = deletedIds.filter((d) => d.entityType === 'template').map((d) => d.id);
          const templateExIdsToDelete = deletedIds.filter((d) => d.entityType === 'template_exercise').map((d) => d.id);
          const exerciseIdsToDelete = deletedIds.filter((d) => d.entityType === 'exercise').map((d) => d.id);

          if (workoutIdsToDelete.length > 0) await deleteWorkoutsFromServer(workoutIdsToDelete);
          if (workoutExIdsToDelete.length > 0) await deleteWorkoutExercisesFromServer(workoutExIdsToDelete);
          if (setIdsToDelete.length > 0) await deleteSetsFromServer(setIdsToDelete);
          if (templateIdsToDelete.length > 0) await deleteTemplatesFromServer(templateIdsToDelete);
          if (templateExIdsToDelete.length > 0) await deleteTemplateExercisesFromServer(templateExIdsToDelete);
          for (const exId of exerciseIdsToDelete) {
            await deleteOfflineExercise(user.id, exId).catch(() => {});
          }
        }
      }

      // 2. Remove successfully processed mutations from queue
      if (res?.processedMutationIds && res.processedMutationIds.length > 0) {
        await removeProcessedMutations(res.processedMutationIds);
        const count = res.processedMutationIds.length;
        toast.success(`Auto-synced ${count} offline change${count === 1 ? '' : 's'}`);
      }

      // 3. Update sync metadata
      if (res?.serverTimestamp) {
        await setLastSyncedAt(res.serverTimestamp);
        useSyncStore.getState().setLastSyncedAt(res.serverTimestamp);
      }

      // 4. Update pending count & status
      const remainingCount = await getPendingCount(user.id);
      useSyncStore.getState().setPendingCount(remainingCount);
      useSyncStore.getState().setStatus('idle');

      // 5. Invalidate TanStack query cache to refresh UI
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
      queryClient.invalidateQueries({ queryKey: ['workout'] });
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      queryClient.invalidateQueries({ queryKey: ['template'] });
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
      queryClient.invalidateQueries({ queryKey: ['prs'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      queryClient.invalidateQueries({ queryKey: ['progress'] });

      return true;
    } catch (err: any) {
      console.warn('Sync failed:', err?.message || err);
      const isNetError = err?.code === 'network_error' || err?.message?.includes('Network');
      if (isNetError) {
        useSyncStore.getState().setStatus('offline');
      } else {
        useSyncStore.getState().setError(err?.message || 'Sync failed');
      }
      return false;
    } finally {
      isSyncing = false;
      syncPromise = null;
    }
  })();

  return syncPromise;
}

// ─── Debounced Trigger ─────────────────────────────────────────────

export function scheduleSync(delayMs = 1500) {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    syncNow().catch(() => {});
  }, delayMs);
}

// ─── Engine Initialization ─────────────────────────────────────────

export function initSyncEngine() {
  if (isInitialized) return;
  isInitialized = true;

  const triggerUserSync = (userId: string) => {
    getPendingCount(userId).then((count) => {
      useSyncStore.getState().setPendingCount(count);
    });
    getLastSyncedAt().then((lastSync) => {
      if (lastSync) useSyncStore.getState().setLastSyncedAt(lastSync);
    });
    syncNow().catch(() => {});
  };

  // 1. Initial sync & pending count load
  const initialUser = useAuthStore.getState().user;
  if (initialUser?.id) {
    triggerUserSync(initialUser.id);
  }

  // 2. React immediately when user authenticates or tokens are restored
  useAuthStore.subscribe((state, prevState) => {
    if (state.user?.id && (!prevState.user || prevState.user.id !== state.user.id)) {
      triggerUserSync(state.user.id);
    }
  });

  // 3. Fetch initial network connectivity
  NetInfo.fetch().then((state) => {
    const isOnline = !!(state.isConnected && state.isInternetReachable !== false);
    useSyncStore.getState().setOnline(isOnline);
    if (isOnline) {
      syncNow().catch(() => {});
    }
  });

  // 4. Listen for network connectivity changes (Automatic sync on reconnect)
  NetInfo.addEventListener((state: NetInfoState) => {
    const isOnline = !!(state.isConnected && state.isInternetReachable !== false);
    const wasOnline = useSyncStore.getState().isOnline;
    useSyncStore.getState().setOnline(isOnline);

    if (isOnline) {
      if (!wasOnline) {
        toast.info('Back online — syncing data…');
      }
      syncNow().catch(() => {});
    }
  });

  // 5. Listen for app foreground transitions (resuming from background)
  AppState.addEventListener('change', (nextState: AppStateStatus) => {
    if (nextState === 'active') {
      syncNow().catch(() => {});
    }
  });

  // 6. Automatically schedule sync when local mutations are enqueued
  onMutationEnqueued(async () => {
    const user = useAuthStore.getState().user;
    if (user?.id) {
      const count = await getPendingCount(user.id);
      useSyncStore.getState().setPendingCount(count);
    }
    const net = await NetInfo.fetch();
    const isOnline = !!(net.isConnected && net.isInternetReachable !== false);
    useSyncStore.getState().setOnline(isOnline);
    if (isOnline) {
      scheduleSync(800);
    }
  });

  // 7. Periodic sync: check every 25s if pending mutations or previous offline
  setInterval(async () => {
    if (AppState.currentState === 'active') {
      const user = useAuthStore.getState().user;
      if (user?.id) {
        const count = await getPendingCount(user.id);
        useSyncStore.getState().setPendingCount(count);
        if (count > 0 || useSyncStore.getState().status === 'offline') {
          syncNow().catch(() => {});
        }
      }
    }
  }, 25 * 1000);
}
