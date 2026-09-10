import { useState } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import Svg, { Path, Circle, G, Rect } from 'react-native-svg';
import type { MuscleVolumeBreakdown, MuscleGroup } from '@reprise/shared';
import { colors, spacing, radius, typography } from '../theme/tokens';

interface MuscleVisualizerProps {
  breakdown: MuscleVolumeBreakdown[];
  selectedMuscle: MuscleGroup | null;
  onSelectMuscle: (muscle: MuscleGroup | null) => void;
}

const INTENSITY_COLORS: Record<string, string> = {
  none: '#3B4252',
  light: '#81A1C1',
  moderate: '#88C0D0',
  high: '#A3BE8C',
};

export function MuscleVisualizer({
  breakdown,
  selectedMuscle,
  onSelectMuscle,
}: MuscleVisualizerProps) {
  const [viewSide, setViewSide] = useState<'front' | 'back'>('front');

  // Map each muscle group to its breakdown intensity
  const muscleMap = new Map(breakdown.map((b) => [b.muscleGroup, b]));

  const getMuscleColor = (group: MuscleGroup) => {
    const item = muscleMap.get(group);
    if (!item || item.setCount === 0) return INTENSITY_COLORS.none;
    return INTENSITY_COLORS[item.intensityLevel] ?? INTENSITY_COLORS.light;
  };

  const getStrokeColor = (group: MuscleGroup) => {
    if (selectedMuscle === group) return '#EBCB8B'; // Gold highlight
    return '#2E3440'; // Border separation
  };

  const getStrokeWidth = (group: MuscleGroup) => {
    if (selectedMuscle === group) return 2.5;
    return 1;
  };

  const handlePressMuscle = (group: MuscleGroup) => {
    if (selectedMuscle === group) {
      onSelectMuscle(null);
    } else {
      onSelectMuscle(group);
    }
  };

  return (
    <View style={styles.container}>
      {/* Front / Back Toggle Buttons */}
      <View style={styles.toggleRow}>
        <Pressable
          style={[styles.toggleBtn, viewSide === 'front' && styles.toggleBtnActive]}
          onPress={() => setViewSide('front')}
        >
          <Text
            style={[styles.toggleBtnText, viewSide === 'front' && styles.toggleBtnTextActive]}
          >
            Anterior (Front)
          </Text>
        </Pressable>
        <Pressable
          style={[styles.toggleBtn, viewSide === 'back' && styles.toggleBtnActive]}
          onPress={() => setViewSide('back')}
        >
          <Text
            style={[styles.toggleBtnText, viewSide === 'back' && styles.toggleBtnTextActive]}
          >
            Posterior (Back)
          </Text>
        </Pressable>
      </View>

      {/* Anatomical SVG Graphic */}
      <View style={styles.svgContainer}>
        <Svg width={180} height={280} viewBox="0 0 200 300">
          {/* Head & Neck (Neutral) */}
          <Circle cx="100" cy="24" r="14" fill="#434C5E" />
          <Rect x="94" y="38" width="12" height="10" rx="2" fill="#434C5E" />

          {viewSide === 'front' ? (
            <G>
              {/* Shoulders (Left & Right) */}
              <Path
                d="M 62 48 C 62 48 54 56 50 68 C 48 76 56 80 62 76 C 68 72 74 60 74 48 Z"
                fill={getMuscleColor('shoulders')}
                stroke={getStrokeColor('shoulders')}
                strokeWidth={getStrokeWidth('shoulders')}
                onPress={() => handlePressMuscle('shoulders')}
              />
              <Path
                d="M 138 48 C 138 48 146 56 150 68 C 152 76 144 80 138 76 C 132 72 126 60 126 48 Z"
                fill={getMuscleColor('shoulders')}
                stroke={getStrokeColor('shoulders')}
                strokeWidth={getStrokeWidth('shoulders')}
                onPress={() => handlePressMuscle('shoulders')}
              />

              {/* Chest (Left & Right Pectorals) */}
              <Path
                d="M 74 48 L 98 48 L 98 84 C 88 86 72 82 66 74 C 64 64 68 54 74 48 Z"
                fill={getMuscleColor('chest')}
                stroke={getStrokeColor('chest')}
                strokeWidth={getStrokeWidth('chest')}
                onPress={() => handlePressMuscle('chest')}
              />
              <Path
                d="M 126 48 L 102 48 L 102 84 C 112 86 128 82 134 74 C 136 64 132 54 126 48 Z"
                fill={getMuscleColor('chest')}
                stroke={getStrokeColor('chest')}
                strokeWidth={getStrokeWidth('chest')}
                onPress={() => handlePressMuscle('chest')}
              />

              {/* Arms (Biceps & Forearms Left & Right) */}
              <Path
                d="M 50 78 C 46 86 42 100 40 114 C 44 116 50 114 54 108 C 58 100 60 88 58 78 Z"
                fill={getMuscleColor('arms')}
                stroke={getStrokeColor('arms')}
                strokeWidth={getStrokeWidth('arms')}
                onPress={() => handlePressMuscle('arms')}
              />
              <Path
                d="M 40 118 C 36 128 32 142 30 154 C 34 156 40 152 44 144 C 48 134 50 124 48 118 Z"
                fill={getMuscleColor('arms')}
                stroke={getStrokeColor('arms')}
                strokeWidth={getStrokeWidth('arms')}
                onPress={() => handlePressMuscle('arms')}
              />
              <Path
                d="M 150 78 C 154 86 158 100 160 114 C 156 116 150 114 146 108 C 142 100 140 88 142 78 Z"
                fill={getMuscleColor('arms')}
                stroke={getStrokeColor('arms')}
                strokeWidth={getStrokeWidth('arms')}
                onPress={() => handlePressMuscle('arms')}
              />
              <Path
                d="M 160 118 C 164 128 168 142 170 154 C 166 156 160 152 156 144 C 152 134 150 124 152 118 Z"
                fill={getMuscleColor('arms')}
                stroke={getStrokeColor('arms')}
                strokeWidth={getStrokeWidth('arms')}
                onPress={() => handlePressMuscle('arms')}
              />

              {/* Core / Abs / Obliques */}
              <Path
                d="M 72 88 L 128 88 L 124 134 L 100 140 L 76 134 Z"
                fill={getMuscleColor('core')}
                stroke={getStrokeColor('core')}
                strokeWidth={getStrokeWidth('core')}
                onPress={() => handlePressMuscle('core')}
              />

              {/* Legs (Quadriceps & Thighs) */}
              <Path
                d="M 74 144 L 97 144 L 95 210 C 88 214 74 212 70 204 C 66 186 68 160 74 144 Z"
                fill={getMuscleColor('legs')}
                stroke={getStrokeColor('legs')}
                strokeWidth={getStrokeWidth('legs')}
                onPress={() => handlePressMuscle('legs')}
              />
              <Path
                d="M 126 144 L 103 144 L 105 210 C 112 214 126 212 130 204 C 134 186 132 160 126 144 Z"
                fill={getMuscleColor('legs')}
                stroke={getStrokeColor('legs')}
                strokeWidth={getStrokeWidth('legs')}
                onPress={() => handlePressMuscle('legs')}
              />

              {/* Lower Legs (Calves / Shins) */}
              <Path
                d="M 71 216 L 93 216 L 91 274 C 86 278 78 276 74 270 C 70 256 68 234 71 216 Z"
                fill={getMuscleColor('legs')}
                stroke={getStrokeColor('legs')}
                strokeWidth={getStrokeWidth('legs')}
                onPress={() => handlePressMuscle('legs')}
              />
              <Path
                d="M 129 216 L 107 216 L 109 274 C 114 278 122 276 126 270 C 130 256 132 234 129 216 Z"
                fill={getMuscleColor('legs')}
                stroke={getStrokeColor('legs')}
                strokeWidth={getStrokeWidth('legs')}
                onPress={() => handlePressMuscle('legs')}
              />
            </G>
          ) : (
            <G>
              {/* Shoulders (Posterior) */}
              <Path
                d="M 62 48 C 62 48 54 56 50 68 C 48 76 56 80 62 76 C 68 72 74 60 74 48 Z"
                fill={getMuscleColor('shoulders')}
                stroke={getStrokeColor('shoulders')}
                strokeWidth={getStrokeWidth('shoulders')}
                onPress={() => handlePressMuscle('shoulders')}
              />
              <Path
                d="M 138 48 C 138 48 146 56 150 68 C 152 76 144 80 138 76 C 132 72 126 60 126 48 Z"
                fill={getMuscleColor('shoulders')}
                stroke={getStrokeColor('shoulders')}
                strokeWidth={getStrokeWidth('shoulders')}
                onPress={() => handlePressMuscle('shoulders')}
              />

              {/* Back (Traps & Lats) */}
              <Path
                d="M 100 48 L 74 48 L 68 84 L 80 134 L 100 136 Z"
                fill={getMuscleColor('back')}
                stroke={getStrokeColor('back')}
                strokeWidth={getStrokeWidth('back')}
                onPress={() => handlePressMuscle('back')}
              />
              <Path
                d="M 100 48 L 126 48 L 132 84 L 120 134 L 100 136 Z"
                fill={getMuscleColor('back')}
                stroke={getStrokeColor('back')}
                strokeWidth={getStrokeWidth('back')}
                onPress={() => handlePressMuscle('back')}
              />

              {/* Arms (Triceps Left & Right) */}
              <Path
                d="M 50 78 C 46 86 42 100 40 114 C 44 116 50 114 54 108 C 58 100 60 88 58 78 Z"
                fill={getMuscleColor('arms')}
                stroke={getStrokeColor('arms')}
                strokeWidth={getStrokeWidth('arms')}
                onPress={() => handlePressMuscle('arms')}
              />
              <Path
                d="M 40 118 C 36 128 32 142 30 154 C 34 156 40 152 44 144 C 48 134 50 124 48 118 Z"
                fill={getMuscleColor('arms')}
                stroke={getStrokeColor('arms')}
                strokeWidth={getStrokeWidth('arms')}
                onPress={() => handlePressMuscle('arms')}
              />
              <Path
                d="M 150 78 C 154 86 158 100 160 114 C 156 116 150 114 146 108 C 142 100 140 88 142 78 Z"
                fill={getMuscleColor('arms')}
                stroke={getStrokeColor('arms')}
                strokeWidth={getStrokeWidth('arms')}
                onPress={() => handlePressMuscle('arms')}
              />
              <Path
                d="M 160 118 C 164 128 168 142 170 154 C 166 156 160 152 156 144 C 152 134 150 124 152 118 Z"
                fill={getMuscleColor('arms')}
                stroke={getStrokeColor('arms')}
                strokeWidth={getStrokeWidth('arms')}
                onPress={() => handlePressMuscle('arms')}
              />

              {/* Legs (Glutes & Hamstrings) */}
              <Path
                d="M 76 138 L 98 138 L 95 210 C 86 214 74 212 70 204 C 66 186 68 160 76 138 Z"
                fill={getMuscleColor('legs')}
                stroke={getStrokeColor('legs')}
                strokeWidth={getStrokeWidth('legs')}
                onPress={() => handlePressMuscle('legs')}
              />
              <Path
                d="M 124 138 L 102 138 L 105 210 C 114 214 126 212 130 204 C 134 186 132 160 124 138 Z"
                fill={getMuscleColor('legs')}
                stroke={getStrokeColor('legs')}
                strokeWidth={getStrokeWidth('legs')}
                onPress={() => handlePressMuscle('legs')}
              />

              {/* Lower Legs (Calves) */}
              <Path
                d="M 71 216 L 93 216 L 91 274 C 86 278 78 276 74 270 C 70 256 68 234 71 216 Z"
                fill={getMuscleColor('legs')}
                stroke={getStrokeColor('legs')}
                strokeWidth={getStrokeWidth('legs')}
                onPress={() => handlePressMuscle('legs')}
              />
              <Path
                d="M 129 216 L 107 216 L 109 274 C 114 278 122 276 126 270 C 130 256 132 234 129 216 Z"
                fill={getMuscleColor('legs')}
                stroke={getStrokeColor('legs')}
                strokeWidth={getStrokeWidth('legs')}
                onPress={() => handlePressMuscle('legs')}
              />
            </G>
          )}
        </Svg>
      </View>

      {/* Intensity Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: INTENSITY_COLORS.none }]} />
          <Text style={styles.legendLabel}>None</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: INTENSITY_COLORS.light }]} />
          <Text style={styles.legendLabel}>Light</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: INTENSITY_COLORS.moderate }]} />
          <Text style={styles.legendLabel}>Moderate</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: INTENSITY_COLORS.high }]} />
          <Text style={styles.legendLabel}>High</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.control,
    padding: 3,
    marginBottom: spacing.md,
    gap: 2,
  },
  toggleBtn: {
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radius.control - 2,
  },
  toggleBtnActive: {
    backgroundColor: colors.accent,
  },
  toggleBtnText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  toggleBtnTextActive: {
    color: colors.background,
    fontWeight: '700',
  },
  svgContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
  legend: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendColor: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  legendLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '500',
  },
});
