import { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../theme/tokens';
import { useSyncStore } from '../stores/syncStore';
import { syncNow } from '../lib/syncEngine';

function formatLastSynced(timestamp: string | null): string {
  if (!timestamp) return 'Never synced';

  const date = new Date(timestamp);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSec < 10) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function SyncDetailsModal() {
  const isVisible = useSyncStore((s) => s.isModalVisible);
  const setModalVisible = useSyncStore((s) => s.setModalVisible);
  const status = useSyncStore((s) => s.status);
  const isOnline = useSyncStore((s) => s.isOnline);
  const pendingCount = useSyncStore((s) => s.pendingCount);
  const lastSyncedAt = useSyncStore((s) => s.lastSyncedAt);
  const error = useSyncStore((s) => s.error);

  const [isManualSyncing, setIsManualSyncing] = useState(false);

  const handleSyncNow = async () => {
    setIsManualSyncing(true);
    try {
      await syncNow({ force: true });
    } finally {
      setIsManualSyncing(false);
    }
  };

  const isSyncingActive = status === 'syncing' || isManualSyncing;

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={() => setModalVisible(false)}
    >
      <Pressable style={styles.backdrop} onPress={() => setModalVisible(false)}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Ionicons name="cloud-outline" size={22} color={colors.accent} style={styles.headerIcon} />
              <Text style={styles.title}>Cloud Sync</Text>
            </View>
            <Pressable onPress={() => setModalVisible(false)} hitSlop={8}>
              <Ionicons name="close" size={20} color={colors.textMuted} />
            </Pressable>
          </View>

          {/* Status Row */}
          <View style={styles.statusRow}>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Network</Text>
              <View style={styles.badgeRow}>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: isOnline ? colors.success : colors.warning },
                  ]}
                />
                <Text style={styles.statusValue}>{isOnline ? 'Online' : 'Offline'}</Text>
              </View>
            </View>

            <View style={styles.statusDivider} />

            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Last Synced</Text>
              <Text style={styles.statusValue}>{formatLastSynced(lastSyncedAt)}</Text>
            </View>

            <View style={styles.statusDivider} />

            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Pending</Text>
              <Text
                style={[
                  styles.statusValue,
                  pendingCount > 0 && { color: colors.warning, fontWeight: '700' },
                ]}
              >
                {pendingCount} {pendingCount === 1 ? 'item' : 'items'}
              </Text>
            </View>
          </View>

          {/* Error Banner */}
          {error && (
            <View style={styles.errorBox}>
              <Ionicons name="warning-outline" size={16} color={colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Info Description */}
          <Text style={styles.description}>
            RepRise operates local-first. All your workouts, templates, and sets are saved directly
            to your device with zero latency and automatically sync to your cloud account when connected.
          </Text>

          {/* Sync Button */}
          <Pressable
            style={({ pressed }) => [
              styles.syncBtn,
              isSyncingActive && styles.syncBtnDisabled,
              pressed && styles.syncBtnPressed,
            ]}
            onPress={handleSyncNow}
            disabled={isSyncingActive}
          >
            {isSyncingActive ? (
              <View style={styles.syncBtnContent}>
                <ActivityIndicator size="small" color={colors.background} style={{ marginRight: 8 }} />
                <Text style={styles.syncBtnText}>Synchronizing...</Text>
              </View>
            ) : (
              <View style={styles.syncBtnContent}>
                <Ionicons name="refresh" size={18} color={colors.background} style={{ marginRight: 6 }} />
                <Text style={styles.syncBtnText}>Sync Now</Text>
              </View>
            )}
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 380,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    marginRight: spacing.sm,
  },
  title: {
    fontSize: typography.h2.size,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statusRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.control,
    padding: spacing.md,
    marginBottom: spacing.md,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusItem: {
    flex: 1,
    alignItems: 'center',
  },
  statusDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.border,
  },
  statusLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 4,
    fontWeight: '500',
  },
  statusValue: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 5,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(191, 97, 106, 0.12)',
    padding: spacing.sm,
    borderRadius: radius.control,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(191, 97, 106, 0.3)',
  },
  errorText: {
    fontSize: 12,
    color: colors.danger,
    marginLeft: spacing.sm,
    flex: 1,
  },
  description: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
    marginBottom: spacing.lg,
  },
  syncBtn: {
    backgroundColor: colors.accent,
    borderRadius: radius.control,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncBtnDisabled: {
    opacity: 0.7,
  },
  syncBtnPressed: {
    opacity: 0.85,
  },
  syncBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  syncBtnText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: '700',
  },
});
