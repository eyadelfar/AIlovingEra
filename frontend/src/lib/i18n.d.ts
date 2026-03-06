export interface SupportedLang {
  code: string;
  name: string;
  nativeName: string;
}

export const SUPPORTED_LANGS: readonly SupportedLang[];
export const RTL_LANGS: readonly string[];
export function isRTL(lng: string): boolean;

declare const i18n: import('i18next').i18n;
export default i18n;
