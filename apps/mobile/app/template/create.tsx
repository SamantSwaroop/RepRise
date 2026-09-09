import { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import type { Exercise, Workout, TemplateExercise } from '@reprise/shared';
import { colors, spacing, typography, radius } from '../../src/theme/tokens';
import {
  useCreateTemplate,
  useAddExerciseToTemplate,
  useRemoveExerciseFromTemplate,
  useUpdateTemplateExerciseSets,
  useCreateTemplateFromWorkout,
} from '../../src/hooks/useTemplates';
import { useWorkout } from '../../src/hooks/useWorkouts';
import { useExercises } from '../../src/hooks/useExercises';
import { ExercisePicker } from '../../src/components/ExercisePicker';
import { TemplateExerciseRow } from '../../src/components/TemplateExerciseRow';

/**
 * Create template screen. Can also be used for "Save as Template" from a workout
 * by passing a `fromWorkout` param with the workout ID.
 */
export default function CreateTemplateScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ fromWorkout?: string }>();
  const { data: sourceWorkout } = useWorkout(params.fromWorkout ?? '');
  const { data: allExercises } = useExercises();

  const exerciseMap = new Map(
    (allExercises ?? []).map((e) => [e.id, e]),
  );

  const createTemplate = useCreateTemplate();
  const addExercise = useAddExerciseToTemplate();
  const removeExercise = useRemoveExerciseFromTemplate();
  const updateSets = useUpdateTemplateExerciseSets();
  const createFromWorkout = useCreateTemplateFromWorkout();

  const [name, setName] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [pendingExercises, setPendingExercises] = useState<
    { exerciseId: string; defaultSets: number; id: string }[]
  >([]);

  // If coming from a workout, pre-fill the name and exercises
  const isFromWorkout = !!params.fromWorkout && !!sourceWorkout;
  const defaultName = isFromWorkout ? `${sourceWorkout.name} Template` : '';

  const handleSaveFromWorkout = async () => {
    if (!sourceWorkout) return;
    const templateName = name.trim() || defaultName;
    if (!templateName) {
      Alert.alert('Name Required', 'Please enter a template name.');
      return;
    }

    try {
      await createFromWorkout.mutateAsync({
        workout: sourceWorkout as Workout,
        name: templateName,
      });
      Alert.alert('Template Saved', `"${templateName}" has been saved.`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
      Alert.alert('Error', 'Failed to create template.');
    }
  };

  const handleCreateEmpty = async () => {
    const templateName = name.trim();
    if (!templateName) {
      Alert.alert('Name Required', 'Please enter a template name.');
      return;
    }

    try {
      const template = await createTemplate.mutateAsync(templateName);
      // Add pending exercises
      for (const pe of pendingExercises) {
        await addExercise.mutateAsync({
          templateId: template.id,
          exerciseId: pe.exerciseId,
          defaultSets: pe.defaultSets,
        });
      }
      // Navigate to the new template detail
      (router as any).replace({
        pathname: '/template/[id]',
        params: { id: template.id },
      });
    } catch (err) {
      Alert.alert('Error', 'Failed to create template.');
    }
  };

  const handleAddPendingExercise = (exercise: Exercise) => {
    setPendingExercises((prev) => [
      ...prev,
      {
        exerciseId: exercise.id,
        defaultSets: exercise.defaultSets ?? 3,
        id: `pending_${Date.now()}_${exercise.id}`,
      },
    ]);
    setShowPicker(false);
  };

  const handleRemovePendingExercise = (pendingId: string) => {
    setPendingExercises((prev) => prev.filter((pe) => pe.id !== pendingId));
  };

  const handlePendingSetChange = (pendingId: string, delta: number) => {
    setPendingExercises((prev) =>
      prev.map((pe) =>
        pe.id === pendingId
          ? { ...pe, defaultSets: Math.max(1, Math.min(20, pe.defaultSets + delta)) }
          : pe,
      ),
    );
  };

  // If creating from a workout, show a simpler view
  if (isFromWorkout) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <Text style={styles.sectionTitle}>Save as Template</Text>
          <Text style={styles.subtitle}>
            This will save the exercises from "{sourceWorkout.name}" as a reusable template.
          </Text>

          <Text style={styles.label}>Template Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder={defaultName}
            placeholderTextColor={colors.border}
            autoFocus
          />

          <Text style={styles.previewTitle}>Exercises ({sourceWorkout.exercises.length})</Text>
          <View style={styles.previewList}>
            {sourceWorkout.exercises.map((we, i) => {
              const exercise = exerciseMap.get(we.exerciseId);
              return (
                <View key={we.id} style={styles.previewRow}>
                  <View style={styles.previewOrderBadge}>
                    <Text style={styles.previewOrderText}>{i + 1}</Text>
                  </View>
                  <Text style={styles.previewName} numberOfLines={1}>
                    {exercise?.name ?? 'Unknown Exercise'}
                  </Text>
                  <Text style={styles.previewSets}>
                    {we.sets.length} {we.sets.length === 1 ? 'set' : 'sets'}
                  </Text>
                </View>
              );
            })}
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.saveBtn,
              pressed && styles.saveBtnPressed,
              createFromWorkout.isPending && styles.saveBtnDisabled,
            ]}
            onPress={handleSaveFromWorkout}
            disabled={createFromWorkout.isPending}
          >
            <Text style={styles.saveBtnText}>
              {createFromWorkout.isPending ? 'Saving…' : 'Save Template'}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // Standard create template view
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>Create Template</Text>

        <Text style={styles.label}>Template Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Push Day, Upper Body, Full Body A…"
          placeholderTextColor={colors.border}
          autoFocus
        />

        {/* Pending exercises */}
        {pendingExercises.length > 0 && (
          <View style={styles.exerciseList}>
            {pendingExercises.map((pe, i) => {
              const exercise = exerciseMap.get(pe.exerciseId);
              const asTe: TemplateExercise = {
                id: pe.id,
                templateId: '',
                exerciseId: pe.exerciseId,
                order: i,
                defaultSets: pe.defaultSets,
                createdAt: '',
              };
              return (
                <TemplateExerciseRow
                  key={pe.id}
                  templateExercise={asTe}
                  exercise={exercise}
                  editable
                  onRemove={() => handleRemovePendingExercise(pe.id)}
                  onSetCountChange={(delta) => handlePendingSetChange(pe.id, delta)}
                />
              );
            })}
          </View>
        )}

        <Pressable
          style={({ pressed }) => [
            styles.addExerciseBtn,
            pressed && styles.addExerciseBtnPressed,
          ]}
          onPress={() => setShowPicker(true)}
        >
          <Text style={styles.addExerciseText}>+ Add Exercise</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.saveBtn,
            pressed && styles.saveBtnPressed,
            (!name.trim() || createTemplate.isPending) && styles.saveBtnDisabled,
          ]}
          onPress={handleCreateEmpty}
          disabled={!name.trim() || createTemplate.isPending}
        >
          <Text style={styles.saveBtnText}>
            {createTemplate.isPending ? 'Creating…' : 'Create Template'}
          </Text>
        </Pressable>
      </ScrollView>

      <ExercisePicker
        visible={showPicker}
        onClose={() => setShowPicker(false)}
        onSelect={handleAddPendingExercise}
        excludeIds={pendingExercises.map((pe) => pe.exerciseId)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.xl,
    paddingBottom: 100,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: typography.h1.size,
    fontWeight: typography.h1.weight,
    marginBottom: spacing.sm,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: typography.body.size,
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  label: {
    color: colors.textMuted,
    fontSize: typography.caption.size,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.control,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.textPrimary,
    fontSize: typography.body.size,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  exerciseList: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  addExerciseBtn: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.accent + '44',
    borderStyle: 'dashed',
    backgroundColor: colors.accent + '08',
    marginBottom: spacing.xl,
  },
  addExerciseBtnPressed: {
    backgroundColor: colors.accent + '18',
  },
  addExerciseText: {
    color: colors.accent,
    fontSize: typography.body.size,
    fontWeight: '600',
  },
  saveBtn: {
    backgroundColor: colors.success,
    borderRadius: radius.control,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  saveBtnPressed: {
    opacity: 0.9,
  },
  saveBtnDisabled: {
    opacity: 0.4,
  },
  saveBtnText: {
    color: colors.background,
    fontSize: typography.body.size,
    fontWeight: '700',
  },
  // Preview styles for "Save from Workout" mode
  previewTitle: {
    color: colors.textPrimary,
    fontSize: typography.h2.size,
    fontWeight: typography.h2.weight,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  previewList: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: spacing.xl,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '44',
  },
  previewOrderBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.accent + '22',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  previewOrderText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  previewName: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: typography.body.size,
    fontWeight: '500',
  },
  previewSets: {
    color: colors.textMuted,
    fontSize: typography.caption.size,
    fontWeight: '500',
  },
});
