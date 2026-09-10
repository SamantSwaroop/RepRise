import { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Switch,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { WeightUnit, DistanceUnit } from '@reprise/shared';
import { colors, spacing, typography, radius } from '../src/theme/tokens';
import { useAuthStore } from '../src/stores/authStore';
import { useSettingsStore } from '../src/stores/settingsStore';
import { useRestTimerStore } from '../src/stores/restTimerStore';
import { useSyncStore } from '../src/stores/syncStore';
import { syncNow } from '../src/lib/syncEngine';
import { toast } from '../src/stores/toastStore';
import {
  generateWorkoutCSV,
  generateBackupJSON,
  exportDataFile,
} from '../src/lib/exportEngine';

const REST_PRESETS = [30, 60, 90, 120, 180, 240, 300];

export default function SettingsScreen() {
  const router = useRouter();
  const { user, logout, updateProfile } = useAuthStore();
  const { weightUnit, distanceUnit, setWeightUnit, setDistanceUnit } = useSettingsStore();
  const {
    settings: timerSettings,
    updateSettings: updateTimerSettings,
  } = useRestTimerStore();
  const { status: syncStatus, isOnline, lastSyncedAt, pendingCount } = useSyncStore();

  const [isExportingCSV, setIsExportingCSV] = useState(false);
  const [isExportingJSON, setIsExportingJSON] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Profile Edit State
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAvatar, setEditAvatar] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const openEditModal = () => {
    setEditName(user?.displayName || '');
    setEditAvatar(user?.avatarUrl || null);
    setIsEditModalVisible(true);
  };

  const handlePickImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Photo Library Access Required',
          'RepRise needs access to your camera roll so you can select your custom avatar.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (asset.base64) {
          const mime = asset.mimeType || 'image/jpeg';
          setEditAvatar(`data:${mime};base64,${asset.base64}`);
        } else {
          setEditAvatar(asset.uri);
        }
      }
    } catch (err: any) {
      Alert.alert('Photo Picker Error', err?.message || 'Could not load image');
    }
  };

  const handleSaveProfile = async () => {
    const trimmed = editName.trim();
    if (!trimmed) {
      Alert.alert('Display Name Required', 'Please enter a valid display name for your athlete profile.');
      return;
    }

    setIsSavingProfile(true);
    try {
      await updateProfile({
        displayName: trimmed,
        avatarUrl: editAvatar,
      });
      toast.success('Profile updated successfully');
      setIsEditModalVisible(false);
    } catch (err: any) {
      Alert.alert('Update Failed', err?.message || 'Could not update your profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const renderAvatarContent = (avatarUrl?: string | null, displayName?: string, size = 48) => {
    if (avatarUrl) {
      return (
        <Image
          source={{ uri: avatarUrl }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          resizeMode="cover"
        />
      );
    }
    return (
      <Text style={[styles.avatarText, { fontSize: size * 0.42 }]}>
        {(displayName || 'A').charAt(0).toUpperCase()}
      </Text>
    );
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await syncNow({ force: true });
      toast.success('Cloud sync complete');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExportCSV = async () => {
    if (!user?.id) return;
    setIsExportingCSV(true);
    try {
      const csv = await generateWorkoutCSV(user.id, weightUnit);
      const dateStr = new Date().toISOString().split('T')[0];
      await exportDataFile(csv, `reprise_workouts_${dateStr}.csv`, 'text/csv');
      toast.success('Workouts exported as CSV');
    } catch (err: any) {
      Alert.alert('Export Failed', err?.message || 'Could not export CSV file.');
    } finally {
      setIsExportingCSV(false);
    }
  };

  const handleExportJSON = async () => {
    if (!user?.id) return;
    setIsExportingJSON(true);
    try {
      const json = await generateBackupJSON(user.id);
      const dateStr = new Date().toISOString().split('T')[0];
      await exportDataFile(json, `reprise_backup_${dateStr}.json`, 'application/json');
      toast.success('Device backup exported as JSON');
    } catch (err: any) {
      Alert.alert('Export Failed', err?.message || 'Could not export backup JSON.');
    } finally {
      setIsExportingJSON(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out of RepRise?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/welcome');
        },
      },
    ]);
  };

  const formatLastSync = (ts: string | null) => {
    if (!ts) return 'Never';
    const date = new Date(ts);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* ─── Profile Card ─────────────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.profileRow}>
            <Pressable
              style={({ pressed }) => [styles.avatar, pressed && styles.pressed]}
              onPress={openEditModal}
            >
              {renderAvatarContent(user?.avatarUrl, user?.displayName, 48)}
              <View style={styles.avatarEditBadge}>
                <Ionicons name="camera" size={9} color={colors.background} />
              </View>
            </Pressable>
            <View style={styles.profileInfo}>
              <Text style={styles.userName}>{user?.displayName ?? 'Athlete'}</Text>
              <Text style={styles.userEmail}>{user?.email ?? 'Logged in locally'}</Text>
            </View>
            <Pressable
              style={({ pressed }) => [styles.editProfileBtn, pressed && styles.pressed]}
              onPress={openEditModal}
            >
              <Ionicons name="pencil" size={12} color={colors.accent} style={{ marginRight: 4 }} />
              <Text style={styles.editProfileBtnText}>Edit</Text>
            </Pressable>
          </View>

        <View style={styles.divider} />

        <View style={styles.syncRow}>
          <View style={styles.syncInfo}>
            <View style={styles.syncStatusRow}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: isOnline ? colors.success : colors.warning },
                ]}
              />
              <Text style={styles.syncStatusText}>
                {isOnline ? 'Cloud Synced' : 'Offline Mode'}
              </Text>
              {pendingCount > 0 && (
                <Text style={styles.pendingText}>({pendingCount} pending)</Text>
              )}
            </View>
            <Text style={styles.lastSyncText}>Last: {formatLastSync(lastSyncedAt)}</Text>
          </View>

          <Pressable
            style={({ pressed }) => [styles.syncButton, pressed && styles.pressed]}
            onPress={handleSync}
            disabled={isSyncing}
          >
            {isSyncing ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <Text style={styles.syncButtonText}>Sync Now</Text>
            )}
          </Pressable>
        </View>
      </View>

      {/* ─── Unit Preferences ─────────────────────────────────────── */}
      <Text style={styles.sectionTitle}>Units & Formatting</Text>
      <View style={styles.card}>
        {/* Weight Unit */}
        <View style={styles.settingRow}>
          <View style={styles.settingTextCol}>
            <Text style={styles.settingLabel}>Weight Unit</Text>
            <Text style={styles.settingSubtext}>Used across all workout sets and PRs</Text>
          </View>
          <View style={styles.segmentContainer}>
            <Pressable
              style={[
                styles.segmentBtn,
                weightUnit === 'kg' && styles.segmentBtnActive,
              ]}
              onPress={() => setWeightUnit('kg')}
            >
              <Text
                style={[
                  styles.segmentText,
                  weightUnit === 'kg' && styles.segmentTextActive,
                ]}
              >
                KG
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.segmentBtn,
                weightUnit === 'lbs' && styles.segmentBtnActive,
              ]}
              onPress={() => setWeightUnit('lbs')}
            >
              <Text
                style={[
                  styles.segmentText,
                  weightUnit === 'lbs' && styles.segmentTextActive,
                ]}
              >
                LBS
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Distance Unit */}
        <View style={styles.settingRow}>
          <View style={styles.settingTextCol}>
            <Text style={styles.settingLabel}>Distance Unit</Text>
            <Text style={styles.settingSubtext}>For cardio & distance-based exercises</Text>
          </View>
          <View style={styles.segmentContainer}>
            <Pressable
              style={[
                styles.segmentBtn,
                distanceUnit === 'km' && styles.segmentBtnActive,
              ]}
              onPress={() => setDistanceUnit('km')}
            >
              <Text
                style={[
                  styles.segmentText,
                  distanceUnit === 'km' && styles.segmentTextActive,
                ]}
              >
                KM
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.segmentBtn,
                distanceUnit === 'miles' && styles.segmentBtnActive,
              ]}
              onPress={() => setDistanceUnit('miles')}
            >
              <Text
                style={[
                  styles.segmentText,
                  distanceUnit === 'miles' && styles.segmentTextActive,
                ]}
              >
                MILES
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* ─── Rest Timer Preferences ───────────────────────────────── */}
      <Text style={styles.sectionTitle}>Rest Timer</Text>
      <View style={styles.card}>
        <View style={styles.timerDurationRow}>
          <Text style={styles.settingLabel}>Default Rest Duration</Text>
          <Text style={styles.presetHighlight}>{timerSettings.defaultDuration}s</Text>
        </View>

        {/* Presets Strip */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.presetList}
        >
          {REST_PRESETS.map((seconds) => {
            const isSelected = timerSettings.defaultDuration === seconds;
            return (
              <Pressable
                key={seconds}
                style={[styles.presetChip, isSelected && styles.presetChipActive]}
                onPress={() => updateTimerSettings({ defaultDuration: seconds })}
              >
                <Text style={[styles.presetChipText, isSelected && styles.presetChipTextActive]}>
                  {seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m${seconds % 60 ? ` ${seconds % 60}s` : ''}`}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.divider} />

        <View style={styles.settingRow}>
          <View style={styles.settingTextCol}>
            <Text style={styles.settingLabel}>Auto-Start Timer</Text>
            <Text style={styles.settingSubtext}>Starts rest timer when completing a set</Text>
          </View>
          <Switch
            value={timerSettings.autoStart}
            onValueChange={(val) => updateTimerSettings({ autoStart: val })}
            trackColor={{ false: colors.border, true: colors.accent }}
            thumbColor={colors.textPrimary}
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.settingRow}>
          <View style={styles.settingTextCol}>
            <Text style={styles.settingLabel}>Sound Chime</Text>
            <Text style={styles.settingSubtext}>Play chime when rest interval completes</Text>
          </View>
          <Switch
            value={timerSettings.soundEnabled}
            onValueChange={(val) => updateTimerSettings({ soundEnabled: val })}
            trackColor={{ false: colors.border, true: colors.accent }}
            thumbColor={colors.textPrimary}
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.settingRow}>
          <View style={styles.settingTextCol}>
            <Text style={styles.settingLabel}>Haptic Feedback</Text>
            <Text style={styles.settingSubtext}>Vibrate device on timer completion</Text>
          </View>
          <Switch
            value={timerSettings.vibrateEnabled}
            onValueChange={(val) => updateTimerSettings({ vibrateEnabled: val })}
            trackColor={{ false: colors.border, true: colors.accent }}
            thumbColor={colors.textPrimary}
          />
        </View>
      </View>

      {/* ─── Data Export Hub ──────────────────────────────────────── */}
      <Text style={styles.sectionTitle}>Data Management & Export</Text>
      <View style={styles.card}>
        <Text style={styles.exportDescription}>
          Export your complete training history anytime. Your data is 100% yours.
        </Text>

        <Pressable
          style={({ pressed }) => [styles.exportBtn, pressed && styles.pressed]}
          onPress={handleExportCSV}
          disabled={isExportingCSV}
        >
          <View style={styles.exportBtnLeft}>
            <Ionicons name="document-text-outline" size={20} color={colors.accent} />
            <View style={{ marginLeft: spacing.md }}>
              <Text style={styles.exportBtnTitle}>Export to CSV</Text>
              <Text style={styles.exportBtnSubtitle}>Spreadsheet format for Excel & Google Sheets</Text>
            </View>
          </View>
          {isExportingCSV ? (
            <ActivityIndicator size="small" color={colors.accent} />
          ) : (
            <Ionicons name="share-outline" size={18} color={colors.textMuted} />
          )}
        </Pressable>

        <View style={styles.divider} />

        <Pressable
          style={({ pressed }) => [styles.exportBtn, pressed && styles.pressed]}
          onPress={handleExportJSON}
          disabled={isExportingJSON}
        >
          <View style={styles.exportBtnLeft}>
            <Ionicons name="cloud-download-outline" size={20} color={colors.accent} />
            <View style={{ marginLeft: spacing.md }}>
              <Text style={styles.exportBtnTitle}>Full JSON Backup</Text>
              <Text style={styles.exportBtnSubtitle}>Workouts, templates, and exercise database</Text>
            </View>
          </View>
          {isExportingJSON ? (
            <ActivityIndicator size="small" color={colors.accent} />
          ) : (
            <Ionicons name="share-outline" size={18} color={colors.textMuted} />
          )}
        </Pressable>
      </View>

      {/* ─── App Diagnostics ──────────────────────────────────────── */}
      <Text style={styles.sectionTitle}>About RepRise</Text>
      <View style={styles.card}>
        <View style={styles.diagnosticRow}>
          <Text style={styles.diagnosticLabel}>Version</Text>
          <Text style={styles.diagnosticVal}>v0.1.0 (Phase 11)</Text>
        </View>
        <View style={styles.diagnosticRow}>
          <Text style={styles.diagnosticLabel}>Architecture</Text>
          <Text style={styles.diagnosticVal}>Local-First SQLite + Cloud Sync</Text>
        </View>
        <View style={styles.diagnosticRow}>
          <Text style={styles.diagnosticLabel}>Storage Engine</Text>
          <Text style={styles.diagnosticVal}>expo-sqlite (WAL Mode)</Text>
        </View>
      </View>

      {/* ─── Logout ───────────────────────────────────────────────── */}
      <Pressable
        style={({ pressed }) => [styles.logoutBtn, pressed && styles.logoutBtnPressed]}
        onPress={handleLogout}
      >
        <Ionicons name="log-out-outline" size={18} color={colors.danger} style={{ marginRight: 8 }} />
        <Text style={styles.logoutText}>Log Out</Text>
      </Pressable>
    </ScrollView>

    {/* ─── Edit Profile Modal ───────────────────────────────────── */}
    <Modal
      visible={isEditModalVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setIsEditModalVisible(false)}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setIsEditModalVisible(false)}
        />
        <View style={styles.modalSheet}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <Text style={styles.modalSubtitle}>Update your photo and athlete name</Text>
            </View>
            <Pressable
              style={({ pressed }) => [styles.modalCloseBtn, pressed && styles.pressed]}
              onPress={() => setIsEditModalVisible(false)}
            >
              <Ionicons name="close" size={20} color={colors.textMuted} />
            </Pressable>
          </View>

          {/* Avatar Preview & Actions */}
          <View style={styles.modalAvatarSection}>
            <Pressable
              style={({ pressed }) => [styles.modalAvatarCircle, pressed && styles.pressed]}
              onPress={handlePickImage}
            >
              {renderAvatarContent(editAvatar, editName || user?.displayName, 84)}
              <View style={styles.modalCameraBadge}>
                <Ionicons name="camera" size={15} color={colors.background} />
              </View>
            </Pressable>
            <Text style={styles.avatarTapHint}>Tap photo to change</Text>

            {editAvatar ? (
              <Pressable
                style={({ pressed }) => [styles.removePhotoBtn, pressed && styles.pressed]}
                onPress={() => setEditAvatar(null)}
              >
                <Ionicons name="trash-outline" size={14} color={colors.danger} style={{ marginRight: 4 }} />
                <Text style={styles.removePhotoBtnText}>Remove Photo</Text>
              </Pressable>
            ) : null}
          </View>

          {/* Display Name Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Athlete Name</Text>
            <TextInput
              style={styles.textInput}
              value={editName}
              onChangeText={setEditName}
              placeholder="Enter your name"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="words"
              maxLength={50}
              returnKeyType="done"
            />
          </View>

          {/* Footer Buttons */}
          <View style={styles.modalFooter}>
            <Pressable
              style={({ pressed }) => [styles.modalCancelBtn, pressed && styles.pressed]}
              onPress={() => setIsEditModalVisible(false)}
              disabled={isSavingProfile}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.modalSaveBtn,
                pressed && styles.pressed,
                isSavingProfile && styles.modalSaveBtnDisabled,
              ]}
              onPress={handleSaveProfile}
              disabled={isSavingProfile}
            >
              {isSavingProfile ? (
                <ActivityIndicator size="small" color={colors.background} />
              ) : (
                <Text style={styles.modalSaveText}>Save Changes</Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: 60,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: typography.caption.size,
    fontWeight: '700',
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
    marginLeft: 4,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1.5,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.border,
  },
  editProfileBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.accent,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.accent,
  },
  profileInfo: {
    marginLeft: spacing.md,
    flex: 1,
  },
  userName: {
    fontSize: typography.h2.size,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  userEmail: {
    fontSize: typography.caption.size,
    color: colors.textMuted,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  syncRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  syncInfo: {
    flex: 1,
  },
  syncStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 6,
  },
  syncStatusText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  pendingText: {
    fontSize: 12,
    color: colors.warning,
    marginLeft: 4,
  },
  lastSyncText: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  syncButton: {
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.border,
  },
  syncButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.accent,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingTextCol: {
    flex: 1,
    paddingRight: spacing.md,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  settingSubtext: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.control,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segmentBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.control - 2,
  },
  segmentBtnActive: {
    backgroundColor: colors.accent,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
  },
  segmentTextActive: {
    color: colors.background,
  },
  timerDurationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  presetHighlight: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.accent,
  },
  presetList: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: 4,
  },
  presetChip: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.control,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  presetChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  presetChipTextActive: {
    color: colors.background,
    fontWeight: '700',
  },
  exportDescription: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  exportBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  exportBtnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  exportBtnTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  exportBtnSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  diagnosticRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  diagnosticLabel: {
    fontSize: 13,
    color: colors.textMuted,
  },
  diagnosticVal: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(191, 97, 106, 0.12)',
    borderRadius: radius.card,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(191, 97, 106, 0.3)',
    marginTop: spacing.md,
  },
  logoutBtnPressed: {
    opacity: 0.8,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.danger,
  },
  pressed: {
    opacity: 0.7,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: colors.surfaceRaised,
  },
  modalAvatarSection: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalAvatarCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 2,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  modalCameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  avatarTapHint: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 8,
  },
  removePhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(191, 97, 106, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: 'rgba(191, 97, 106, 0.3)',
    marginTop: 10,
  },
  removePhotoBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.danger,
  },
  inputGroup: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: radius.control,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
  },
  modalSaveBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: radius.control,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSaveBtnDisabled: {
    opacity: 0.6,
  },
  modalSaveText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.background,
  },
});
