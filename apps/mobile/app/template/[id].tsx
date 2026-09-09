import { useState, useCallback } from 'react';
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
import type { Exercise } from '@reprise/shared';
import { colors, spacing, typography, radius } from '../../src/theme/tokens';
import {
  useTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
  useAddExerciseToTemplate,
  useRemoveExerciseFromTemplate,
  useUpdateTemplateExerciseSets,
  useStartWorkoutFromTemplate,
} from '../../src/hooks/useTemplates';
import { useExercises } from '../../src/hooks/useExercises';
import { TemplateExerciseRow } from '../../src/components/TemplateExerciseRow';
import { ExercisePicker } from '../../src/components/ExercisePicker';

export default function TemplateDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: template, isLoading } = useTemplate(id!);
  const { data: allExercises } = useExercises();

  const exerciseMap = new Map(
    (allExercises ?? []).map((e) => [e.id, e]),
  );

  const updateTemplate = useUpdateTemplate();
  const deleteTemplateMutation = useDeleteTemplate();
  const addExercise = useAddExerciseToTemplate();
  const removeExercise = useRemoveExerciseFromTemplate();
  const updateSets = useUpdateTemplateExerciseSets();
  const startFromTemplate = useStartWorkoutFromTemplate();

  const [showPicker, setShowPicker] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');

  const handleNameSave = useCallback(() => {
    if (nameValue.trim() && template) {
      updateTemplate.mutate({ id: template.id, name: nameValue.trim() });
    }
    setEditingName(false);
  }, [nameValue, template]);

  const handleExerciseSelect = useCallback(
    (exercise: Exercise) => {
      if (template) {
        addExercise.mutate({
          templateId: template.id,
          exerciseId: exercise.id,
          defaultSets: exercise.defaultSets ?? 3,
        });
      }
      setShowPicker(false);
    },
    [template],
  );

  const handleStartWorkout = async () => {
    if (!template) return;
    Alert.alert(
      'Start Workout',
      `Start a new workout from "${template.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start',
          onPress: async () => {
            try {
              const workoutId = await startFromTemplate.mutateAsync(template.id);
              (router as any).replace({
                pathname: '/workout/[id]',
                params: { id: workoutId },
              });
            } catch (err) {
              Alert.alert('Error', 'Failed to start workout from template.');
            }
          },
        },
      ],
    );
  };

  const handleDeleteTemplate = () => {
    if (!template) return;
    Alert.alert('Delete Template', 'This cannot be undone. Delete this template?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteTemplateMutation.mutateAsync(template.id);
          router.back();
        },
      },
    ]);
  };

  if (isLoading || !template) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  const dateStr = new Date(template.updatedAt).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Header: name */}
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
                setNameValue(template.name);
                setEditingName(true);
              }}
            >
              <Text style={styles.name}>{template.name}</Text>
            </Pressable>
          )}
          <View style={styles.headerMeta}>
            <Text style={styles.exerciseCount}>
              {template.exercises.length}{' '}
              {template.exercises.length === 1 ? 'exercise' : 'exercises'}
            </Text>
            <Text style={styles.dot}>•</Text>
            <Text style={styles.dateText}>Updated {dateStr}</Text>
          </View>
        </View>

        {/* Exercises */}
        {template.exercises.length === 0 ? (
          <View style={styles.emptyExercises}>
            <Text style={styles.emptyText}>No exercises yet</Text>
            <Text style={styles.emptyHint}>
              Tap "Add Exercise" below to build your template
            </Text>
          </View>
        ) : (
          <View style={styles.exerciseList}>
            {template.exercises.map((te) => (
              <TemplateExerciseRow
                key={te.id}
                templateExercise={te}
                exercise={exerciseMap.get(te.exerciseId)}
                editable
                onRemove={() => {
                  Alert.alert(
                    'Remove Exercise',
                    `Remove "${exerciseMap.get(te.exerciseId)?.name ?? 'this exercise'}" from template?`,
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Remove',
                        style: 'destructive',
                        onPress: () =>
                          removeExercise.mutate({
                            templateExerciseId: te.id,
                            templateId: template.id,
                          }),
                      },
                    ],
                  );
                }}
                onSetCountChange={(delta) => {
                  const newCount = Math.max(1, Math.min(20, te.defaultSets + delta));
                  if (newCount !== te.defaultSets) {
                    updateSets.mutate({
                      templateExerciseId: te.id,
                      templateId: template.id,
                      defaultSets: newCount,
                    });
                  }
                }}
              />
            ))}
          </View>
        )}

        {/* Add exercise button */}
        <Pressable
          style={({ pressed }) => [
            styles.addExerciseBtn,
            pressed && styles.addExerciseBtnPressed,
          ]}
          onPress={() => setShowPicker(true)}
        >
          <Text style={styles.addExerciseText}>+ Add Exercise</Text>
        </Pressable>

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [
              styles.actionBtn,
              styles.startBtn,
              pressed && styles.actionBtnPressed,
              template.exercises.length === 0 && styles.actionBtnDisabled,
            ]}
            onPress={handleStartWorkout}
            disabled={template.exercises.length === 0}
          >
            <Text style={styles.startBtnText}>Start Workout</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.actionBtn,
              styles.deleteBtn,
              pressed && styles.actionBtnPressed,
            ]}
            onPress={handleDeleteTemplate}
          >
            <Text style={styles.deleteBtnText}>Delete Template</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Exercise picker modal */}
      <ExercisePicker
        visible={showPicker}
        onClose={() => setShowPicker(false)}
        onSelect={handleExerciseSelect}
        excludeIds={template.exercises.map((te) => te.exerciseId)}
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
    marginBottom: spacing.xl,
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
    gap: spacing.sm,
  },
  exerciseCount: {
    color: colors.accent,
    fontSize: typography.caption.size,
    fontWeight: '600',
  },
  dot: {
    color: colors.textMuted,
    fontSize: typography.caption.size,
  },
  dateText: {
    color: colors.textMuted,
    fontSize: typography.caption.size,
  },
  exerciseList: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
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
  actionBtnDisabled: {
    opacity: 0.4,
  },
  startBtn: {
    backgroundColor: colors.accent,
  },
  startBtnText: {
    color: colors.background,
    fontSize: typography.body.size,
    fontWeight: '700',
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
