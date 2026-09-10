import { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TextInput, Pressable, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { WorkoutSet, SetType, PRType } from '@reprise/shared';
import { SET_TYPES, displayWeight, parseWeightInput } from '@reprise/shared';
import { colors, spacing, typography, numericText } from '../theme/tokens';
import { PRBadge } from './PRBadge';
import { useSettingsStore } from '../stores/settingsStore';

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
  /** Personal record types broken on this set (if completed). */
  prTypes?: PRType[];
}

export function SetRow({
  set,
  onUpdate,
  onDelete,
  readOnly,
  previousSet,
  onCopyPrevious,
  prTypes,
}: SetRowProps) {
  const typeCfg = SET_TYPE_LABELS[set.type];
  const hasPR = Boolean(set.isCompleted && prTypes && prTypes.length > 0);
  const weightUnit = useSettingsStore((s) => s.weightUnit);

  const initialDisplay = displayWeight(set.weightKg, weightUnit);

  // Local state for smooth typing (especially decimals like "2." or "2.5")
  const [weightText, setWeightText] = useState(
    initialDisplay != null ? String(initialDisplay) : '',
  );
  const [repsText, setRepsText] = useState(
    set.reps != null ? String(set.reps) : '',
  );

  // Sync weightText when set.weightKg or weightUnit changes externally
  useEffect(() => {
    const curNum = parseFloat(weightText.replace(',', '.'));
    const targetVal = displayWeight(set.weightKg, weightUnit);
    const isEmpty = weightText.trim() === '';

    if (isEmpty && targetVal != null) {
      setWeightText(String(targetVal));
    } else if (!isEmpty && targetVal == null) {
      setWeightText('');
    } else if (!isEmpty && !isNaN(curNum) && Math.abs(curNum - (targetVal ?? 0)) > 0.05) {
      setWeightText(targetVal != null ? String(targetVal) : '');
    }
  }, [set.weightKg, weightUnit]);

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

    const canonicalKg = parseWeightInput(normalized, weightUnit);
    const curReps = repsText.trim() === '' ? null : parseInt(repsText, 10);
    const validReps = curReps !== null && !isNaN(curReps) && curReps > 0 ? curReps : null;

    // Automatically complete/select set when both weight and reps are filled
    const isCompleted = canonicalKg != null && validReps != null;

    onUpdate({
      weightKg: canonicalKg,
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

    const canonicalKg = parseWeightInput(weightText, weightUnit);

    // Automatically complete/select set when both weight and reps are filled
    const isCompleted = canonicalKg != null && validReps != null;

    onUpdate({
      reps: validReps,
      isCompleted,
    });
  };

  const checkScale = useRef(new Animated.Value(1)).current;

  const handleToggleComplete = () => {
    if (readOnly) return;
    const nextCompleted = !set.isCompleted;

    if (nextCompleted) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } else {
      Haptics.selectionAsync().catch(() => {});
    }

    Animated.sequence([
      Animated.timing(checkScale, {
        toValue: 1.25,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(checkScale, {
        toValue: 1.0,
        tension: 200,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();

    const canonicalKg = parseWeightInput(weightText, weightUnit);
    const curReps = repsText.trim() === '' ? null : parseInt(repsText, 10);
    const validReps = curReps !== null && !isNaN(curReps) && curReps > 0 ? curReps : null;

    onUpdate({
      weightKg: canonicalKg,
      reps: validReps,
      isCompleted: nextCompleted,
    });
  };

  const cycleType = () => {
    const types = SET_TYPES;
    const idx = types.indexOf(set.type);
    const nextType = types[(idx + 1) % types.length];
    onUpdate({ type: nextType });
  };

  // Format previous set data as ghost text converted to active unit
  const prevWeight = previousSet?.weightKg != null ? displayWeight(previousSet.weightKg, weightUnit) : null;
  const prevLabel = previousSet
    ? `${prevWeight ?? '—'}×${previousSet.reps ?? '—'}`
    : null;

  return (
    <View
      style={[
        styles.row,
        set.isCompleted && styles.rowCompleted,
        hasPR && styles.rowPR,
      ]}
    >
      {/* Set number */}
      <Text
        style={[
          styles.setNum,
          set.isCompleted && styles.setNumCompleted,
          hasPR && styles.setNumPR,
        ]}
      >
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
      <View
        style={[
          styles.inputCell,
          set.isCompleted && styles.inputCellCompleted,
          hasPR && styles.inputCellPR,
        ]}
      >
        <TextInput
          style={[styles.input, numericText]}
          value={weightText}
          onChangeText={handleWeightChange}
          onBlur={handleWeightBlur}
          placeholder="—"
          placeholderTextColor={colors.border}
          keyboardType="decimal-pad"
          editable={!readOnly}
          selectTextOnFocus
        />
        <Text style={styles.unit}>{weightUnit}</Text>
      </View>

      {/* Reps input */}
      <View
        style={[
          styles.inputCell,
          set.isCompleted && styles.inputCellCompleted,
          hasPR && styles.inputCellPR,
        ]}
      >
        <TextInput
          style={[styles.input, numericText]}
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

      {/* PR Badge if earned */}
      {hasPR && <PRBadge prTypes={prTypes!} size="sm" />}

      {/* Checkmark Completion Button */}
      {!readOnly && (
        <Pressable
          onPress={handleToggleComplete}
          style={styles.checkBtnWrap}
          hitSlop={8}
        >
          <Animated.View
            style={[
              styles.checkBtn,
              set.isCompleted && styles.checkBtnCompleted,
              { transform: [{ scale: checkScale }] },
            ]}
          >
            <Ionicons
              name={set.isCompleted ? 'checkmark' : 'checkmark-outline'}
              size={14}
              color={set.isCompleted ? colors.background : colors.textMuted}
            />
          </Animated.View>
        </Pressable>
      )}

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
  rowPR: {
    backgroundColor: '#EBCB8B18',
    borderLeftColor: '#EBCB8B',
  },
  setNum: {
    width: 18,
    color: colors.textMuted,
    fontSize: typography.caption.size,
    fontWeight: '600',
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  setNumCompleted: {
    color: colors.success,
    fontWeight: '700',
  },
  setNumPR: {
    color: '#EBCB8B',
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
  inputCellPR: {
    borderColor: '#EBCB8B55',
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
  checkBtnWrap: {
    paddingHorizontal: 2,
  },
  checkBtn: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBtnCompleted: {
    backgroundColor: colors.success,
    borderColor: colors.success,
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
