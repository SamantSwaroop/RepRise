import { StyleSheet, Text, View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { TemplateExercise, Exercise } from '@reprise/shared';
import { colors, spacing, typography, radius } from '../theme/tokens';

interface TemplateExerciseRowProps {
  templateExercise: TemplateExercise;
  exercise?: Exercise;
  editable?: boolean;
  onRemove?: () => void;
  onSetCountChange?: (delta: number) => void;
}

export function TemplateExerciseRow({
  templateExercise,
  exercise,
  editable = false,
  onRemove,
  onSetCountChange,
}: TemplateExerciseRowProps) {
  const muscleGroup = exercise?.muscleGroup ?? 'other';
  const displayName = exercise?.name ?? 'Unknown Exercise';

  return (
    <View style={styles.row}>
      <View style={styles.orderBadge}>
        <Text style={styles.orderText}>{templateExercise.order + 1}</Text>
      </View>

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {displayName}
        </Text>
        <View style={styles.metaRow}>
          <View style={styles.musclePill}>
            <Text style={styles.muscleText}>{muscleGroup}</Text>
          </View>
          {exercise?.equipment && (
            <Text style={styles.equipment}>{exercise.equipment}</Text>
          )}
        </View>
      </View>

      {/* Set count control */}
      <View style={styles.setsControl}>
        {editable && onSetCountChange && (
          <Pressable
            style={({ pressed }) => [styles.stepBtn, pressed && styles.stepBtnPressed]}
            onPress={() => onSetCountChange(-1)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            disabled={templateExercise.defaultSets <= 1}
          >
            <Text style={[styles.stepText, templateExercise.defaultSets <= 1 && styles.stepTextDisabled]}>−</Text>
          </Pressable>
        )}
        <Text style={styles.setsValue}>
          {templateExercise.defaultSets} {templateExercise.defaultSets === 1 ? 'set' : 'sets'}
        </Text>
        {editable && onSetCountChange && (
          <Pressable
            style={({ pressed }) => [styles.stepBtn, pressed && styles.stepBtnPressed]}
            onPress={() => onSetCountChange(1)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            disabled={templateExercise.defaultSets >= 20}
          >
            <Text style={[styles.stepText, templateExercise.defaultSets >= 20 && styles.stepTextDisabled]}>+</Text>
          </Pressable>
        )}
      </View>

      {/* Remove button */}
      {editable && onRemove && (
        <Pressable
          style={({ pressed }) => [styles.removeBtn, pressed && styles.removeBtnPressed]}
          onPress={onRemove}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close" size={16} color={colors.danger} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '44',
  },
  orderBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.accent + '22',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  orderText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  info: {
    flex: 1,
    marginRight: spacing.sm,
  },
  name: {
    color: colors.textPrimary,
    fontSize: typography.body.size,
    fontWeight: '500',
    marginBottom: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  musclePill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: colors.accentStrong + '22',
  },
  muscleText: {
    color: colors.accentStrong,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  equipment: {
    color: colors.textMuted,
    fontSize: 10,
    textTransform: 'capitalize',
  },
  setsControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  stepBtn: {
    width: 24,
    height: 24,
    borderRadius: 4,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnPressed: {
    backgroundColor: colors.border,
  },
  stepText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 20,
  },
  stepTextDisabled: {
    color: colors.border,
  },
  setsValue: {
    color: colors.textSecondary,
    fontSize: typography.caption.size,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    minWidth: 44,
    textAlign: 'center',
  },
  removeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.danger + '18',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  removeBtnPressed: {
    backgroundColor: colors.danger + '33',
  },
  removeText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '600',
  },
});
