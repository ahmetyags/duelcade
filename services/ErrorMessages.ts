import { translate, type TranslationKey } from '@/src/i18n';
import type { AppLanguage } from '@/store/settingsStore';

export function getErrorMessage(error: string, language: AppLanguage): string {
  if (error.startsWith('error.') || error.startsWith('validation.') || error.startsWith('puzzle.')) {
    return translate(language, error as TranslationKey);
  }
  return error;
}
