import {mediaStore} from '../store/mediaStore.js';

// Helper function to navigate a nested object with a dot-separated string
const getNestedValue = (obj, path) => {
  return path.split('.').reduce((acc, part) => acc && acc[part], obj);
};

// Helper function for replacing placeholders like {name}
const interpolate = (str, values) => {
    return str.replace(/\{(\w+)\}/g, (placeholder, key) => {
        return values[key] !== undefined ? String(values[key]) : placeholder;
    });
}

export const useTranslations = () => {
  const { translations, language } = mediaStore;

  const t = (key, values) => {
    const translatedString = getNestedValue(translations, key);
    if (translatedString) {
        return values ? interpolate(translatedString, values) : translatedString;
    }
    console.warn(`[Translation] Missing key: "${key}" for language: "${language}"`);
    return key;
  };

  return { t, language };
};
