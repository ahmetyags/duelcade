/**
 * Typography definitions for Duelcade.
 * Maps to the design tokens and provides font configuration.
 */

import { typography } from '@/theme/tokens';

export const Typography = typography;

/** Font family names. Local Quicksand files are loaded at the root layout. */
export const FontFamilies = {
  regular: 'Quicksand',
  medium: 'Quicksand-Medium',
  semiBold: 'Quicksand-SemiBold',
  bold: 'Quicksand-Bold',
} as const;
