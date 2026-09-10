import { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  LayoutChangeEvent,
  Pressable,
} from 'react-native';
import Svg, { Rect, Line } from 'react-native-svg';
import type { WeeklyVolumePoint } from '@reprise/shared';
import { colors, spacing, typography } from '../../theme/tokens';

interface BarChartProps {
  data: WeeklyVolumePoint[];
  height?: number;
  selectedIndex?: number | null;
  onSelectIndex?: (index: number) => void;
}

export function BarChart({
  data,
  height = 180,
  selectedIndex: propSelectedIndex,
  onSelectIndex,
}: BarChartProps) {
  const [containerWidth, setContainerWidth] = useState(0);
  const [internalSelectedIndex, setInternalSelectedIndex] = useState<number | null>(null);

  const selectedIndex =
    propSelectedIndex !== undefined ? propSelectedIndex : internalSelectedIndex;

  const handleSelect = (idx: number) => {
    setInternalSelectedIndex(idx);
    onSelectIndex?.(idx);
  };

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) setContainerWidth(w);
  };

  const chartPaddingTop = 15;
  const chartPaddingBottom = 30;
  const chartPaddingLeft = 40;
  const chartPaddingRight = 10;

  const chartWidth = Math.max(0, containerWidth - chartPaddingLeft - chartPaddingRight);
  const chartHeight = height - chartPaddingTop - chartPaddingBottom;

  const { maxVolume, bars, yTicks } = useMemo(() => {
    if (!data || data.length === 0 || chartWidth <= 0) {
      return { maxVolume: 0, bars: [], yTicks: [] };
    }

    const volumes = data.map((d) => d.volumeKg);
    const rawMax = Math.max(...volumes, 100);
    // Round max to nice upper number
    const maxVolume = Math.ceil(rawMax / 500) * 500 || 1000;

    const barCount = data.length;
    const barWidth = Math.min(28, (chartWidth / barCount) * 0.65);
    const step = chartWidth / barCount;

    const bars = data.map((d, i) => {
      const barH = (d.volumeKg / maxVolume) * chartHeight;
      const x = chartPaddingLeft + i * step + (step - barWidth) / 2;
      const y = chartPaddingTop + chartHeight - barH;
      const isCurrentWeek = i === barCount - 1;

      return {
        x,
        y,
        width: barWidth,
        height: Math.max(d.volumeKg > 0 ? 3 : 0, barH),
        data: d,
        isCurrentWeek,
      };
    });

    const yTicks = [
      { val: maxVolume, y: chartPaddingTop },
      { val: Math.round(maxVolume / 2), y: chartPaddingTop + chartHeight / 2 },
      { val: 0, y: chartPaddingTop + chartHeight },
    ];

    return { maxVolume, bars, yTicks };
  }, [data, chartWidth, chartHeight]);

  if (!data || data.length === 0) {
    return (
      <View style={[styles.emptyContainer, { height }]}>
        <Text style={styles.emptyText}>No volume data recorded</Text>
      </View>
    );
  }

  const activeBar =
    selectedIndex != null ? bars[selectedIndex] : bars[bars.length - 1];

  const formatVolume = (val: number) => {
    if (val >= 1000) {
      return `${(val / 1000).toFixed(1)}k`;
    }
    return String(Math.round(val));
  };

  return (
    <View style={styles.wrapper} onLayout={onLayout}>
      {/* Selected bar detail header */}
      {activeBar && (
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerVal}>
              {activeBar.data.volumeKg.toLocaleString()}{' '}
              <Text style={styles.headerUnit}>kg</Text>
            </Text>
            <Text style={styles.headerSub}>
              {activeBar.data.workoutCount}{' '}
              {activeBar.data.workoutCount === 1 ? 'workout' : 'workouts'}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.headerDate}>Week of {activeBar.data.weekLabel}</Text>
            {activeBar.isCurrentWeek && (
              <Text style={styles.currentBadge}>Current Week</Text>
            )}
          </View>
        </View>
      )}

      {containerWidth > 0 && (
        <View style={{ height, width: containerWidth }}>
          <Svg width={containerWidth} height={height}>
            {/* Horizontal Grid lines */}
            {yTicks.map((tick, i) => (
              <Line
                key={i}
                x1={chartPaddingLeft}
                y1={tick.y}
                x2={containerWidth - chartPaddingRight}
                y2={tick.y}
                stroke={colors.border + '33'}
                strokeWidth={1}
                strokeDasharray="4, 4"
              />
            ))}

            {/* Bars */}
            {bars.map((b, idx) => {
              const isSelected =
                selectedIndex === idx || (selectedIndex === null && idx === bars.length - 1);

              let fillColor: string = colors.surfaceRaised;
              if (isSelected) {
                fillColor = colors.accent;
              } else if (b.data.volumeKg > 0) {
                fillColor = colors.accentStrong + '66';
              }

              return (
                <Rect
                  key={idx}
                  x={b.x}
                  y={b.y}
                  width={b.width}
                  height={b.height}
                  rx={3}
                  ry={3}
                  fill={fillColor}
                />
              );
            })}
          </Svg>

          {/* Y-Axis tick labels */}
          {yTicks.map((tick, i) => (
            <Text
              key={i}
              style={[
                styles.yLabel,
                { top: tick.y - 7, left: 0, width: chartPaddingLeft - 6 },
              ]}
              numberOfLines={1}
            >
              {formatVolume(tick.val)}
            </Text>
          ))}

          {/* Touch overlay */}
          <View style={[StyleSheet.absoluteFill, { left: chartPaddingLeft, right: chartPaddingRight }]}>
            <View style={styles.touchRow}>
              {bars.map((_, idx) => (
                <Pressable
                  key={idx}
                  style={styles.touchSlot}
                  onPress={() => handleSelect(idx)}
                />
              ))}
            </View>
          </View>
        </View>
      )}

      {/* X-Axis labels for first, middle, last weeks */}
      <View style={styles.xAxisRow}>
        <Text style={styles.xLabel}>{data[0]?.weekLabel}</Text>
        {data.length > 2 && (
          <Text style={styles.xLabel}>
            {data[Math.floor(data.length / 2)]?.weekLabel}
          </Text>
        )}
        <Text style={styles.xLabel}>{data[data.length - 1]?.weekLabel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  headerVal: {
    color: colors.textPrimary,
    fontSize: typography.h2.size,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  headerUnit: {
    color: colors.accent,
    fontSize: typography.caption.size,
    fontWeight: '600',
  },
  headerSub: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  headerDate: {
    color: colors.textSecondary,
    fontSize: typography.caption.size,
    fontWeight: '600',
  },
  currentBadge: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  yLabel: {
    position: 'absolute',
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  touchRow: {
    flex: 1,
    flexDirection: 'row',
  },
  touchSlot: {
    flex: 1,
    height: '100%',
  },
  xAxisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingLeft: 40,
    paddingRight: 10,
    marginTop: -8,
  },
  xLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface + '44',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border + '33',
    borderStyle: 'dashed',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: typography.caption.size,
  },
});
