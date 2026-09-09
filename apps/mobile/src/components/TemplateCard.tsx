import { StyleSheet, Text, View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Template } from '@reprise/shared';
import { colors, spacing, typography, radius } from '../theme/tokens';

interface TemplateCardProps {
  template: Omit<Template, 'exercises'> & { exerciseCount: number };
  onPress: () => void;
  onStart: () => void;
}

export function TemplateCard({ template, onPress, onStart }: TemplateCardProps) {
  const dateStr = new Date(template.updatedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
    >
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>
          {template.name}
        </Text>
        <View style={styles.meta}>
          <Text style={styles.exerciseCount}>
            {template.exerciseCount} {template.exerciseCount === 1 ? 'exercise' : 'exercises'}
          </Text>
          <Text style={styles.dot}>•</Text>
          <Text style={styles.date}>{dateStr}</Text>
        </View>
      </View>

      <Pressable
        style={({ pressed }) => [styles.startBtn, pressed && styles.startBtnPressed]}
        onPress={(e) => {
          e.stopPropagation();
          onStart();
        }}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="play" size={16} color={colors.accent} style={{ marginLeft: 2 }} />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardPressed: {
    backgroundColor: colors.surfaceRaised,
  },
  content: {
    flex: 1,
    marginRight: spacing.md,
  },
  name: {
    color: colors.textPrimary,
    fontSize: typography.body.size,
    fontWeight: '600',
    marginBottom: 4,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  exerciseCount: {
    color: colors.accent,
    fontSize: typography.caption.size,
    fontWeight: '500',
  },
  dot: {
    color: colors.textMuted,
    fontSize: typography.caption.size,
  },
  date: {
    color: colors.textMuted,
    fontSize: typography.caption.size,
  },
  startBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accent + '22',
    alignItems: 'center',
    justifyContent: 'center',
  },
  startBtnPressed: {
    backgroundColor: colors.accent + '44',
  },
  startText: {
    color: colors.accent,
    fontSize: 16,
  },
});
