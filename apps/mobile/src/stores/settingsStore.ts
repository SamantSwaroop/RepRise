import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { WeightUnit, DistanceUnit } from '@reprise/shared';

const SETTINGS_KEY = 'reprise_user_settings';

interface SettingsState {
  weightUnit: WeightUnit;
  distanceUnit: DistanceUnit;
  isLoaded: boolean;

  loadSettings: () => Promise<void>;
  setWeightUnit: (unit: WeightUnit) => Promise<void>;
  setDistanceUnit: (unit: DistanceUnit) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  weightUnit: 'kg',
  distanceUnit: 'km',
  isLoaded: false,

  loadSettings: async () => {
    try {
      const raw = await AsyncStorage.getItem(SETTINGS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        set({
          weightUnit: parsed.weightUnit === 'lbs' ? 'lbs' : 'kg',
          distanceUnit: parsed.distanceUnit === 'miles' ? 'miles' : 'km',
          isLoaded: true,
        });
        return;
      }
    } catch (err) {
      console.warn('Failed to load settings:', err);
    }
    set({ isLoaded: true });
  },

  setWeightUnit: async (weightUnit: WeightUnit) => {
    set({ weightUnit });
    try {
      const current = {
        weightUnit,
        distanceUnit: get().distanceUnit,
      };
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(current));
    } catch (err) {
      console.warn('Failed to save weight unit setting:', err);
    }
  },

  setDistanceUnit: async (distanceUnit: DistanceUnit) => {
    set({ distanceUnit });
    try {
      const current = {
        weightUnit: get().weightUnit,
        distanceUnit,
      };
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(current));
    } catch (err) {
      console.warn('Failed to save distance unit setting:', err);
    }
  },
}));
