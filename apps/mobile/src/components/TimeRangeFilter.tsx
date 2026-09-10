import { StyleSheet, Text, View, Pressable } from 'react-native';
import type { TimeRange } from '@reprise/shared';
import { colors, spacing, radius } from '../theme/tokens';

const RANGES: TimeRange[] = ['1M', '3M', '6M', '1Y', 'ALL'];

interface TimeRangeFilterProps {
  selected: TimeRange;
  onSelect: (range: TimeRange) => void;
}

export function TimeRangeFilter({ selected, onSelect }: TimeRangeFilterProps) {
  return (
    <View style={styles.container}>
      {RANGES.map((r) => {
        const isSelected = r === selected;
        return (
          <Pressable
            key={r}
            style={[styles.pill, isSelected && styles.pillActive]}
            onPress={() => onSelect(r)}
            hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
          >
            <Text style={[styles.pillText, isSelected && styles.pillTextActive]}>
              {r}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.control,
    padding: 3,
    gap: 2,
    alignSelf: 'flex-start',
  },
  pill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.control - 2,
  },
  pillActive: {
    backgroundColor: colors.accent,
  },
  pillText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  pillTextActive: {
    color: colors.background,
    fontWeight: '700',
  },
});
