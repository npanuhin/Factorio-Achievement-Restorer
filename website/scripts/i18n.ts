import { en } from '../locales/en';
import { cs } from '../locales/cs';
import { da } from '../locales/da';
import { de } from '../locales/de';
import { es } from '../locales/es';
import { fr } from '../locales/fr';
import { it } from '../locales/it';
import { hu } from '../locales/hu';
import { nl } from '../locales/nl';
import { no } from '../locales/no';
import { pl } from '../locales/pl';
import { pt } from '../locales/pt';
import { ro } from '../locales/ro';
import { sv } from '../locales/sv';
import { tr } from '../locales/tr';
import { vi } from '../locales/vi';
import { ru } from '../locales/ru';
import { uk } from '../locales/uk';
import { th } from '../locales/th';
import { zh } from '../locales/zh';
import { ja } from '../locales/ja';
import { ko } from '../locales/ko';

export type Language =
  | 'en'
  | 'cs'
  | 'da'
  | 'de'
  | 'es'
  | 'fr'
  | 'it'
  | 'hu'
  | 'nl'
  | 'no'
  | 'pl'
  | 'pt'
  | 'ro'
  | 'sv'
  | 'tr'
  | 'vi'
  | 'ru'
  | 'uk'
  | 'th'
  | 'zh'
  | 'ja'
  | 'ko';

const dictionaries: Record<Language, Record<string, string>> = {
  en, cs, da, de, es, fr, it, hu, nl, no, pl, pt, ro, sv, tr, vi, ru, uk, th, zh, ja, ko
};

const STORAGE_KEY = 'factorio_reset_lang';

let currentLang: Language = 'en';

export function getLanguage(): Language {
  return currentLang;
}

export function detectBrowserLanguage(): Language {
  const stored = localStorage.getItem(STORAGE_KEY) as Language | null;
  if (stored && dictionaries[stored]) {
    return stored;
  }

  const navLangs = navigator.languages || [navigator.language || ''];
  for (const l of navLangs) {
    const code = l.toLowerCase().split('-')[0];
    if (code === 'ru' || code === 'be') return 'ru';
    if (code === 'uk') return 'uk';
    if (code === 'tr') return 'tr';
    if (code === 'nl') return 'nl';
    if (code === 'de') return 'de';
    if (code === 'zh') return 'zh';
    if (code === 'es') return 'es';
    if (code === 'fr') return 'fr';
    if (code === 'ja') return 'ja';
    if (code === 'ko') return 'ko';
    if (code === 'pl') return 'pl';
    if (code === 'pt') return 'pt';
    if (code === 'it') return 'it';
    if (code === 'cs') return 'cs';
    if (code === 'sv') return 'sv';
    if (code === 'no' || code === 'nb' || code === 'nn') return 'no';
    if (code === 'da') return 'da';
    if (code === 'hu') return 'hu';
    if (code === 'ro') return 'ro';
    if (code === 'vi') return 'vi';
    if (code === 'th') return 'th';
    if (code === 'en') return 'en';
  }

  return 'en';
}

export function initI18n(): void {
  currentLang = detectBrowserLanguage();
  applyLanguage(currentLang);
}

export function setLanguage(lang: Language): void {
  if (dictionaries[lang]) {
    currentLang = lang;
    localStorage.setItem(STORAGE_KEY, lang);
    applyLanguage(lang);
  }
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
