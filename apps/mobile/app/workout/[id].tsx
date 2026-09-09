import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { Exercise, WorkoutSet } from '@reprise/shared';
import { colors, spacing, typography, radius } from '../../src/theme/tokens';
import {
  useWorkout,
  useUpdateWorkout,
  useDeleteWorkout,
  useAddExerciseToWorkout,
  useRemoveExerciseFromWorkout,
  useUpsertSet,
  useDeleteSet,
  usePreviousSets,
} from '../../src/hooks/useWorkouts';
import { useExercises } from '../../src/hooks/useExercises';
import { SetRow } from '../../src/components/SetRow';
import { ExercisePicker } from '../../src/components/ExercisePicker';

// ─── Sub-component: exercise block with previous data ──────────────

function ExerciseBlock({
  workoutExerciseId,
  workoutId,
  exerciseId,
  exerciseName,
  sets,
  isActive,
  onRemove,
  onUpsertSet,
  onDeleteSet,
}: {
  workoutExerciseId: string;
  workoutId: string;
  exerciseId: string;
  exerciseName: string;
  sets: WorkoutSet[];
  isActive: boolean;
  onRemove: () => void;
  onUpsertSet: (data: any) => void;
  onDeleteSet: (data: any) => void;
}) {
  const { data: previousSets } = usePreviousSets(exerciseId, workoutId);

  return (
    <View style={styles.exerciseBlock}>
      <View style={styles.exerciseHeader}>
        <Text style={styles.exerciseName}>{exerciseName}</Text>
        {isActive && (
          <Pressable
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={({ pressed }) => [
              styles.removeExerciseBtn,
              pressed && styles.removeExerciseBtnPressed,
            ]}
            onPress={() => {
              Alert.alert(
                'Remove Exercise',
                `Remove "${exerciseName}" and all its sets?`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Remove', style: 'destructive', onPress: onRemove },
                ],
              );
            }}
          >
            <Text style={styles.removeExercise}>✕ Remove</Text>
          </Pressable>
        )}
      </View>

      {/* Column headers */}
      <View style={styles.colHeaders}>
        <Text style={[styles.colHeader, { width: 18 }]}>#</Text>
        <Text style={[styles.colHeader, { width: 24 }]}>T</Text>
        {isActive && previousSets && previousSets.length > 0 && (
          <Text style={[styles.colHeader, { width: 56 }]}>Prev</Text>
        )}
        <Text style={[styles.colHeader, { flex: 1 }]}>Weight</Text>
        <Text style={[styles.colHeader, { flex: 1 }]}>Reps</Text>
        <Text style={[styles.colHeader, { flex: 0.7 }]}>RPE</Text>
        {isActive && <View style={{ width: 52 }} />}
      </View>

      {/* Sets */}
      {sets.map((set) => {
        const prevSet = previousSets?.find((ps) => ps.setNumber === set.setNumber) ?? null;

        return (
          <SetRow
            key={set.id}
            set={set}
            readOnly={!isActive}
            previousSet={isActive ? prevSet : undefined}
            onCopyPrevious={
              prevSet
                ? () =>
                    onUpsertSet({
                      workoutId,
                      workoutExerciseId,
                      id: set.id,
                      weightKg: prevSet.weightKg,
                      reps: prevSet.reps,
                      rpe: prevSet.rpe,
                    })
                : undefined
            }
            onUpdate={(data) =>
              onUpsertSet({
                workoutId,
                workoutExerciseId,
                id: set.id,
                ...data,
              })
            }
            onDelete={() =>
              onDeleteSet({
                setId: set.id,
                workoutId,
              })
            }
          />
        );
      })}

      {/* Add set button */}
      {isActive && (
        <Pressable
          style={({ pressed }) => [styles.addSetBtn, pressed && styles.addSetBtnPressed]}
          onPress={() => onUpsertSet({ workoutId, workoutExerciseId })}
        >
          <Text style={styles.addSetText}>+ Add Set</Text>
        </Pressable>
      )}
    </View>
  );
}

