import { describe, it, expect } from 'vitest';
import {
  kgToLbs,
  lbsToKg,
  displayWeight,
  parseWeightInput,
  formatWeight,
  formatVolume,
  escapeCSV,
  LBS_PER_KG,
} from '@reprise/shared';

describe('Phase 11: Units & Data Export Utilities', () => {
  describe('Unit Conversions', () => {
    it('converts kg to lbs accurately with 1 decimal precision', () => {
      expect(kgToLbs(0)).toBe(0);
      expect(kgToLbs(-10)).toBe(0);
      expect(kgToLbs(100)).toBe(220.5);
      expect(kgToLbs(60)).toBe(132.3);
      expect(kgToLbs(20)).toBe(44.1);
    });

    it('converts lbs to canonical kg accurately with 1 decimal precision', () => {
      expect(lbsToKg(0)).toBe(0);
      expect(lbsToKg(-50)).toBe(0);
      expect(lbsToKg(225)).toBe(102.1);
      expect(lbsToKg(135)).toBe(61.2);
      expect(lbsToKg(315)).toBe(142.9);
      expect(lbsToKg(45)).toBe(20.4);
    });

    it('handles canonical weight display for both kg and lbs', () => {
      expect(displayWeight(null, 'kg')).toBeNull();
      expect(displayWeight(undefined, 'lbs')).toBeNull();
      expect(displayWeight(NaN, 'kg')).toBeNull();

      // In kg mode, should keep canonical kg
      expect(displayWeight(100, 'kg')).toBe(100);
      expect(displayWeight(102.14, 'kg')).toBe(102.1);

      // In lbs mode, should convert to lbs
      expect(displayWeight(100, 'lbs')).toBe(220.5);
      expect(displayWeight(102.1, 'lbs')).toBe(225.1);
    });

    it('parses weight inputs correctly depending on active unit', () => {
      expect(parseWeightInput(null, 'kg')).toBeNull();
      expect(parseWeightInput('', 'lbs')).toBeNull();
      expect(parseWeightInput('   ', 'kg')).toBeNull();
      expect(parseWeightInput('abc', 'lbs')).toBeNull();
      expect(parseWeightInput(-5, 'kg')).toBeNull();

      // kg mode saves directly to canonical kg
      expect(parseWeightInput('100', 'kg')).toBe(100);
      expect(parseWeightInput(82.5, 'kg')).toBe(82.5);

      // lbs mode converts to canonical kg
      expect(parseWeightInput('225', 'lbs')).toBe(102.1);
      expect(parseWeightInput(135, 'lbs')).toBe(61.2);
    });

    it('formats weight values with optional unit suffix', () => {
      expect(formatWeight(null, 'kg')).toBe('-');
      expect(formatWeight(undefined, 'lbs')).toBe('-');
      expect(formatWeight(-1, 'kg')).toBe('-');

      expect(formatWeight(100, 'kg')).toBe('100');
      expect(formatWeight(100, 'kg', { showUnit: true })).toBe('100 kg');
      expect(formatWeight(100, 'lbs')).toBe('220.5');
      expect(formatWeight(100, 'lbs', { showUnit: true })).toBe('220.5 lbs');
    });

    it('formats volume with unit scaling and thousands grouping', () => {
      expect(formatVolume(null, 'kg')).toBe('0 kg');
      expect(formatVolume(0, 'lbs')).toBe('0 lbs');
      expect(formatVolume(-100, 'kg')).toBe('0 kg');

      expect(formatVolume(5000, 'kg')).toBe('5,000 kg');
      // 5000 kg * 2.204622... = 11023.11... -> 11,023 lbs
      expect(formatVolume(5000, 'lbs')).toBe('11,023 lbs');
    });
  });

  describe('RFC-4180 CSV Escaping', () => {
    it('returns empty quotes for null or undefined', () => {
      expect(escapeCSV(null)).toBe('""');
      expect(escapeCSV(undefined)).toBe('""');
    });

    it('wraps plain strings in quotes', () => {
      expect(escapeCSV('Barbell Bench Press')).toBe('"Barbell Bench Press"');
    });

    it('escapes internal quotes by doubling them', () => {
      expect(escapeCSV('12" Barbell')).toBe('"12"" Barbell"');
      expect(escapeCSV('He said "Hello"')).toBe('"He said ""Hello"""');
    });

    it('preserves commas, newlines, and special characters inside quotes', () => {
      expect(escapeCSV('Legs, Shoulders, Core')).toBe('"Legs, Shoulders, Core"');
      expect(escapeCSV('Line 1\nLine 2')).toBe('"Line 1\nLine 2"');
    });

    it('formats numbers and booleans correctly', () => {
      expect(escapeCSV(102.5)).toBe('"102.5"');
      expect(escapeCSV(0)).toBe('"0"');
      expect(escapeCSV(true)).toBe('"true"');
      expect(escapeCSV(false)).toBe('"false"');
    });
  });
});
