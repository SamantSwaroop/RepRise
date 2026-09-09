import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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

export function SetRow({
  set,
  onUpdate,
  onDelete,
  readOnly,
  previousSet,
  onCopyPrevious,
}: SetRowProps) {
  const typeCfg = SET_TYPE_LABELS[set.type];

  // Local state for smooth typing (especially decimals like "2." or "2.5")
  const [weightText, setWeightText] = useState(
    set.weightKg != null ? String(set.weightKg) : '',
  );
  const [repsText, setRepsText] = useState(
    set.reps != null ? String(set.reps) : '',
  );

  // Sync weightText only when the numerical value from props changes externally
  useEffect(() => {
    const curNum = parseFloat(weightText.replace(',', '.'));
    const isEmpty = weightText.trim() === '';
    if (isEmpty && set.weightKg != null) {
      setWeightText(String(set.weightKg));
    } else if (!isEmpty && set.weightKg == null) {
      setWeightText('');
    } else if (!isEmpty && !isNaN(curNum) && curNum !== set.weightKg) {
      setWeightText(set.weightKg != null ? String(set.weightKg) : '');
    }
  }, [set.weightKg]);

  // Sync repsText only when the numerical value from props changes externally
  useEffect(() => {
    const curNum = parseInt(repsText, 10);
    const isEmpty = repsText.trim() === '';
    if (isEmpty && set.reps != null) {
      setRepsText(String(set.reps));
    } else if (!isEmpty && set.reps == null) {
      setRepsText('');
    } else if (!isEmpty && !isNaN(curNum) && curNum !== set.reps) {
      setRepsText(set.reps != null ? String(set.reps) : '');
    }
  }, [set.reps]);

  const handleWeightChange = (text: string) => {
    // Normalize commas to dots (for international keyboards)
    const normalized = text.replace(',', '.');
    // Allow digits and at most one decimal point (e.g. "", "2", "2.", "2.5")
    if (normalized !== '' && !/^\d*\.?\d*$/.test(normalized)) {
      return;
    }
    setWeightText(normalized);

    const weightNum =
      normalized === '' || normalized === '.' ? null : parseFloat(normalized);
    const validWeight =
      weightNum !== null && !isNaN(weightNum) && weightNum >= 0 ? weightNum : null;

    const curReps = repsText.trim() === '' ? null : parseInt(repsText, 10);
    const validReps = curReps !== null && !isNaN(curReps) && curReps > 0 ? curReps : null;

    // Automatically complete/select set when both weight and reps are filled
    const isCompleted = validWeight != null && validReps != null;

    onUpdate({
      weightKg: validWeight,
      isCompleted,
    });
  };

  const handleWeightBlur = () => {
    if (weightText.endsWith('.')) {
      const cleaned = weightText.slice(0, -1);
      setWeightText(cleaned);
    }
  };

  const handleRepsChange = (text: string) => {
    // Reps should be whole numbers only
    const cleaned = text.replace(/[^0-9]/g, '');
    setRepsText(cleaned);

    const repsNum = cleaned === '' ? null : parseInt(cleaned, 10);
    const validReps = repsNum !== null && repsNum > 0 ? repsNum : null;

    const curWeightNum = parseFloat(weightText.replace(',', '.'));
    const validWeight =
      !isNaN(curWeightNum) && curWeightNum >= 0 ? curWeightNum : null;

    // Automatically complete/select set when both weight and reps are filled
    const isCompleted = validWeight != null && validReps != null;

    onUpdate({
      reps: validReps,
      isCompleted,
    });
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
      <Text style={[styles.setNum, set.isCompleted && styles.setNumCompleted]}>
        {set.setNumber}
      </Text>

      {/* Type badge */}
      <Pressable
        style={[styles.typeBadge, { backgroundColor: typeCfg.color + '22' }]}
        onPress={readOnly ? undefined : cycleType}
      >
        <Text style={[styles.typeText, { color: typeCfg.color }]}>{typeCfg.short}</Text>
      </Pressable>

      {/* Previous performance ghost */}
      {!readOnly && prevLabel ? (
        <Pressable style={styles.prevCell} onPress={onCopyPrevious}>
          <Text style={styles.prevText}>{prevLabel}</Text>
          <Ionicons name="arrow-undo" size={11} color={colors.accent} />
        </Pressable>
      ) : !readOnly ? (
        <View style={styles.prevCellEmpty} />
      ) : null}

      {/* Weight input */}
      <View style={[styles.inputCell, set.isCompleted && styles.inputCellCompleted]}>
        <TextInput
          style={styles.input}
          value={weightText}
          onChangeText={handleWeightChange}
          onBlur={handleWeightBlur}
          placeholder="—"
          placeholderTextColor={colors.border}
          keyboardType="decimal-pad"
          editable={!readOnly}
          selectTextOnFocus
        />
        <Text style={styles.unit}>kg</Text>
      </View>

      {/* Reps input */}
      <View style={[styles.inputCell, set.isCompleted && styles.inputCellCompleted]}>
        <TextInput
          style={styles.input}
          value={repsText}
          onChangeText={handleRepsChange}
          placeholder="—"
          placeholderTextColor={colors.border}
          keyboardType="number-pad"
          editable={!readOnly}
          selectTextOnFocus
        />
        <Text style={styles.unit}>reps</Text>
      </View>

      {/* Delete button */}
      {!readOnly && (
        <Pressable
          style={styles.deleteBtn}
          onPress={onDelete}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close" size={14} color={colors.danger} />
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
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  rowCompleted: {
    backgroundColor: colors.success + '12',
    borderLeftColor: colors.success,
  },
  setNum: {
    width: 18,
    color: colors.textMuted,
    fontSize: typography.caption.size,
    fontWeight: '600',
    textAlign: 'center',
  },
  setNumCompleted: {
    color: colors.success,
    fontWeight: '700',
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
  inputCellCompleted: {
    borderColor: colors.success + '44',
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
