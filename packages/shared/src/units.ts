import { z } from 'zod';

// ─── Unit Types ────────────────────────────────────────────────────

export const weightUnitSchema = z.enum(['kg', 'lbs']);
export type WeightUnit = z.infer<typeof weightUnitSchema>;

export const distanceUnitSchema = z.enum(['km', 'miles']);
export type DistanceUnit = z.infer<typeof distanceUnitSchema>;

export const LBS_PER_KG = 2.20462262185;
export const MILES_PER_KM = 0.621371;

// ─── Conversion Utilities ──────────────────────────────────────────

/**
 * Converts kilograms to pounds, rounded to 1 decimal place.
 */
export function kgToLbs(kg: number): number {
  if (!kg || kg <= 0) return 0;
  return Math.round(kg * LBS_PER_KG * 10) / 10;
}

/**
 * Converts pounds to canonical kilograms, rounded to 1 decimal place.
 */
export function lbsToKg(lbs: number): number {
  if (!lbs || lbs <= 0) return 0;
  return Math.round((lbs / LBS_PER_KG) * 10) / 10;
}

/**
 * Converts canonical weight in kg into display value according to the chosen unit.
 */
export function displayWeight(weightKg: number | null | undefined, unit: WeightUnit): number | null {
  if (weightKg == null || isNaN(weightKg)) return null;
  if (unit === 'lbs') {
    return kgToLbs(weightKg);
  }
  return Math.round(weightKg * 10) / 10;
}

/**
 * Parses user input (entered in the active unit) and returns the canonical value in kg.
 */
export function parseWeightInput(input: string | number | null | undefined, unit: WeightUnit): number | null {
  if (input == null) return null;
  const num = typeof input === 'number' ? input : parseFloat(String(input).trim());
  if (isNaN(num) || num < 0) return null;

  if (unit === 'lbs') {
    return lbsToKg(num);
  }
  return Math.round(num * 10) / 10;
}

/**
 * Formats canonical weight in kg into a user-friendly string.
 */
export function formatWeight(
  weightKg: number | null | undefined,
  unit: WeightUnit,
  options?: { showUnit?: boolean },
): string {
  if (weightKg == null || isNaN(weightKg) || weightKg < 0) {
    return '-';
  }

  const val = displayWeight(weightKg, unit);
  if (val == null) return '-';

  const unitSuffix = options?.showUnit ? ` ${unit}` : '';
  return `${val}${unitSuffix}`;
}

/**
 * Formats total workout volume (in kg) into formatted string in active unit.
 */
export function formatVolume(volumeKg: number | null | undefined, unit: WeightUnit): string {
  if (!volumeKg || volumeKg <= 0 || isNaN(volumeKg)) {
    return `0 ${unit}`;
  }

  const displayVal = unit === 'lbs' ? volumeKg * LBS_PER_KG : volumeKg;
  const rounded = Math.round(displayVal);
  return `${rounded.toLocaleString()} ${unit}`;
}
