import { useStore } from '../store';
import { STRINGS, type Language } from './strings';

export { LANGUAGES } from './strings';
export type { Language } from './strings';

/**
 * Translation hook. Returns a `t(key)` bound to the current language, falling
 * back to English (then the key itself) so partial coverage never breaks the UI.
 */
export function useT(): (key: string) => string {
  const lang = useStore(s => s.uiLanguage);
  return (key: string) => STRINGS[lang]?.[key] ?? STRINGS.en[key] ?? key;
}

export function translate(lang: Language, key: string): string {
  return STRINGS[lang]?.[key] ?? STRINGS.en[key] ?? key;
}
