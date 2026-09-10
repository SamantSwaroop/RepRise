import { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  LayoutChangeEvent,
  Pressable,
} from 'react-native';
import Svg, {
  Path,
  Defs,
  LinearGradient,
  Stop,
  Line,
  Circle,
} from 'react-native-svg';
import { colors, spacing, typography } from '../../theme/tokens';

export interface DataPoint {
  label: string;
  value: number;
  subLabel?: string;
  meta?: string;
}

interface LineChartProps {
  data: DataPoint[];
  unit?: string;
  height?: number;
  lineColor?: string;
  showGradient?: boolean;
  selectedIndex?: number | null;
  onSelectIndex?: (index: number) => void;
}

export function LineChart({
  data,
  unit = 'kg',
  height = 200,
  lineColor = colors.accent,
  showGradient = true,
  selectedIndex: propSelectedIndex,
  onSelectIndex,
}: LineChartProps) {
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

  const chartPaddingTop = 20;
  const chartPaddingBottom = 30;
  const chartPaddingLeft = 40;
  const chartPaddingRight = 20;

  const chartWidth = Math.max(0, containerWidth - chartPaddingLeft - chartPaddingRight);
  const chartHeight = height - chartPaddingTop - chartPaddingBottom;

  const { minVal, maxVal, points, pathD, areaD, yTicks } = useMemo(() => {
    if (!data || data.length === 0 || chartWidth <= 0) {
      return { minVal: 0, maxVal: 0, points: [], pathD: '', areaD: '', yTicks: [] };
    }

    const values = data.map((d) => d.value);
    const rawMin = Math.min(...values);
    const rawMax = Math.max(...values);

    // Provide 10% breathing room top and bottom
    const range = rawMax - rawMin;
    const padding = range === 0 ? Math.max(rawMax * 0.2, 5) : range * 0.15;
    const minVal = Math.max(0, Math.floor(rawMin - padding));
    const maxVal = Math.ceil(rawMax + padding);

    const valSpan = maxVal - minVal || 1;

    // Calculate (x, y) coordinates for each point
    const points = data.map((d, i) => {
      const x =
        chartPaddingLeft +
        (data.length === 1
          ? chartWidth / 2
          : (i / (data.length - 1)) * chartWidth);
      const y =
        chartPaddingTop + chartHeight - ((d.value - minVal) / valSpan) * chartHeight;
      return { x, y, data: d };
    });

    // Build smooth bezier SVG path
    let pathD = '';
    if (points.length === 1) {
      pathD = `M ${points[0].x - 10} ${points[0].y} L ${points[0].x + 10} ${points[0].y}`;
    } else {
      pathD = `M ${points[0].x} ${points[0].y}`;
      for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i];
        const p1 = points[i + 1];
        const cx = (p0.x + p1.x) / 2;
        pathD += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`;
      }
    }

    // Build closed area path for gradient
    const bottomY = chartPaddingTop + chartHeight;
    const areaD =
      points.length > 1
        ? `${pathD} L ${points[points.length - 1].x} ${bottomY} L ${points[0].x} ${bottomY} Z`
        : '';

    // Generate 3 horizontal Y ticks
    const yTicks = [
      { val: maxVal, y: chartPaddingTop },
      { val: Math.round((maxVal + minVal) / 2), y: chartPaddingTop + chartHeight / 2 },
      { val: minVal, y: bottomY },
    ];

    return { minVal, maxVal, points, pathD, areaD, yTicks };
  }, [data, chartWidth, chartHeight]);

  if (!data || data.length === 0) {
    return (
      <View style={[styles.emptyContainer, { height }]}>
        <Text style={styles.emptyText}>No workout history in this period</Text>
      </View>
    );
  }

  const activePoint = selectedIndex != null ? points[selectedIndex] : points[points.length - 1];

  return (
    <View style={styles.wrapper} onLayout={onLayout}>
      {/* Selected data point tooltip header */}
      {activePoint && (
        <View style={styles.tooltipHeader}>
          <View>
            <Text style={styles.tooltipValue}>
              {activePoint.data.value} <Text style={styles.tooltipUnit}>{unit}</Text>
            </Text>
            {activePoint.data.subLabel && (
              <Text style={styles.tooltipSub}>{activePoint.data.subLabel}</Text>
            )}
          </View>
          <View style={styles.tooltipMeta}>
            <Text style={styles.tooltipDate}>{activePoint.data.label}</Text>
            {activePoint.data.meta && (
              <Text style={styles.tooltipMetaText}>{activePoint.data.meta}</Text>
            )}
          </View>
        </View>
      )}

      {containerWidth > 0 && (
        <View style={{ height, width: containerWidth }}>
          <Svg width={containerWidth} height={height}>
            <Defs>
              <LinearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor={lineColor} stopOpacity="0.35" />
                <Stop offset="100%" stopColor={lineColor} stopOpacity="0.0" />
              </LinearGradient>
            </Defs>

            {/* Horizontal Grid lines */}
            {yTicks.map((tick, i) => (
              <Line
                key={i}
                x1={chartPaddingLeft}
                y1={tick.y}
                x2={containerWidth - chartPaddingRight}
                y2={tick.y}
                stroke={colors.border + '44'}
                strokeWidth={1}
                strokeDasharray="4, 4"
              />
            ))}

            {/* Area Fill */}
            {showGradient && areaD ? (
              <Path d={areaD} fill="url(#chartGradient)" />
            ) : null}

            {/* Line Path */}
            {pathD ? (
              <Path
                d={pathD}
                fill="none"
                stroke={lineColor}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : null}

            {/* Data Dots & Selected Highlight */}
            {points.map((p, idx) => {
              const isSelected =
                selectedIndex === idx || (selectedIndex === null && idx === points.length - 1);
              return (
                <Circle
                  key={idx}
                  cx={p.x}
                  cy={p.y}
                  r={isSelected ? 6 : 3.5}
                  fill={isSelected ? colors.textPrimary : lineColor}
                  stroke={colors.background}
                  strokeWidth={isSelected ? 2.5 : 1.5}
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
                { top: tick.y - 7, left: 0, width: chartPaddingLeft - 8 },
              ]}
              numberOfLines={1}
            >
              {tick.val}
            </Text>
          ))}

          {/* Touch scrubber zones */}
          <View style={[StyleSheet.absoluteFill, { left: chartPaddingLeft, right: chartPaddingRight }]}>
            <View style={styles.touchRow}>
              {points.map((_, idx) => (
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

      {/* X-Axis bottom date labels */}
      <View style={styles.xAxisRow}>
        <Text style={styles.xLabel}>{data[0]?.label}</Text>
        {data.length > 2 && (
          <Text style={styles.xLabel}>
            {data[Math.floor(data.length / 2)]?.label}
          </Text>
        )}
        {data.length > 1 && (
          <Text style={styles.xLabel}>{data[data.length - 1]?.label}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  tooltipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  tooltipValue: {
    color: colors.textPrimary,
    fontSize: typography.h2.size,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  tooltipUnit: {
    color: colors.accent,
    fontSize: typography.caption.size,
    fontWeight: '600',
  },
  tooltipSub: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  tooltipMeta: {
    alignItems: 'flex-end',
  },
  tooltipDate: {
    color: colors.textSecondary,
    fontSize: typography.caption.size,
    fontWeight: '600',
  },
  tooltipMetaText: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
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
    paddingRight: 20,
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
