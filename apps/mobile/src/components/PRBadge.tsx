import { useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Pressable, Alert, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { PRType } from '@reprise/shared';
import { colors, radius } from '../theme/tokens';

const PR_GOLD = '#EBCB8B';

interface PRBadgeProps {
  prTypes: PRType[];
  size?: 'sm' | 'md';
  onPress?: () => void;
  showDetailsOnPress?: boolean;
}

export function PRBadge({
  prTypes,
  size = 'sm',
  onPress,
  showDetailsOnPress = true,
}: PRBadgeProps) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.06,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1.0,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [scale]);

  if (prTypes.length === 0) return null;

  const is1RM = prTypes.includes('1rm');
  const isWeight = prTypes.includes('weight');

  let label = 'PR';
  let detailMessage = 'You set a new Personal Record on this set!';
  if (is1RM && isWeight) {
    label = '1RM & WT PR';
    detailMessage = 'All-time Heaviest Weight & Estimated 1RM broken!';
  } else if (is1RM) {
    label = '1RM PR';
    detailMessage = 'New all-time Estimated 1-Rep Max record!';
  } else if (isWeight) {
    label = 'WT PR';
    detailMessage = 'New all-time Heaviest Weight lifted for this exercise!';
  }

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else if (showDetailsOnPress) {
      Alert.alert('Personal Record! 🏆', detailMessage);
    }
  };

  const isSmall = size === 'sm';

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        style={({ pressed }) => [
          styles.badge,
          isSmall ? styles.badgeSm : styles.badgeMd,
          pressed && styles.pressed,
        ]}
        onPress={handlePress}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      >
        <Ionicons
          name="trophy"
          size={isSmall ? 10 : 13}
          color={PR_GOLD}
          style={{ marginRight: 2 }}
        />
        <Text style={[styles.text, isSmall ? styles.textSm : styles.textMd]}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBCB8B22',
    borderColor: '#EBCB8B66',
    borderWidth: 1,
    borderRadius: radius.control,
  },
  badgeSm: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeMd: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  text: {
    color: PR_GOLD,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  textSm: {
    fontSize: 9,
  },
  textMd: {
    fontSize: 12,
  },
  pressed: {
    opacity: 0.7,
  },
});
