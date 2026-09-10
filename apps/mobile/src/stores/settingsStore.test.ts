import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSettingsStore } from './settingsStore';

describe('settingsStore', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    useSettingsStore.setState({
      weightUnit: 'kg',
      distanceUnit: 'km',
      isLoaded: false,
    });
  });

  it('initializes with default metric units (kg and km)', () => {
    const state = useSettingsStore.getState();
    expect(state.weightUnit).toBe('kg');
    expect(state.distanceUnit).toBe('km');
  });

  it('updates weight unit to lbs and persists to AsyncStorage', async () => {
    await useSettingsStore.getState().setWeightUnit('lbs');
    expect(useSettingsStore.getState().weightUnit).toBe('lbs');

    const stored = await AsyncStorage.getItem('reprise_user_settings');
    expect(stored).toBeTruthy();
    expect(JSON.parse(stored!).weightUnit).toBe('lbs');
  });

  it('updates distance unit to miles and persists to AsyncStorage', async () => {
    await useSettingsStore.getState().setDistanceUnit('miles');
    expect(useSettingsStore.getState().distanceUnit).toBe('miles');

    const stored = await AsyncStorage.getItem('reprise_user_settings');
    expect(stored).toBeTruthy();
    expect(JSON.parse(stored!).distanceUnit).toBe('miles');
  });

  it('loads previously stored settings on loadSettings', async () => {
    await AsyncStorage.setItem(
      'reprise_user_settings',
      JSON.stringify({ weightUnit: 'lbs', distanceUnit: 'miles' })
    );

    await useSettingsStore.getState().loadSettings();
    const state = useSettingsStore.getState();
    expect(state.weightUnit).toBe('lbs');
    expect(state.distanceUnit).toBe('miles');
    expect(state.isLoaded).toBe(true);
  });
});
