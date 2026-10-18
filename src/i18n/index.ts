import type { Lang } from './dictionary';
import { translate } from './dictionary';

export interface I18n {
  lang: Lang;
  t: (key: string) => string;
  locale: string;
}

export function makeI18n(lang: Lang): I18n {
  return {
    lang,
    t: (key: string) => translate(lang, key),
    locale: lang === 'vi' ? 'vi-VN' : 'en-US',
  };
}
