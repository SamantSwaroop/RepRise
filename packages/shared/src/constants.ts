export const APP_NAME = 'RepRise';
export const APP_TAGLINE = 'Track every rep, beat your best.';

export const UNITS = ['kg', 'lb'] as const;
export type Unit = (typeof UNITS)[number];
