import { StyleSheet, Text, View, TextInput, Pressable } from 'react-native';
import type { WorkoutSet, SetType } from '@reprise/shared';
import { SET_TYPES } from '@reprise/shared';
import { colors, spacing, typography } from '../theme/tokens';

const SET_TYPE_LABELS: Record<SetType, { short: string; color: string }> = {
  normal: { short: 'N', color: colors.accent },
  warmup: { short: 'W', color: colors.warning },
  drop: { short: 'D', color: '#D08770' },
  failure: { short: 'F', color: colors.danger },
};

interface SetRowProps {
  set: WorkoutSet;
  onUpdate: (data: {
    type?: SetType;
    weightKg?: number | null;
    reps?: number | null;
    rpe?: number | null;
    isCompleted?: boolean;
  }) => void;
  onDelete: () => void;
  readOnly?: boolean;
  /** Matching set from the previous completed workout (same exercise, same set number). */
  previousSet?: WorkoutSet | null;
  /** Called when the user taps "copy" to auto-fill from the previous set. */
  onCopyPrevious?: () => void;
}

export function SetRow({ set, onUpdate, onDelete, readOnly, previousSet, onCopyPrevious }: SetRowProps) {
  const typeCfg = SET_TYPE_LABELS[set.type];

  const handleWeightChange = (text: string) => {
    const num = parseFloat(text);
    onUpdate({ weightKg: isNaN(num) ? null : num });
  };

  const handleRepsChange = (text: string) => {
    const num = parseInt(text, 10);
    onUpdate({ reps: isNaN(num) ? null : num });
  };

  const handleRpeChange = (text: string) => {
    const num = parseFloat(text);
    onUpdate({ rpe: isNaN(num) ? null : Math.min(10, Math.max(1, num)) });
  };

  const toggleCompleted = () => {
    onUpdate({ isCompleted: !set.isCompleted });
  };

  const cycleType = () => {
    const types = SET_TYPES;
    const idx = types.indexOf(set.type);
    const nextType = types[(idx + 1) % types.length];
    onUpdate({ type: nextType });
  };

  // Format previous set data as ghost text
  const prevLabel = previousSet
    ? `${previousSet.weightKg ?? '—'}×${previousSet.reps ?? '—'}`
    : null;

  return (
    <View style={[styles.row, set.isCompleted && styles.rowCompleted]}>
      {/* Set number */}
      <Text style={styles.setNum}>{set.setNumber}</Text>

      {/* Type badge */}
      <Pressable
        style={[styles.typeBadge, { backgroundColor: typeCfg.color + '22' }]}
        onPress={readOnly ? undefined : cycleType}
      >
        <Text style={[styles.typeText, { color: typeCfg.color }]}>{typeCfg.short}</Text>
      </Pressable>

      {/* Previous performance ghost */}
      {!readOnly && prevLabel ? (
        <Pressable
          style={styles.prevCell}
          onPress={onCopyPrevious}
        >
          <Text style={styles.prevText}>{prevLabel}</Text>
          <Text style={styles.copyIcon}>↩</Text>
        </Pressable>
      ) : !readOnly ? (
        <View style={styles.prevCellEmpty} />
      ) : null}

      {/* Weight input */}
      <View style={styles.inputCell}>
        <TextInput
          style={styles.input}
          value={set.weightKg != null ? String(set.weightKg) : ''}
          onChangeText={handleWeightChange}
          placeholder="—"
          placeholderTextColor={colors.border}
          keyboardType="decimal-pad"
          editable={!readOnly}
          selectTextOnFocus
        />
        <Text style={styles.unit}>kg</Text>
      </View>

      {/* Reps input */}
      <View style={styles.inputCell}>
        <TextInput
          style={styles.input}
          value={set.reps != null ? String(set.reps) : ''}
          onChangeText={handleRepsChange}
          placeholder="—"
          placeholderTextColor={colors.border}
          keyboardType="number-pad"
          editable={!readOnly}
          selectTextOnFocus
        />
        <Text style={styles.unit}>reps</Text>
      </View>

      {/* RPE input */}
      <View style={[styles.inputCell, styles.inputCellSmall]}>
        <TextInput
          style={styles.input}
          value={set.rpe != null ? String(set.rpe) : ''}
          onChangeText={handleRpeChange}
          placeholder="—"
          placeholderTextColor={colors.border}
          keyboardType="decimal-pad"
          editable={!readOnly}
          selectTextOnFocus
        />
        <Text style={styles.unit}>RPE</Text>
      </View>

      {/* Complete checkbox */}
      {!readOnly && (
        <Pressable style={styles.checkBtn} onPress={toggleCompleted}>
          <Text style={styles.checkIcon}>{set.isCompleted ? '✅' : '⬜'}</Text>
        </Pressable>
      )}

      {/* Delete button */}
      {!readOnly && (
        <Pressable style={styles.deleteBtn} onPress={onDelete}>
          <Text style={styles.deleteIcon}>✕</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    gap: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border + '55',
  },
  rowCompleted: {
    opacity: 0.7,
    backgroundColor: colors.success + '08',
  },
  setNum: {
    width: 18,
    color: colors.textMuted,
    fontSize: typography.caption.size,
    fontWeight: '600',
    textAlign: 'center',
  },
  typeBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  prevCell: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accentStrong + '18',
    borderRadius: 5,
    paddingHorizontal: 4,
    paddingVertical: 2,
    gap: 2,
  },
  prevCellEmpty: {
    width: 0,
  },
  prevText: {
    color: colors.accentStrong,
    fontSize: 10,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  copyIcon: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: '700',
  },
  inputCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 6,
    paddingHorizontal: spacing.xs,
    height: 34,
    borderWidth: 1,
    borderColor: colors.border + '55',
  },
  inputCellSmall: {
    flex: 0.7,
  },
  input: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: typography.caption.size,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 0,
  },
  unit: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '500',
    marginLeft: 1,
  },
  checkBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkIcon: {
    fontSize: 16,
  },
  deleteBtn: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteIcon: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '700',
  },
});
