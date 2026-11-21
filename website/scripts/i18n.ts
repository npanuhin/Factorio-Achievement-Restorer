import { en } from '../locales/en';

export type Language = 'en';

const dictionaries: Record<Language, Record<string, string>> = { en };

const STORAGE_KEY = 'factorio_reset_lang';

let currentLang: Language = 'en';

export function getLanguage(): Language {
  return currentLang;
}

export function detectBrowserLanguage(): Language {
  return 'en';
}

export function initI18n(): void {
  currentLang = 'en';
  applyLanguage(currentLang);
}

export function setLanguage(lang: Language): void {
  currentLang = 'en';
  applyLanguage('en');
}

export function t(key: string, params: Record<string, string | number> = {}): string {
  let text = dictionaries[currentLang]?.[key] || dictionaries['en']?.[key] || key;
  for (const [k, v] of Object.entries(params)) {
    text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
  }
  return text;
}

export function applyLanguage(lang: Language): void {
  document.documentElement.lang = lang;
  const elements = document.querySelectorAll('[data-i18n]');
  elements.forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (key) {
      el.textContent = t(key);
    }
  });

  const placeholders = document.querySelectorAll('[data-i18n-placeholder]');
  placeholders.forEach((el) => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (key && 'placeholder' in el) {
      (el as HTMLInputElement).placeholder = t(key);
    }
  });
}
