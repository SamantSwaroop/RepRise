import { describe, it, expect } from 'vitest';
import {
  syncRequestSchema,
  type SyncMutation,
} from '@reprise/shared';

describe('Sync Engine Schemas & Validation', () => {
  it('validates a valid sync request with mutations', () => {
    const validPayload = {
      clientTimestamp: '2026-09-10T12:00:00.000Z',
      lastSyncAt: '2026-09-10T11:00:00.000Z',
      mutations: [
        {
          id: '11111111-1111-4111-8111-111111111111',
          entityType: 'workout',
          entityId: '22222222-2222-4222-8222-222222222222',
          operation: 'create',
          payload: { name: 'Morning Push' },
          timestamp: '2026-09-10T11:30:00.000Z',
        },
        {
          id: '33333333-3333-4333-8333-333333333333',
          entityType: 'workout_set',
          entityId: '44444444-4444-4444-8444-444444444444',
          operation: 'update',
          payload: { reps: 10, weightKg: 80, isCompleted: true },
          timestamp: '2026-09-10T11:35:00.000Z',
        },
      ],
    };

    const parsed = syncRequestSchema.safeParse(validPayload);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.mutations).toHaveLength(2);
      expect(parsed.data.mutations[0].entityType).toBe('workout');
    }
  });

  it('rejects invalid mutation structure', () => {
    const invalidPayload = {
      clientTimestamp: '2026-09-10T12:00:00.000Z',
      mutations: [
        {
          id: 'not-a-uuid',
          entityType: 'invalid_type',
          entityId: '123',
          operation: 'create',
          timestamp: 'now',
        },
      ],
    };

    const parsed = syncRequestSchema.safeParse(invalidPayload);
    expect(parsed.success).toBe(false);
  });
});

describe('Last-Write-Wins (LWW) Conflict Resolution', () => {
  function resolveLWW<T extends { updatedAt: string }>(
    serverRecord: T,
    clientMutation: { timestamp: string; payload: Partial<T> },
  ): { winner: 'client' | 'server'; record: T } {
    const serverTime = new Date(serverRecord.updatedAt).getTime();
    const clientTime = new Date(clientMutation.timestamp).getTime();

    if (clientTime >= serverTime) {
      return {
        winner: 'client',
        record: { ...serverRecord, ...clientMutation.payload, updatedAt: clientMutation.timestamp },
      };
    }
    return {
      winner: 'server',
      record: serverRecord,
    };
  }

  it('applies client mutation when client timestamp is newer than server record', () => {
    const serverRecord = {
      id: 'w1',
      name: 'Old Workout Name',
      updatedAt: '2026-09-10T10:00:00.000Z',
    };

    const clientMutation = {
      timestamp: '2026-09-10T10:05:00.000Z',
      payload: { name: 'Updated Push Day' },
    };

    const result = resolveLWW(serverRecord, clientMutation);
    expect(result.winner).toBe('client');
    expect(result.record.name).toBe('Updated Push Day');
    expect(result.record.updatedAt).toBe('2026-09-10T10:05:00.000Z');
  });

  it('preserves server record when server record was updated more recently', () => {
    const serverRecord = {
      id: 'w1',
      name: 'Cloud Edit From Web',
      updatedAt: '2026-09-10T10:15:00.000Z',
    };

    const staleClientMutation = {
      timestamp: '2026-09-10T10:05:00.000Z',
      payload: { name: 'Stale Offline Name' },
    };

    const result = resolveLWW(serverRecord, staleClientMutation);
    expect(result.winner).toBe('server');
    expect(result.record.name).toBe('Cloud Edit From Web');
  });
});

describe('Mutation Queue Compaction', () => {
  function compactMutations(mutations: SyncMutation[]): SyncMutation[] {
    const entityMap = new Map<string, SyncMutation>();

    for (const m of mutations) {
      const key = `${m.entityType}:${m.entityId}`;
      const existing = entityMap.get(key);

      if (!existing) {
        entityMap.set(key, m);
        continue;
      }

      // If created then deleted before sync, prune entirely
      if (existing.operation === 'create' && m.operation === 'delete') {
        entityMap.delete(key);
        continue;
      }

      // If created then updated, keep create with merged payload
      if (existing.operation === 'create' && m.operation === 'update') {
        entityMap.set(key, {
          ...existing,
          payload: { ...existing.payload, ...m.payload },
          timestamp: m.timestamp,
        });
        continue;
      }

      // If updated then updated, merge payloads
      if (existing.operation === 'update' && m.operation === 'update') {
        entityMap.set(key, {
          ...existing,
          payload: { ...existing.payload, ...m.payload },
          timestamp: m.timestamp,
        });
        continue;
      }

      // If updated then deleted, record is delete
      if (existing.operation === 'update' && m.operation === 'delete') {
        entityMap.set(key, m);
        continue;
      }

      entityMap.set(key, m);
    }

    return Array.from(entityMap.values());
  }

  it('prunes entities created and deleted before syncing', () => {
    const mutations: SyncMutation[] = [
      {
        id: '11111111-1111-4111-8111-111111111111',
        entityType: 'workout',
        entityId: 'w-100',
        operation: 'create',
        payload: { name: 'Accidental Workout' },
        timestamp: '2026-09-10T10:00:00.000Z',
      },
      {
        id: '22222222-2222-4222-8222-222222222222',
        entityType: 'workout',
        entityId: 'w-100',
        operation: 'delete',
        timestamp: '2026-09-10T10:01:00.000Z',
      },
    ];

    const compacted = compactMutations(mutations);
    expect(compacted).toHaveLength(0);
  });

  it('merges repeated updates to the same set into a single payload', () => {
    const mutations: SyncMutation[] = [
      {
        id: '11111111-1111-4111-8111-111111111111',
        entityType: 'workout_set',
        entityId: 's-1',
        operation: 'update',
        payload: { weightKg: 80, reps: 8 },
        timestamp: '2026-09-10T10:00:00.000Z',
      },
      {
        id: '22222222-2222-4222-8222-222222222222',
        entityType: 'workout_set',
        entityId: 's-1',
        operation: 'update',
        payload: { reps: 10, isCompleted: true },
        timestamp: '2026-09-10T10:02:00.000Z',
      },
    ];

    const compacted = compactMutations(mutations);
    expect(compacted).toHaveLength(1);
    expect(compacted[0].payload).toEqual({
      weightKg: 80,
      reps: 10,
      isCompleted: true,
    });
  });
});
