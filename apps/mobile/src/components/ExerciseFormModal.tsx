import { useState } from 'react';
import { StyleSheet, Text, View, TextInput, Pressable, Modal, ScrollView } from 'react-native';
import { MUSCLE_GROUPS, EQUIPMENT } from '@reprise/shared';
import type { MuscleGroup, Equipment } from '@reprise/shared';
import { colors, spacing, typography, radius } from '../theme/tokens';

interface ExerciseFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    muscleGroup: MuscleGroup;
    equipment: Equipment | null;
    defaultSets?: number;
  }) => void;
  initialValues?: {
    name: string;
    muscleGroup: MuscleGroup;
    equipment: Equipment | null;
    defaultSets?: number | null;
  };
  loading?: boolean;
}

export function ExerciseFormModal({ visible, onClose, onSubmit, initialValues, loading }: ExerciseFormModalProps) {
  const [name, setName] = useState(initialValues?.name ?? '');
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroup>(initialValues?.muscleGroup ?? 'chest');
  const [equipment, setEquipment] = useState<Equipment | null>(initialValues?.equipment ?? null);
  const [defaultSets, setDefaultSets] = useState<number>(initialValues?.defaultSets ?? 3);
  const [error, setError] = useState('');

  const isEditing = !!initialValues;

  const handleSubmit = () => {
    setError('');
    if (!name.trim()) {
      setError('Exercise name is required');
      return;
    }
    onSubmit({ name: name.trim(), muscleGroup, equipment, defaultSets });
  };

  const handleClose = () => {
    setName(initialValues?.name ?? '');
    setMuscleGroup(initialValues?.muscleGroup ?? 'chest');
    setEquipment(initialValues?.equipment ?? null);
    setDefaultSets(initialValues?.defaultSets ?? 3);
    setError('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <Text style={styles.title}>{isEditing ? 'Edit Exercise' : 'New Exercise'}</Text>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <ScrollView style={styles.form} keyboardShouldPersistTaps="handled">
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Exercise Name</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Incline Dumbbell Curl"
                placeholderTextColor={colors.border}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Muscle Group</Text>
              <View style={styles.chips}>
                {MUSCLE_GROUPS.map((mg) => (
                  <Pressable
                    key={mg}
                    style={[styles.chip, muscleGroup === mg && styles.chipSelected]}
                    onPress={() => setMuscleGroup(mg)}
                  >
                    <Text style={[styles.chipText, muscleGroup === mg && styles.chipTextSelected]}>
                      {mg}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Equipment (optional)</Text>
              <View style={styles.chips}>
                <Pressable
                  style={[styles.chip, equipment === null && styles.chipSelected]}
                  onPress={() => setEquipment(null)}
                >
                  <Text style={[styles.chipText, equipment === null && styles.chipTextSelected]}>
                    None
                  </Text>
                </Pressable>
                {EQUIPMENT.map((eq) => (
                  <Pressable
                    key={eq}
                    style={[styles.chip, equipment === eq && styles.chipSelected]}
                    onPress={() => setEquipment(eq)}
                  >
                    <Text style={[styles.chipText, equipment === eq && styles.chipTextSelected]}>
                      {eq}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Default Sets</Text>
              <Text style={styles.helperText}>
                Sets automatically added when this exercise is added to a workout
              </Text>
              <View style={styles.chips}>
                {[1, 2, 3, 4, 5, 6].map((num) => (
                  <Pressable
                    key={num}
                    style={[styles.chip, defaultSets === num && styles.chipSelected]}
                    onPress={() => setDefaultSets(num)}
                  >
                    <Text style={[styles.chipText, defaultSets === num && styles.chipTextSelected]}>
                      {num} {num === 1 ? 'set' : 'sets'}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </ScrollView>

          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [styles.button, styles.cancelButton, pressed && styles.buttonPressed]}
              onPress={handleClose}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.button, styles.submitButton, loading && styles.buttonDisabled, pressed && styles.buttonPressed]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={styles.submitText}>{loading ? 'Saving…' : isEditing ? 'Save' : 'Add Exercise'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingHorizontal: spacing.xl,
    paddingBottom: 40,
    maxHeight: '85%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.h2.size,
    fontWeight: typography.h2.weight,
    marginBottom: spacing.lg,
  },
  errorBox: {
    backgroundColor: colors.danger + '22',
    borderRadius: radius.control,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: {
    color: colors.danger,
    fontSize: typography.caption.size,
  },
  form: {
    marginBottom: spacing.lg,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    color: colors.textSecondary,
    fontSize: typography.caption.size,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  helperText: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: spacing.sm,
  },
  input: {
    height: 48,
    backgroundColor: colors.surface,
    borderRadius: radius.control,
    paddingHorizontal: spacing.lg,
    color: colors.textPrimary,
    fontSize: typography.body.size,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.control,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: {
    backgroundColor: colors.accent + '33',
    borderColor: colors.accent,
  },
  chipText: {
    color: colors.textMuted,
    fontSize: typography.caption.size,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  chipTextSelected: {
    color: colors.accent,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: radius.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  cancelButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelText: {
    color: colors.textMuted,
    fontSize: typography.body.size,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: colors.accent,
  },
  submitText: {
    color: colors.background,
    fontSize: typography.body.size,
    fontWeight: '600',
  },
});
