import { escapeCSV } from '@reprise/shared';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { exportDataFile } from './exportEngine';

describe('exportEngine & CSV formatting', () => {
  describe('escapeCSV (RFC-4180)', () => {
    it('wraps strings in double quotes', () => {
      expect(escapeCSV('Leg Day')).toBe('"Leg Day"');
    });

    it('escapes internal quotes by doubling them', () => {
      expect(escapeCSV('Heavy "PR" Attempt')).toBe('"Heavy ""PR"" Attempt"');
    });

    it('safely handles strings with commas', () => {
      expect(escapeCSV('Bench Press, Incline')).toBe('"Bench Press, Incline"');
    });

    it('handles multiline strings without breaking CSV rows', () => {
      expect(escapeCSV('Warmup set 1\nWarmup set 2')).toBe('"Warmup set 1\nWarmup set 2"');
    });

    it('handles null and undefined as empty quoted string', () => {
      expect(escapeCSV(null)).toBe('""');
      expect(escapeCSV(undefined)).toBe('""');
    });

    it('handles numbers and boolean values correctly', () => {
      expect(escapeCSV(82.5)).toBe('"82.5"');
      expect(escapeCSV(true)).toBe('"true"');
      expect(escapeCSV(0)).toBe('"0"');
    });
  });

  describe('exportDataFile', () => {
    it('writes content to filesystem cache and invokes native sharing', async () => {
      const csvContent = 'Date,Workout\n2026-09-10,Chest';
      const filename = 'reprise_test.csv';

      await exportDataFile(csvContent, filename, 'text/csv');

      expect(FileSystem.writeAsStringAsync).toHaveBeenCalled();
      expect(Sharing.shareAsync).toHaveBeenCalled();
    });
  });
});
