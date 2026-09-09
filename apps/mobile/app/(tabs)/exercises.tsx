import { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  FlatList,
  Pressable,
  ActivityIndicator,
  SectionList,
  Alert,
} from 'react-native';
import type { Exercise, MuscleGroup } from '@reprise/shared';
import { MUSCLE_GROUPS } from '@reprise/shared';
import { colors, spacing, typography, radius } from '../../src/theme/tokens';
import { useExercises, useCreateExercise, useDeleteExercise } from '../../src/hooks/useExercises';
import { ExerciseCard } from '../../src/components/ExerciseCard';
import { ExerciseFormModal } from '../../src/components/ExerciseFormModal';

export default function ExercisesTab() {
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);

  const { data: exercises, isLoading, error } = useExercises(search || undefined);
  const createMutation = useCreateExercise();
  const deleteMutation = useDeleteExercise();

  // Group exercises by muscle group
  const sections = useMemo(() => {
    if (!exercises) return [];

    const grouped: Record<string, Exercise[]> = {};
    for (const ex of exercises) {
      const group = ex.muscleGroup;
      if (!grouped[group]) grouped[group] = [];
      grouped[group].push(ex);
    }

    return MUSCLE_GROUPS
      .filter((mg) => grouped[mg]?.length)
      .map((mg) => ({
        title: mg.charAt(0).toUpperCase() + mg.slice(1),
        data: grouped[mg].sort((a, b) => a.name.localeCompare(b.name)),
      }));
  }, [exercises]);

  const handleCreate = async (data: {
    name: string;
    muscleGroup: MuscleGroup;
    equipment: any;
    defaultSets?: number;
  }) => {
    await createMutation.mutateAsync(data);
    setShowModal(false);
  };

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search exercises…"
          placeholderTextColor={colors.border}
          autoCapitalize="none"
          clearButtonMode="while-editing"
        />
      </View>

      {/* Exercise List */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Failed to load exercises</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ExerciseCard
              exercise={item}
              onDelete={
                item.userId
                  ? () => {
                      Alert.alert(
                        'Delete Exercise',
                        `Are you sure you want to delete "${item.name}"?`,
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Delete',
                            style: 'destructive',
                            onPress: () => deleteMutation.mutate(item.id),
                          },
                        ],
                      );
                    }
                  : undefined
              }
            />
          )}
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionHeader}>{section.title}</Text>
          )}
          contentContainerStyle={styles.list}
          stickySectionHeadersEnabled={false}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>
                {search ? 'No exercises match your search' : 'No exercises yet'}
              </Text>
            </View>
          }
        />
      )}

      {/* FAB */}
      <Pressable
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        onPress={() => setShowModal(true)}
      >
        <Text style={styles.fabText}>+</Text>
      </Pressable>

      {/* Create Modal */}
      <ExerciseFormModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={handleCreate}
        loading={createMutation.isPending}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
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
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 100,
  },
  sectionHeader: {
    color: colors.accent,
    fontSize: typography.caption.size,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  errorText: {
    color: colors.danger,
    fontSize: typography.body.size,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: typography.body.size,
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  fabPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.95 }],
  },
  fabText: {
    color: colors.background,
    fontSize: 28,
    fontWeight: '600',
    lineHeight: 30,
  },
});
