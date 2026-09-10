import { useState, useMemo, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Modal,
  FlatList,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type {
  TimeRange,
  ProgressMetric,
  LoggedExerciseInfo,
  MuscleAnalyticsRange,
  MuscleGroup,
} from '@reprise/shared';
import { colors, spacing, typography, radius } from '../../src/theme/tokens';
import {
  useDashboardStats,
  useWeeklyVolumeTrends,
  useExerciseProgress,
  useLoggedExercises,
} from '../../src/hooks/useProgress';
import { useAllTimePersonalRecords } from '../../src/hooks/usePRs';
import { useStreakData, useMuscleDistribution } from '../../src/hooks/useAnalytics';
import { useExercises } from '../../src/hooks/useExercises';
import { StatGrid } from '../../src/components/StatGrid';
import { LineChart, DataPoint } from '../../src/components/charts/LineChart';
import { BarChart } from '../../src/components/charts/BarChart';
import { TimeRangeFilter } from '../../src/components/TimeRangeFilter';
import { MuscleVisualizer } from '../../src/components/MuscleVisualizer';
import { MuscleBreakdownList } from '../../src/components/MuscleBreakdownList';
import { ConsistencyHeatmap } from '../../src/components/ConsistencyHeatmap';

const METRIC_TABS: { key: ProgressMetric; label: string; unit: string }[] = [
  { key: '1rm', label: 'Est. 1RM', unit: 'kg' },
  { key: 'max_weight', label: 'Max Weight', unit: 'kg' },
  { key: 'volume', label: 'Total Vol', unit: 'kg' },
];

export default function ProgressTab() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: weeklyTrends, isLoading: weeklyLoading } = useWeeklyVolumeTrends(8);
  const { data: loggedExercises, isLoading: exercisesLoading } = useLoggedExercises();
  const { data: allExercises } = useExercises();
  const { data: allTimePRs, isLoading: prsLoading } = useAllTimePersonalRecords();
  const { data: streak } = useStreakData();

  // Muscle visualizer state
  const [muscleRange, setMuscleRange] = useState<MuscleAnalyticsRange>('30D');
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | null>(null);
  const { data: muscleDistribution, isLoading: muscleLoading } = useMuscleDistribution(muscleRange);

  // Selected exercise state
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<ProgressMetric>('1rm');
  const [timeRange, setTimeRange] = useState<TimeRange>('3M');
  const [showPicker, setShowPicker] = useState(false);
  const [search, setSearch] = useState('');

  // Weekly volume date dropdown state
  const [selectedWeekIndex, setSelectedWeekIndex] = useState<number | null>(null);
  const [showWeekModal, setShowWeekModal] = useState(false);

  // Exercise date dropdown state
  const [selectedExerciseDateIndex, setSelectedExerciseDateIndex] = useState<number | null>(null);
  const [showDateModal, setShowDateModal] = useState(false);

  // Auto-select exercise with most logged sets on initial load
  useEffect(() => {
    if (!selectedExerciseId && loggedExercises && loggedExercises.length > 0) {
      setSelectedExerciseId(loggedExercises[0].id);
    } else if (!selectedExerciseId && allExercises && allExercises.length > 0) {
      setSelectedExerciseId(allExercises[0].id);
    }
  }, [loggedExercises, allExercises, selectedExerciseId]);

  // Fetch progress points for selected exercise
  const { data: exerciseHistory, isLoading: historyLoading } = useExerciseProgress(
    selectedExerciseId,
    timeRange,
  );

  // Current selected exercise details
  const currentExercise = useMemo(() => {
    const fromLogged = loggedExercises?.find((e) => e.id === selectedExerciseId);
    if (fromLogged) return fromLogged;
    const fromAll = allExercises?.find((e) => e.id === selectedExerciseId);
    if (fromAll) {
      return {
        id: fromAll.id,
        name: fromAll.name,
        muscleGroup: fromAll.muscleGroup,
        loggedSetCount: 0,
        best1RM: 0,
      };
    }
    return null;
  }, [loggedExercises, allExercises, selectedExerciseId]);

  // PR record for currently focused exercise
  const activeExercisePR = useMemo(() => {
    if (!selectedExerciseId || !allTimePRs) return null;
    return allTimePRs.find((r) => r.exerciseId === selectedExerciseId) ?? null;
  }, [allTimePRs, selectedExerciseId]);

  // Transform exercise progress data into chart points
  const chartData: DataPoint[] = useMemo(() => {
    if (!exerciseHistory || exerciseHistory.length === 0) return [];

    return exerciseHistory.map((p) => {
      const dateObj = new Date(p.date);
      const dateLabel = dateObj.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

      let val = p.estimated1RM;
      let subLabel: string | undefined;

      if (selectedMetric === 'max_weight') {
        val = p.maxWeightKg;
        subLabel = `Best weight in session`;
      } else if (selectedMetric === 'volume') {
        val = p.totalVolumeKg;
        subLabel = `${p.totalVolumeKg.toLocaleString()} kg total`;
      } else {
        // Est. 1RM
        val = p.estimated1RM;
        subLabel = `From ${p.bestWeight}kg × ${p.bestReps}`;
      }

      return {
        label: dateLabel,
        value: val,
        subLabel,
        meta: p.workoutName,
      };
    });
  }, [exerciseHistory, selectedMetric]);

  // Sync selectedWeekIndex when weekly trends change
  useEffect(() => {
    if (weeklyTrends && weeklyTrends.length > 0) {
      if (selectedWeekIndex == null || selectedWeekIndex >= weeklyTrends.length) {
        setSelectedWeekIndex(weeklyTrends.length - 1);
      }
    } else {
      setSelectedWeekIndex(null);
    }
  }, [weeklyTrends]);

  // Sync selectedExerciseDateIndex when chartData changes
  useEffect(() => {
    if (chartData && chartData.length > 0) {
      if (selectedExerciseDateIndex == null || selectedExerciseDateIndex >= chartData.length) {
        setSelectedExerciseDateIndex(chartData.length - 1);
      }
    } else {
      setSelectedExerciseDateIndex(null);
    }
  }, [chartData]);

  const selectedWeekPoint =
    selectedWeekIndex != null && weeklyTrends && weeklyTrends[selectedWeekIndex]
      ? weeklyTrends[selectedWeekIndex]
      : weeklyTrends && weeklyTrends.length > 0
      ? weeklyTrends[weeklyTrends.length - 1]
      : null;

  const selectedDatePoint =
    selectedExerciseDateIndex != null && chartData && chartData[selectedExerciseDateIndex]
      ? chartData[selectedExerciseDateIndex]
      : chartData && chartData.length > 0
      ? chartData[chartData.length - 1]
      : null;

  // Reverse lists for date dropdowns (newest date on top)
  const weeklyTrendsReversed = useMemo(() => {
    if (!weeklyTrends) return [];
    return weeklyTrends
      .map((w, idx) => ({ ...w, origIndex: idx }))
      .reverse();
  }, [weeklyTrends]);

  const chartDataReversed = useMemo(() => {
    return chartData
      .map((d, idx) => ({ ...d, origIndex: idx }))
      .reverse();
  }, [chartData]);

  // Overall gain calculation
  const progressStats = useMemo(() => {
    if (!chartData || chartData.length < 2) return null;
    const first = chartData[0].value;
    const latest = chartData[chartData.length - 1].value;
    const diff = Math.round((latest - first) * 10) / 10;
    const pct = first > 0 ? Math.round((diff / first) * 100) : 0;
    return { first, latest, diff, pct };
  }, [chartData]);

  // Filtered exercises for modal
  const filteredList = useMemo(() => {
    const list = loggedExercises && loggedExercises.length > 0 ? loggedExercises : (allExercises ?? []);
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter((e) => e.name.toLowerCase().includes(q));
  }, [loggedExercises, allExercises, search]);

  const activeMetricCfg = METRIC_TABS.find((m) => m.key === selectedMetric)!;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Progress</Text>
        <Text style={styles.subtitle}>Analytics & progressive overload</Text>
      </View>

      {/* Summary Stat Cards */}
      {statsLoading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : stats ? (
        <StatGrid stats={stats} />
      ) : null}

      {/* Weekly Volume Bar Chart Section */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Weekly Training Volume</Text>
            <Text style={styles.sectionSub}>Total kg moved per week</Text>
          </View>
        </View>

        {/* Week / Date Dropdown Selector */}
        {weeklyTrends && weeklyTrends.length > 0 && (
          <Pressable
            style={styles.dropdownBtn}
            onPress={() => setShowWeekModal(true)}
          >
            <View style={styles.dropdownLeft}>
              <Ionicons
                name="calendar-outline"
                size={14}
                color={colors.accent}
                style={{ marginRight: 6 }}
              />
              <Text style={styles.dropdownBtnText} numberOfLines={1}>
                {selectedWeekPoint
                  ? `Week of ${selectedWeekPoint.weekLabel} • ${selectedWeekPoint.volumeKg.toLocaleString()} kg (${selectedWeekPoint.workoutCount} ${selectedWeekPoint.workoutCount === 1 ? 'workout' : 'workouts'})`
                  : 'Select Week Date'}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
          </Pressable>
        )}

        {weeklyLoading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : (
          <BarChart
            data={weeklyTrends ?? []}
            height={170}
            selectedIndex={selectedWeekIndex}
            onSelectIndex={setSelectedWeekIndex}
          />
        )}
      </View>

      {/* Exercise Progression Section */}
      <View style={styles.sectionCard}>
        <View style={styles.exerciseSelectRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionLabel}>Exercise Progression</Text>
            <Pressable
              style={styles.exercisePickerTrigger}
              onPress={() => setShowPicker(true)}
            >
              <Text style={styles.exerciseName} numberOfLines={1}>
                {currentExercise?.name ?? 'Select Exercise'}
              </Text>
              <Ionicons
                name="chevron-down"
                size={16}
                color={colors.accent}
                style={{ marginLeft: 4 }}
              />
            </Pressable>
          </View>

          {currentExercise?.best1RM ? (
            <View style={styles.best1rmPill}>
              <Text style={styles.best1rmLabel}>Best 1RM</Text>
              <Text style={styles.best1rmVal}>{currentExercise.best1RM} kg</Text>
            </View>
          ) : null}
        </View>

        {/* Progress Improvement Pill */}
        {progressStats && (
          <View style={styles.growthBanner}>
            <Ionicons
              name={progressStats.diff >= 0 ? 'trending-up' : 'trending-down'}
              size={16}
              color={progressStats.diff >= 0 ? colors.success : colors.danger}
              style={{ marginRight: 6 }}
            />
            <Text style={styles.growthText}>
              {progressStats.diff >= 0 ? '+' : ''}
              {progressStats.diff} {activeMetricCfg.unit} ({progressStats.pct >= 0 ? '+' : ''}
              {progressStats.pct}%) over selected period
            </Text>
          </View>
        )}

        {/* Metric Tabs */}
        <View style={styles.metricTabs}>
          {METRIC_TABS.map((m) => {
            const isActive = m.key === selectedMetric;
            return (
              <Pressable
                key={m.key}
                style={[styles.metricTab, isActive && styles.metricTabActive]}
                onPress={() => setSelectedMetric(m.key)}
              >
                <Text
                  style={[
                    styles.metricTabText,
                    isActive && styles.metricTabTextActive,
                  ]}
                >
                  {m.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Time Range Filter */}
        <View style={styles.filterRow}>
          <TimeRangeFilter selected={timeRange} onSelect={setTimeRange} />
        </View>

        {/* Exercise Session Date Dropdown Selector */}
        {chartData && chartData.length > 0 && (
          <Pressable
            style={styles.dropdownBtn}
            onPress={() => setShowDateModal(true)}
          >
            <View style={styles.dropdownLeft}>
              <Ionicons
                name="calendar-outline"
                size={14}
                color={colors.accent}
                style={{ marginRight: 6 }}
              />
              <Text style={styles.dropdownBtnText} numberOfLines={1}>
                {selectedDatePoint
                  ? `${selectedDatePoint.label} • ${selectedDatePoint.value} ${activeMetricCfg.unit} (${selectedDatePoint.meta ?? 'Workout'})`
                  : 'Select Session Date'}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
          </Pressable>
        )}

        {/* Line Chart */}
        {historyLoading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : (
          <LineChart
            data={chartData}
            unit={activeMetricCfg.unit}
            height={210}
            lineColor={colors.accent}
            selectedIndex={selectedExerciseDateIndex}
            onSelectIndex={setSelectedExerciseDateIndex}
          />
        )}
      </View>

      {/* Active Exercise Personal Records Showcase */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View style={styles.prHeaderRow}>
            <Ionicons name="trophy" size={18} color="#EBCB8B" />
            <Text style={styles.sectionTitle}>Personal Records (PRs)</Text>
          </View>
          {currentExercise && (
            <View style={styles.prCountBadge}>
              <Text style={styles.prCountBadgeText} numberOfLines={1}>
                {currentExercise.name}
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.prSectionDesc}>
          All-time personal bests for {currentExercise?.name ?? 'the selected exercise'}.
        </Text>

        {prsLoading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : !activeExercisePR ? (
          <View style={styles.prEmptyBox}>
            <Ionicons name="trophy-outline" size={28} color={colors.textMuted} />
            <Text style={styles.prEmptyText}>
              No PRs yet for {currentExercise?.name ?? 'this exercise'}
            </Text>
            <Text style={styles.prEmptySub}>
              Log a set in a workout to establish your personal records!
            </Text>
          </View>
        ) : (
          <View style={styles.prRecordCard}>
            <View style={styles.prRecordHeader}>
              <Text
                style={[styles.prRecordName, styles.prRecordNameActive]}
                numberOfLines={2}
              >
                {activeExercisePR.exerciseName}
              </Text>
              <View style={styles.prMuscleBadge}>
                <Text style={styles.prMuscleBadgeText}>{activeExercisePR.muscleGroup}</Text>
              </View>
            </View>

            <View style={styles.prColumnsRow}>
              {/* Est 1RM Column */}
              <View style={styles.prColumn}>
                <Text style={styles.prColumnLabel}>EST. 1RM</Text>
                <Text style={styles.prColumnValue}>{activeExercisePR.best1RM} kg</Text>
                <Text style={styles.prColumnSub}>
                  {activeExercisePR.best1RMWeight}kg × {activeExercisePR.best1RMReps} reps
                </Text>
                <Text style={styles.prColumnDate}>
                  {new Date(activeExercisePR.best1RMDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </Text>
              </View>

              <View style={styles.prColumnDivider} />

              {/* Heaviest Weight Column */}
              <View style={styles.prColumn}>
                <Text style={styles.prColumnLabel}>HEAVIEST WEIGHT</Text>
                <Text style={styles.prColumnValue}>{activeExercisePR.bestWeightKg} kg</Text>
                <Text style={styles.prColumnSub}>
                  for {activeExercisePR.bestWeightReps} reps
                </Text>
                <Text style={styles.prColumnDate}>
                  {new Date(activeExercisePR.bestWeightDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </Text>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* Muscle Visualizer Card */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View style={styles.prHeaderRow}>
            <Ionicons name="body-outline" size={18} color={colors.accent} />
            <Text style={styles.sectionTitle}>Muscle Visualizer</Text>
          </View>

          {/* Time range pills: 7D / 30D / ALL */}
          <View style={styles.rangePills}>
            {(['7D', '30D', 'ALL'] as MuscleAnalyticsRange[]).map((r) => (
              <Pressable
                key={r}
                style={[styles.rangePill, muscleRange === r && styles.rangePillActive]}
                onPress={() => setMuscleRange(r)}
              >
                <Text
                  style={[
                    styles.rangePillText,
                    muscleRange === r && styles.rangePillTextActive,
                  ]}
                >
                  {r}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Text style={styles.prSectionDesc}>
          Anatomical training heat map. Tap any muscle region to focus its volume breakdown.
        </Text>

        {muscleLoading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : (
          <>
            <MuscleVisualizer
              breakdown={muscleDistribution ?? []}
              selectedMuscle={selectedMuscle}
              onSelectMuscle={setSelectedMuscle}
            />

            <MuscleBreakdownList
              breakdown={muscleDistribution ?? []}
              selectedMuscle={selectedMuscle}
              onSelectMuscle={setSelectedMuscle}
            />
          </>
        )}
      </View>

      {/* Consistency & Streaks Heatmap */}
      <ConsistencyHeatmap streak={streak} />

      {/* Week Date Selector Dropdown Modal */}
      <Modal visible={showWeekModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.sheetHandle} />

            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Select Week Date</Text>
                <Text style={styles.modalSub}>
                  Inspect training volume and workouts for a specific week
                </Text>
              </View>
              <Pressable
                style={styles.closeBtn}
                onPress={() => setShowWeekModal(false)}
              >
                <Ionicons name="close" size={20} color={colors.textMuted} />
              </Pressable>
            </View>

            <FlatList
              data={weeklyTrendsReversed}
              keyExtractor={(item) => item.weekStart}
              renderItem={({ item }) => {
                const isSelected = selectedWeekIndex === item.origIndex;
                const isCurrentWeek =
                  weeklyTrends &&
                  item.origIndex === weeklyTrends.length - 1;

                return (
                  <Pressable
                    style={[
                      styles.dropdownItem,
                      isSelected && styles.dropdownItemActive,
                    ]}
                    onPress={() => {
                      setSelectedWeekIndex(item.origIndex);
                      setShowWeekModal(false);
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text
                          style={[
                            styles.dropdownItemTitle,
                            isSelected && styles.dropdownItemTitleActive,
                          ]}
                        >
                          Week of {item.weekLabel}
                        </Text>
                        {isCurrentWeek && (
                          <View style={styles.currentBadge}>
                            <Text style={styles.currentBadgeText}>Current</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.dropdownItemSub}>
                        {item.volumeKg.toLocaleString()} kg lifted •{' '}
                        {item.workoutCount}{' '}
                        {item.workoutCount === 1 ? 'workout' : 'workouts'}
                      </Text>
                    </View>
                    {isSelected && (
                      <Ionicons
                        name="checkmark"
                        size={18}
                        color={colors.accent}
                        style={{ marginLeft: spacing.sm }}
                      />
                    )}
                  </Pressable>
                );
              }}
              contentContainerStyle={styles.listContent}
            />
          </View>
        </View>
      </Modal>

      {/* Exercise Session Date Selector Dropdown Modal */}
      <Modal visible={showDateModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.sheetHandle} />

            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Select Workout Date</Text>
                <Text style={styles.modalSub}>
                  Recorded sessions for {currentExercise?.name}
                </Text>
              </View>
              <Pressable
                style={styles.closeBtn}
                onPress={() => setShowDateModal(false)}
              >
                <Ionicons name="close" size={20} color={colors.textMuted} />
              </Pressable>
            </View>

            <FlatList
              data={chartDataReversed}
              keyExtractor={(item) => item.origIndex.toString()}
              renderItem={({ item }) => {
                const isSelected = selectedExerciseDateIndex === item.origIndex;

                return (
                  <Pressable
                    style={[
                      styles.dropdownItem,
                      isSelected && styles.dropdownItemActive,
                    ]}
                    onPress={() => {
                      setSelectedExerciseDateIndex(item.origIndex);
                      setShowDateModal(false);
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.dropdownItemTitle,
                          isSelected && styles.dropdownItemTitleActive,
                        ]}
                      >
                        {item.label}
                        {item.meta ? ` • ${item.meta}` : ''}
                      </Text>
                      <Text style={styles.dropdownItemSub}>
                        {item.value} {activeMetricCfg.unit}
                        {item.subLabel ? ` (${item.subLabel})` : ''}
                      </Text>
                    </View>
                    {isSelected && (
                      <Ionicons
                        name="checkmark"
                        size={18}
                        color={colors.accent}
                        style={{ marginLeft: spacing.sm }}
                      />
                    )}
                  </Pressable>
                );
              }}
              contentContainerStyle={styles.listContent}
            />
          </View>
        </View>
      </Modal>

      {/* Exercise Picker Modal */}
      <Modal visible={showPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.sheetHandle} />

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose Exercise</Text>
              <Pressable
                style={styles.closeBtn}
                onPress={() => setShowPicker(false)}
              >
                <Ionicons name="close" size={20} color={colors.textMuted} />
              </Pressable>
            </View>

            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search exercises…"
              placeholderTextColor={colors.border}
              autoCapitalize="none"
              clearButtonMode="while-editing"
            />

            {exercisesLoading ? (
              <View style={styles.centerBox}>
                <ActivityIndicator color={colors.accent} />
              </View>
            ) : (
              <FlatList
                data={filteredList as any[]}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => {
                  const isSelected = item.id === selectedExerciseId;
                  return (
                    <Pressable
                      style={[
                        styles.exerciseItem,
                        isSelected && styles.exerciseItemActive,
                      ]}
                      onPress={() => {
                        setSelectedExerciseId(item.id);
                        setShowPicker(false);
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.exerciseItemName,
                            isSelected && styles.exerciseItemNameActive,
                          ]}
                          numberOfLines={1}
                        >
                          {item.name}
                        </Text>
                        <Text style={styles.exerciseItemMeta}>
                          {item.muscleGroup}
                          {item.loggedSetCount > 0
                            ? ` • ${item.loggedSetCount} sets logged`
                            : ''}
                        </Text>
                      </View>
                      {item.best1RM > 0 && (
                        <View style={styles.item1rmBadge}>
                          <Text style={styles.item1rmText}>
                            1RM: {item.best1RM} kg
                          </Text>
                        </View>
                      )}
                      {isSelected && (
                        <Ionicons
                          name="checkmark"
                          size={18}
                          color={colors.accent}
                          style={{ marginLeft: spacing.sm }}
                        />
                      )}
                    </Pressable>
                  );
                }}
                contentContainerStyle={styles.listContent}
              />
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  header: {
    marginBottom: spacing.lg,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.display.size,
    fontWeight: typography.display.weight,
    letterSpacing: -0.5,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: typography.caption.size,
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border + '44',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: typography.body.size,
    fontWeight: '700',
  },
  sectionSub: {
    color: colors.textMuted,
    fontSize: typography.caption.size,
  },
  dropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.control,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border + '66',
    marginBottom: spacing.sm,
  },
  dropdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.xs,
  },
  dropdownBtnText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  exerciseSelectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  exercisePickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  exerciseName: {
    color: colors.textPrimary,
    fontSize: typography.h2.size,
    fontWeight: '700',
    marginRight: 2,
  },
  best1rmPill: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.control,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    alignItems: 'flex-end',
    borderWidth: 1,
    borderColor: colors.border + '66',
  },
  best1rmLabel: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  best1rmVal: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  growthBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radius.control,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    marginBottom: spacing.md,
  },
  growthText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  metricTabs: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.control,
    padding: 3,
    gap: 2,
    marginBottom: spacing.sm,
  },
  metricTab: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: radius.control - 2,
  },
  metricTabActive: {
    backgroundColor: colors.accent,
  },
  metricTabText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  metricTabTextActive: {
    color: colors.background,
    fontWeight: '700',
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: spacing.sm,
  },
  centerBox: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingTop: spacing.sm,
    maxHeight: '80%',
  },
  sheetHandle: {
    width: 36,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  modalTitle: {
    color: colors.textPrimary,
    fontSize: typography.h2.size,
    fontWeight: '700',
  },
  modalSub: {
    color: colors.textMuted,
    fontSize: typography.caption.size,
    marginTop: 2,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '33',
  },
  dropdownItemActive: {
    backgroundColor: colors.accent + '11',
    borderRadius: radius.control,
    paddingHorizontal: spacing.sm,
  },
  dropdownItemTitle: {
    color: colors.textPrimary,
    fontSize: typography.body.size,
    fontWeight: '600',
    marginBottom: 2,
  },
  dropdownItemTitleActive: {
    color: colors.accent,
  },
  dropdownItemSub: {
    color: colors.textMuted,
    fontSize: 11,
    fontVariant: ['tabular-nums'],
  },
  currentBadge: {
    backgroundColor: colors.accent + '22',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginLeft: 6,
  },
  currentBadgeText: {
    color: colors.accent,
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  searchInput: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.control,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.textPrimary,
    fontSize: typography.body.size,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '33',
  },
  exerciseItemActive: {
    backgroundColor: colors.accent + '11',
    borderRadius: radius.control,
    paddingHorizontal: spacing.sm,
  },
  exerciseItemName: {
    color: colors.textPrimary,
    fontSize: typography.body.size,
    fontWeight: '600',
    marginBottom: 2,
  },
  exerciseItemNameActive: {
    color: colors.accent,
  },
  exerciseItemMeta: {
    color: colors.textMuted,
    fontSize: 11,
    textTransform: 'capitalize',
  },
  item1rmBadge: {
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 6,
  },
  item1rmText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  prCountBadge: {
    flexShrink: 1,
    maxWidth: '45%',
    backgroundColor: '#EBCB8B22',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 6,
  },
  prCountBadgeText: {
    color: '#EBCB8B',
    fontSize: 11,
    fontWeight: '600',
  },
  prSectionDesc: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: spacing.md,
  },
  prCardList: {
    gap: spacing.sm,
  },
  prRecordCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border + '66',
  },
  prRecordCardActive: {
    borderColor: '#EBCB8B88',
    backgroundColor: '#EBCB8B0A',
  },
  prRecordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  prRecordName: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: typography.body.size,
    fontWeight: '600',
  },
  prRecordNameActive: {
    color: '#EBCB8B',
  },
  prMuscleBadge: {
    flexShrink: 0,
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  prMuscleBadgeText: {
    color: colors.textMuted,
    fontSize: 10,
    textTransform: 'capitalize',
    fontWeight: '500',
  },
  prColumnsRow: {
    flexDirection: 'row',
    backgroundColor: colors.background + '88',
    borderRadius: 8,
    padding: spacing.sm,
  },
  prColumn: {
    flex: 1,
  },
  prColumnDivider: {
    width: 1,
    backgroundColor: colors.border + '44',
    marginHorizontal: spacing.sm,
  },
  prColumnLabel: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  prColumnValue: {
    color: colors.textPrimary,
    fontSize: typography.body.size,
    fontWeight: '700',
    marginBottom: 2,
  },
  prColumnSub: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  prColumnDate: {
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 2,
  },
  prHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    gap: spacing.xs,
  },
  prEmptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.xs,
  },
  prEmptyText: {
    color: colors.textSecondary,
    fontSize: typography.body.size,
    fontWeight: '600',
  },
  prEmptySub: {
    color: colors.textMuted,
    fontSize: typography.caption.size,
  },
  rangePills: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.control,
    padding: 2,
    gap: 2,
  },
  rangePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.control - 2,
  },
  rangePillActive: {
    backgroundColor: colors.accent,
  },
  rangePillText: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '600',
  },
  rangePillTextActive: {
    color: colors.background,
    fontWeight: '700',
  },
});
