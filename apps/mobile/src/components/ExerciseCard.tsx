import { StyleSheet, Text, View, Pressable } from 'react-native';
import type { Exercise } from '@reprise/shared';
import { colors, spacing, typography, radius } from '../theme/tokens';

const MUSCLE_GROUP_COLORS: Record<string, string> = {
  chest: '#BF616A',
  back: '#5E81AC',
  shoulders: '#EBCB8B',
  legs: '#A3BE8C',
  arms: '#D08770',
  core: '#B48EAD',
  cardio: '#88C0D0',
  other: '#4C566A',
};

interface ExerciseCardProps {
  exercise: Exercise;
  onPress?: () => void;
  onDelete?: () => void;
}

export function ExerciseCard({ exercise, onPress, onDelete }: ExerciseCardProps) {
  const badgeColor = MUSCLE_GROUP_COLORS[exercise.muscleGroup] ?? colors.border;

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.info}>
          <Text style={styles.name}>{exercise.name}</Text>
          <View style={styles.tags}>
            <View style={[styles.badge, { backgroundColor: badgeColor + '33' }]}>
              <Text style={[styles.badgeText, { color: badgeColor }]}>
                {exercise.muscleGroup}
              </Text>
            </View>
            {exercise.equipment && (
              <View style={[styles.badge, styles.equipBadge]}>
                <Text style={styles.equipText}>{exercise.equipment}</Text>
              </View>
            )}
            {exercise.defaultSets ? (
              <View style={[styles.badge, styles.setsBadge]}>
                <Text style={styles.setsText}>{exercise.defaultSets} sets</Text>
              </View>
            ) : null}
          </View>
        </View>
        {exercise.userId && (
          <View style={styles.rightActions}>
            <View style={styles.customBadge}>
              <Text style={styles.customText}>Custom</Text>
            </View>
            {onDelete && (
              <Pressable
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={({ pressed }) => [styles.deleteBtn, pressed && styles.deleteBtnPressed]}
                onPress={onDelete}
              >
                <Text style={styles.deleteText}>🗑</Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  info: {
    flex: 1,
    marginRight: spacing.sm,
  },
  name: {
    color: colors.textPrimary,
    fontSize: typography.body.size,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  tags: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  equipBadge: {
    backgroundColor: colors.surfaceRaised,
  },
  equipText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  setsBadge: {
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  setsText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '500',
  },
  customBadge: {
    backgroundColor: colors.accent + '22',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 6,
  },
  customText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '600',
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  deleteBtn: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: colors.danger + '18',
  },
  deleteBtnPressed: {
    backgroundColor: colors.danger + '33',
  },
  deleteText: {
    fontSize: 12,
  },
});
