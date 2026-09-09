import { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Pressable,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing, typography, radius } from '../../src/theme/tokens';
import { useTemplates, useStartWorkoutFromTemplate } from '../../src/hooks/useTemplates';
import { TemplateCard } from '../../src/components/TemplateCard';

export default function TemplatesTab() {
  const router = useRouter();
  const { data: templates, isLoading } = useTemplates();
  const startFromTemplate = useStartWorkoutFromTemplate();
  const [search, setSearch] = useState('');

  const filteredTemplates = (templates ?? []).filter((t) =>
    search.trim() === '' || t.name.toLowerCase().includes(search.toLowerCase()),
  );

  const handleStart = async (templateId: string, templateName: string) => {
    Alert.alert(
      'Start Workout',
      `Start a new workout from "${templateName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start',
          onPress: async () => {
            try {
              const workoutId = await startFromTemplate.mutateAsync(templateId);
              (router as any).push({ pathname: '/workout/[id]', params: { id: workoutId } });
            } catch (err) {
              Alert.alert('Error', 'Failed to start workout from template.');
            }
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search templates…"
          placeholderTextColor={colors.border}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : filteredTemplates.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>
            {search ? 'No matching templates' : 'No templates yet'}
          </Text>
          {!search && (
            <Text style={styles.emptyBody}>
              Templates let you save a workout structure and start with one tap.
              Create your first template below!
            </Text>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredTemplates}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TemplateCard
              template={item}
              onPress={() =>
                (router as any).push({
                  pathname: '/template/[id]',
                  params: { id: item.id },
                })
              }
              onStart={() => handleStart(item.id, item.name)}
            />
          )}
          contentContainerStyle={styles.list}
        />
      )}

      {/* Create template button */}
      <Pressable
        style={({ pressed }) => [styles.createBtn, pressed && styles.createBtnPressed]}
        onPress={() => (router as any).push('/template/create')}
      >
        <Text style={styles.createBtnText}>+ Create Template</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchBar: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  searchInput: {
    backgroundColor: colors.surface,
    borderRadius: radius.control,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.textPrimary,
    fontSize: typography.body.size,
    borderWidth: 1,
    borderColor: colors.border,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: typography.h2.size,
    fontWeight: typography.h2.weight,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptyBody: {
    color: colors.textMuted,
    fontSize: typography.body.size,
    textAlign: 'center',
    lineHeight: 22,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 100,
  },
  createBtn: {
    position: 'absolute',
    bottom: 30,
    left: spacing.xl,
    right: spacing.xl,
    backgroundColor: colors.accent,
    borderRadius: radius.card,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  createBtnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  createBtnText: {
    color: colors.background,
    fontSize: typography.body.size,
    fontWeight: '700',
  },
});