// ─── Main screen ───────────────────────────────────────────────────

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: workout, isLoading } = useWorkout(id!);
  const { data: allExercises } = useExercises();

  const exerciseMap = new Map(
    (allExercises ?? []).map((e) => [e.id, e]),
  );

  const updateWorkout = useUpdateWorkout();
  const deleteWorkoutMutation = useDeleteWorkout();
  const addExercise = useAddExerciseToWorkout();
  const removeExercise = useRemoveExerciseFromWorkout();
  const upsertSetMutation = useUpsertSet();
  const deleteSetMutation = useDeleteSet();

  const [showPicker, setShowPicker] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [elapsed, setElapsed] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const [notesValue, setNotesValue] = useState('');

  const isActive = workout?.status === 'in_progress';
  const isCompleted = workout?.status === 'completed';

  // Live timer for in-progress workouts
  useEffect(() => {
    if (!workout || workout.status !== 'in_progress') return;

    const tick = () => {
      const start = new Date(workout.startedAt).getTime();
      const diff = Math.floor((Date.now() - start) / 1000);
      const h = Math.floor(diff / 3600);
      const m = Math.floor((diff % 3600) / 60);
      const s = diff % 60;
      setElapsed(
        h > 0
          ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
          : `${m}:${String(s).padStart(2, '0')}`,
      );
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [workout?.startedAt, workout?.status]);

  // Sync notes value when workout loads
  useEffect(() => {
    if (workout?.notes != null) {
      setNotesValue(workout.notes);
    }
  }, [workout?.notes]);

  const handleNameSave = useCallback(() => {
    if (nameValue.trim() && workout) {
      updateWorkout.mutate({ id: workout.id, name: nameValue.trim() });
    }
    setEditingName(false);
  }, [nameValue, workout]);

  const handleNotesSave = useCallback(() => {
    if (workout) {
      updateWorkout.mutate({ id: workout.id, notes: notesValue || null });
    }
  }, [notesValue, workout]);

  const handleExerciseSelect = useCallback(
    (exercise: Exercise) => {
      if (workout) {
        addExercise.mutate({
          workoutId: workout.id,
          exerciseId: exercise.id,
          defaultSets: exercise.defaultSets ?? 3,
        });
      }
      setShowPicker(false);
    },
    [workout],
  );

  const handleCompleteWorkout = () => {
    if (!workout) return;
    Alert.alert('Complete Workout', 'Mark this workout as completed?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Complete',
        onPress: () => {
          const now = new Date().toISOString();
          updateWorkout.mutate(
            { id: workout.id, status: 'completed', completedAt: now },
            {
              onSuccess: () => {
                // Navigate to summary screen
                (router as any).replace({
                  pathname: '/workout/summary/[id]',
                  params: { id: workout.id },
                });
              },
            },
          );
        },
      },
    ]);
  };

  const handleAbandonWorkout = () => {
    if (!workout) return;
    Alert.alert('Abandon Workout', 'Mark this workout as abandoned?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Abandon',
        style: 'destructive',
        onPress: () => {
          updateWorkout.mutate({ id: workout.id, status: 'abandoned' });
        },
      },
    ]);
  };

  const handleDeleteWorkout = () => {
    if (!workout) return;
    Alert.alert('Delete Workout', 'This cannot be undone. Delete this workout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteWorkoutMutation.mutateAsync(workout.id);
          router.back();
        },
      },
    ]);
  };

  // ─── Stats for completed/abandoned workouts ────────────────────

  const stats = useMemo(() => {
    if (!workout || isActive) return null;

    const totalSets = workout.exercises.reduce((s, we) => s + we.sets.length, 0);
    const completedSets = workout.exercises.reduce(
      (s, we) => s + we.sets.filter((st) => st.isCompleted).length,
      0,
    );
    const totalVolume = workout.exercises.reduce(
      (s, we) =>
        s + we.sets.reduce((ss, st) => {
          if (st.isCompleted && st.weightKg && st.reps) return ss + st.weightKg * st.reps;
          return ss;
        }, 0),
      0,
    );

    const startMs = new Date(workout.startedAt).getTime();
    const endMs = workout.completedAt
      ? new Date(workout.completedAt).getTime()
      : new Date(workout.updatedAt).getTime();
    const durationMin = Math.floor((endMs - startMs) / 60000);
    const h = Math.floor(durationMin / 60);
    const m = durationMin % 60;

    return {
      duration: h > 0 ? `${h}h ${m}m` : `${m}m`,
      exercises: workout.exercises.length,
      sets: `${completedSets}/${totalSets}`,
      volume: totalVolume >= 1000 ? `${(totalVolume / 1000).toFixed(1)}k` : String(Math.round(totalVolume)),
    };
  }, [workout, isActive]);

  if (isLoading || !workout) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  const STATUS_LABELS: Record<string, { text: string; color: string }> = {
    in_progress: { text: 'In Progress', color: colors.warning },
    completed: { text: 'Completed', color: colors.success },
    abandoned: { text: 'Abandoned', color: colors.danger },
  };
  const statusCfg = STATUS_LABELS[workout.status];

  const dateStr = new Date(workout.startedAt).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const timeStr = new Date(workout.startedAt).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Header: name + status + timer */}
        <View style={styles.header}>
          {editingName ? (
            <TextInput
              style={styles.nameInput}
              value={nameValue}
              onChangeText={setNameValue}
              onBlur={handleNameSave}
              onSubmitEditing={handleNameSave}
              autoFocus
              selectTextOnFocus
            />
          ) : (
            <Pressable
              onPress={() => {
                if (isActive) {
                  setNameValue(workout.name);
                  setEditingName(true);
                }
              }}
            >
              <Text style={styles.name}>{workout.name}</Text>
            </Pressable>
          )}

          <View style={styles.headerMeta}>
            <View style={[styles.statusBadge, { backgroundColor: statusCfg.color + '22' }]}>
              <Text style={[styles.statusText, { color: statusCfg.color }]}>
                {statusCfg.text}
              </Text>
            </View>
            {isActive && elapsed ? (
              <Text style={styles.timer}>⏱ {elapsed}</Text>
            ) : (
              <Text style={styles.dateText}>📅 {dateStr} • {timeStr}</Text>
            )}
          </View>
        </View>

        {/* Stats bar for completed/abandoned workouts */}
        {stats && (
          <View style={styles.statsBar}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.duration}</Text>
              <Text style={styles.statLabel}>Duration</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.exercises}</Text>
              <Text style={styles.statLabel}>Exercises</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.sets}</Text>
              <Text style={styles.statLabel}>Sets</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.volume}</Text>
              <Text style={styles.statLabel}>Vol (kg)</Text>
            </View>
          </View>
        )}

        {/* Notes section */}
        {isActive ? (
          <Pressable
            style={styles.notesToggle}
            onPress={() => setShowNotes(!showNotes)}
          >
            <Text style={styles.notesToggleText}>
              {showNotes ? '▾ Notes' : '▸ Notes'}
              {workout.notes ? ' ✏️' : ''}
            </Text>
          </Pressable>
        ) : workout.notes ? (
          <View style={styles.notesReadOnly}>
            <Text style={styles.notesLabel}>Notes</Text>
            <Text style={styles.notesText}>{workout.notes}</Text>
          </View>
        ) : null}

        {isActive && showNotes && (
          <TextInput
            style={styles.notesInput}
            value={notesValue}
            onChangeText={setNotesValue}
            onBlur={handleNotesSave}
            placeholder="Add workout notes…"
            placeholderTextColor={colors.border}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        )}

        {/* Exercises */}
        {workout.exercises.length === 0 ? (
          <View style={styles.emptyExercises}>
            <Text style={styles.emptyText}>No exercises yet</Text>
            {isActive && (
              <Text style={styles.emptyHint}>
                Tap "Add Exercise" below to get started
              </Text>
            )}
          </View>
        ) : (
          workout.exercises.map((we) => (
            <ExerciseBlock
              key={we.id}
              workoutExerciseId={we.id}
              workoutId={workout.id}
              exerciseId={we.exerciseId}
              exerciseName={exerciseMap.get(we.exerciseId)?.name ?? 'Exercise'}
              sets={we.sets}
              isActive={isActive}
              onRemove={() =>
                removeExercise.mutate({
                  workoutExerciseId: we.id,
                  workoutId: workout.id,
                })
              }
              onUpsertSet={(data: any) => upsertSetMutation.mutate(data)}
              onDeleteSet={(data: any) => deleteSetMutation.mutate(data)}
            />
          ))
        )}

        {/* Add exercise button */}
        {isActive && (
          <Pressable
            style={({ pressed }) => [
              styles.addExerciseBtn,
              pressed && styles.addExerciseBtnPressed,
            ]}
            onPress={() => setShowPicker(true)}
          >
            <Text style={styles.addExerciseText}>+ Add Exercise</Text>
          </Pressable>
        )}

        {/* Footer actions */}
        <View style={styles.actions}>
          {isActive && (
            <>
              <Pressable
                style={({ pressed }) => [
                  styles.actionBtn,
                  styles.completeBtn,
                  pressed && styles.actionBtnPressed,
                ]}
                onPress={handleCompleteWorkout}
              >
                <Text style={styles.completeBtnText}>✓ Complete Workout</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.actionBtn,
                  styles.abandonBtn,
                  pressed && styles.actionBtnPressed,
                ]}
                onPress={handleAbandonWorkout}
              >
                <Text style={styles.abandonBtnText}>Abandon</Text>
              </Pressable>
            </>
          )}

          <Pressable
            style={({ pressed }) => [
              styles.actionBtn,
              styles.deleteBtn,
              pressed && styles.actionBtnPressed,
            ]}
            onPress={handleDeleteWorkout}
          >
            <Text style={styles.deleteBtnText}>Delete Workout</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Exercise picker modal */}
      <ExercisePicker
        visible={showPicker}
        onClose={() => setShowPicker(false)}
        onSelect={handleExerciseSelect}
        excludeIds={workout.exercises.map((we) => we.exerciseId)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.xl,
    paddingBottom: 100,
  },
  header: {
    marginBottom: spacing.lg,
  },
  name: {
    color: colors.textPrimary,
    fontSize: typography.h1.size,
    fontWeight: typography.h1.weight,
    marginBottom: spacing.sm,
  },
  nameInput: {
    color: colors.textPrimary,
    fontSize: typography.h1.size,
    fontWeight: typography.h1.weight,
    borderBottomWidth: 2,
    borderBottomColor: colors.accent,
    paddingBottom: spacing.xs,
    marginBottom: spacing.sm,
  },
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  timer: {
    color: colors.textMuted,
    fontSize: typography.body.size,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  dateText: {
    color: colors.textMuted,
    fontSize: typography.caption.size,
  },
  // ─── Stats bar ─────────────────────────────────────────────────
  statsBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    color: colors.textPrimary,
    fontSize: typography.body.size,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border + '66',
  },
  // ─── Notes ─────────────────────────────────────────────────────
  notesToggle: {
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  notesToggleText: {
    color: colors.textMuted,
    fontSize: typography.caption.size,
    fontWeight: '600',
  },
  notesInput: {
    backgroundColor: colors.surface,
    borderRadius: radius.control,
    padding: spacing.md,
    color: colors.textPrimary,
    fontSize: typography.body.size,
    minHeight: 60,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  notesReadOnly: {
    backgroundColor: colors.surface,
    borderRadius: radius.control,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  notesLabel: {
    color: colors.textMuted,
    fontSize: typography.caption.size,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  notesText: {
    color: colors.textSecondary,
    fontSize: typography.body.size,
    lineHeight: 22,
  },
  // ─── Exercises ─────────────────────────────────────────────────
  emptyExercises: {
    paddingVertical: spacing.xxxl,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: typography.body.size,
    marginBottom: spacing.xs,
  },
  emptyHint: {
    color: colors.border,
    fontSize: typography.caption.size,
  },
  exerciseBlock: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  exerciseName: {
    color: colors.textPrimary,
    fontSize: typography.body.size,
    fontWeight: '600',
    flex: 1,
  },
  removeExerciseBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: colors.danger + '18',
  },
  removeExerciseBtnPressed: {
    backgroundColor: colors.danger + '33',
  },
  removeExercise: {
    color: colors.danger,
    fontSize: typography.caption.size,
    fontWeight: '600',
  },
  colHeaders: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
    gap: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '44',
  },
  colHeader: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  addSetBtn: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.accent + '44',
    borderStyle: 'dashed',
  },
  addSetBtnPressed: {
    backgroundColor: colors.accent + '11',
  },
  addSetText: {
    color: colors.accent,
    fontSize: typography.caption.size,
    fontWeight: '600',
  },
  addExerciseBtn: {
    marginVertical: spacing.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.accent + '44',
    borderStyle: 'dashed',
    backgroundColor: colors.accent + '08',
  },
  addExerciseBtnPressed: {
    backgroundColor: colors.accent + '18',
  },
  addExerciseText: {
    color: colors.accent,
    fontSize: typography.body.size,
    fontWeight: '600',
  },
  actions: {
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  actionBtn: {
    height: 48,
    borderRadius: radius.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnPressed: {
    opacity: 0.8,
  },
  completeBtn: {
    backgroundColor: colors.success,
  },
  completeBtnText: {
    color: colors.background,
    fontSize: typography.body.size,
    fontWeight: '700',
  },
  abandonBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.warning,
  },
  abandonBtnText: {
    color: colors.warning,
    fontSize: typography.body.size,
    fontWeight: '600',
  },
  deleteBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.danger,
  },
  deleteBtnText: {
    color: colors.danger,
    fontSize: typography.body.size,
    fontWeight: '600',
  },
});
