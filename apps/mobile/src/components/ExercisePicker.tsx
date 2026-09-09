import { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import type { Exercise } from '@reprise/shared';
import { colors, spacing, typography, radius } from '../theme/tokens';
import { useExercises } from '../hooks/useExercises';

interface ExercisePickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (exercise: Exercise) => void;
  /** IDs of exercises already in the workout — shown as disabled. */
  excludeIds?: string[];
}

export function ExercisePicker({ visible, onClose, onSelect, excludeIds = [] }: ExercisePickerProps) {
  const [search, setSearch] = useState('');
  const { data: exercises, isLoading } = useExercises(search || undefined);

  const filtered = useMemo(() => {
    if (!exercises) return [];
    return exercises;
  }, [exercises]);

  const excludeSet = useMemo(() => new Set(excludeIds), [excludeIds]);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <Text style={styles.title}>Add Exercise</Text>

          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search exercises…"
            placeholderTextColor={colors.border}
            autoCapitalize="none"
            clearButtonMode="while-editing"
          />

          {isLoading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={colors.accent} />
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.list}
              renderItem={({ item }) => {
                const isExcluded = excludeSet.has(item.id);
                return (
                  <Pressable
                    style={({ pressed }) => [
                      styles.item,
                      isExcluded && styles.itemDisabled,
                      pressed && !isExcluded && styles.itemPressed,
                    ]}
                    onPress={() => {
                      if (!isExcluded) {
                        onSelect(item);
                        setSearch('');
                      }
                    }}
                    disabled={isExcluded}
                  >
                    <Text
                      style={[styles.itemName, isExcluded && styles.itemNameDisabled]}
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>
                    <Text style={styles.itemMeta}>
                      {item.muscleGroup}
                      {item.equipment ? ` • ${item.equipment}` : ''}
                      {item.defaultSets ? ` • ${item.defaultSets} sets` : ''}
                    </Text>
                    {isExcluded && <Text style={styles.addedLabel}>Added</Text>}
                  </Pressable>
                );
              }}
              ListEmptyComponent={
                <View style={styles.center}>
                  <Text style={styles.emptyText}>
                    {search ? 'No exercises match your search' : 'No exercises available'}
                  </Text>
                </View>
              }
            />
          )}

          <Pressable
            style={({ pressed }) => [styles.closeBtn, pressed && styles.closeBtnPressed]}
            onPress={() => {
              setSearch('');
              onClose();
            }}
          >
            <Text style={styles.closeText}>Cancel</Text>
          </Pressable>
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
    marginBottom: spacing.md,
  },
  searchInput: {
    height: 44,
    backgroundColor: colors.surface,
    borderRadius: radius.control,
    paddingHorizontal: spacing.lg,
    color: colors.textPrimary,
    fontSize: typography.body.size,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  center: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },
  list: {
    paddingBottom: spacing.lg,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemPressed: {
    backgroundColor: colors.surfaceRaised,
  },
  itemDisabled: {
    opacity: 0.5,
  },
  itemName: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: typography.body.size,
    fontWeight: '500',
  },
  itemNameDisabled: {
    color: colors.textMuted,
  },
  itemMeta: {
    color: colors.textMuted,
    fontSize: typography.caption.size,
    textTransform: 'capitalize',
    marginLeft: spacing.sm,
  },
  addedLabel: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: typography.body.size,
  },
  closeBtn: {
    height: 48,
    borderRadius: radius.control,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  closeBtnPressed: {
    opacity: 0.8,
  },
  closeText: {
    color: colors.textMuted,
    fontSize: typography.body.size,
    fontWeight: '600',
  },
});
