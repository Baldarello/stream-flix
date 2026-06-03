import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { mediaStore } from '../store/mediaStore.js';
import { it as itLocale } from '../locales/it.js';
import { en as enLocale } from '../locales/en.js';

export const AVAILABLE_LANGUAGES = ['it', 'en'];
export const FALLBACK_LANGUAGE = 'it';

const allTranslations = { it: itLocale, en: enLocale };

/**
 * Navigate a nested object with a dot-separated string. Returns
 * `undefined` if any intermediate key is missing.
 */
const getNestedValue = (obj, path) => {
    if (obj == null) return undefined;
    return path.split('.').reduce((acc, part) => (acc != null ? acc[part] : undefined), obj);
};

/**
 * Replace `{name}` placeholders in a translated string.
 */
const interpolate = (str, values) => {
    if (!values) return str;
    return String(str).replace(/\{(\w+)\}/g, (placeholder, key) =>
        values[key] !== undefined ? String(values[key]) : placeholder
    );
};

const noopSubscribe = () => () => {};

/**
 * `useTranslations` is the canonical hook for translating UI strings.
 *
 * It exposes:
 *   - `t(key, values?)` – resolve a dot-separated translation key.
 *     Falls back to the Italian locale and finally to the raw key
 *     (with a `console.warn`) so missing keys are loud.
 *   - `tc(count, key, values?)` – same as `t`, but selects the
 *     singular/plural form from `key.one` / `key.other`.
 *   - `language` – the active language code (`'it' | 'en'`).
 *   - `setLanguage(lang)` – switch the active language (persists to
 *     the user preferences through `mediaStore.setLanguage`).
 */
export const useTranslations = () => {
    // Subscribe to the active language via mediaStore so that any
    // call to `setLanguage` triggers a re-render.
    const events = mediaStore.events;
    const subscribe = useCallback(
        (cb) => {
            if (events && typeof events.on === 'function' && typeof events.off === 'function') {
                events.on('languagechange', cb);
                return () => events.off('languagechange', cb);
            }
            return noopSubscribe();
        },
        [events]
    );

    const language = useSyncExternalStore(subscribe, () => mediaStore.language, () => mediaStore.language);

    const dictionary = useMemo(
        () => allTranslations[language] || allTranslations[FALLBACK_LANGUAGE],
        [language]
    );
    const fallback = useMemo(() => allTranslations[FALLBACK_LANGUAGE], []);

    const t = useCallback(
        (key, values) => {
            const translated = getNestedValue(dictionary, key) || getNestedValue(fallback, key);
            if (translated == null) {
                console.warn(`[Translation] Missing key: "${key}" for language: "${language}"`);
                return key;
            }
            return interpolate(translated, values);
        },
        [dictionary, fallback, language]
    );

    const tc = useCallback(
        (count, key, values) => {
            const form = count === 1 ? 'one' : 'other';
            return t(`${key}.${form}`, { ...values, count });
        },
        [t]
    );

    const setLanguage = useCallback((lang) => {
        if (!AVAILABLE_LANGUAGES.includes(lang)) {
            console.warn(`[Translation] Unknown language: "${lang}"`);
            return;
        }
        mediaStore.setLanguage(lang);
    }, []);

    return { t, tc, language, setLanguage };
};
