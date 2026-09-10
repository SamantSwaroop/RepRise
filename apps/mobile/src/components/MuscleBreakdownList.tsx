import { StyleSheet, Text, View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { MuscleVolumeBreakdown, MuscleGroup } from '@reprise/shared';
import { colors, spacing, radius, typography } from '../theme/tokens';

interface MuscleBreakdownListProps {
  breakdown: MuscleVolumeBreakdown[];
  selectedMuscle: MuscleGroup | null;
  onSelectMuscle: (muscle: MuscleGroup | null) => void;
}

const MUSCLE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  chest: 'shield-outline',
  back: 'body-outline',
  shoulders: 'barbell-outline',
  legs: 'walk-outline',
  arms: 'fitness-outline',
  core: 'disc-outline',
};

const INTENSITY_COLORS: Record<string, string> = {
  none: colors.surfaceRaised,
  light: '#81A1C1',
  moderate: '#88C0D0',
  high: '#A3BE8C',
};

function formatLastTrained(dateStr: string | null): string {
  if (!dateStr) return 'Not trained';
  const d = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Trained today';
  if (diffDays === 1) return 'Trained yesterday';
  return `Trained ${diffDays}d ago`;
}

export function MuscleBreakdownList({
  breakdown,
  selectedMuscle,
  onSelectMuscle,
}: MuscleBreakdownListProps) {
  return (
    <View style={styles.container}>
      {breakdown.map((item) => {
        const isSelected = selectedMuscle === item.muscleGroup;
        const barColor = INTENSITY_COLORS[item.intensityLevel] ?? colors.accent;
        const iconName = MUSCLE_ICONS[item.muscleGroup] ?? 'barbell-outline';

        return (
          <Pressable
            key={item.muscleGroup}
            style={[styles.rowCard, isSelected && styles.rowCardSelected]}
            onPress={() => onSelectMuscle(isSelected ? null : item.muscleGroup)}
          >
            <View style={styles.topLine}>
              <View style={styles.nameContainer}>
                <Ionicons
                  name={iconName}
                  size={14}
                  color={isSelected ? '#EBCB8B' : colors.accent}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.muscleName, isSelected && styles.muscleNameSelected]}>
                  {item.muscleGroup}
                </Text>
              </View>

              <View style={styles.metaRight}>
                <Text style={styles.percentageText}>{item.percentage}%</Text>
                <Text style={styles.volumeSubText}>
                  {item.setCount} sets • {item.volumeKg.toLocaleString()} kg
                </Text>
              </View>
            </View>

            {/* Progress Bar */}
            <View style={styles.track}>
              <View
                style={[
                  styles.fill,
                  {
                    width: `${Math.max(2, item.percentage)}%`,
                    backgroundColor: barColor,
                  },
                ]}
              />
            </View>

            {/* Sub line: Last trained */}
            <View style={styles.bottomLine}>
              <Text style={styles.lastTrainedText}>
                {formatLastTrained(item.lastTrainedDate)}
              </Text>
              {isSelected && (
                <Text style={styles.selectedBadge}>Focused on Model</Text>
              )}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  rowCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.control,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border + '44',
  },
  rowCardSelected: {
    borderColor: '#EBCB8B',
    backgroundColor: '#EBCB8B0A',
  },
  topLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  muscleName: {
    color: colors.textPrimary,
    fontSize: typography.body.size - 2,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  muscleNameSelected: {
    color: '#EBCB8B',
  },
  metaRight: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  percentageText: {
    color: colors.textPrimary,
    fontSize: typography.body.size - 2,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  volumeSubText: {
    color: colors.textMuted,
    fontSize: 10,
    fontVariant: ['tabular-nums'],
  },
  track: {
    height: 4,
    backgroundColor: colors.surfaceRaised,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  fill: {
    height: '100%',
    borderRadius: 2,
  },
  bottomLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastTrainedText: {
    color: colors.textMuted,
    fontSize: 10,
  },
  selectedBadge: {
    color: '#EBCB8B',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
