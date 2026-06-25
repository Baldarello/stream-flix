/**
 * PreferencesStore
 *
 * Owns the user-tweakable settings: language, custom intro
 * durations per show, etc. Anything that should survive a page
 * refresh and that does not belong to a specific content domain
 * goes here.
 */
import {makeAutoObservable, runInAction} from 'mobx';
import {db} from '../services/db';

const STORAGE_KEY = 'language';
const DEFAULT_LANGUAGE = 'it';

class PreferencesStore {
    language = DEFAULT_LANGUAGE;

    constructor() {
        makeAutoObservable(this);
    }

    setLanguage(lang) {
        this.language = lang;
        // Fire-and-forget persistence. Errors are logged but do not
        // bubble up so the UI stays responsive even when IndexedDB
        // is temporarily unavailable.
        db.preferences.put({ key: STORAGE_KEY, value: lang }).catch((e) => {
            console.warn('[preferencesStore] failed to persist language', e);
        });
    }

    hydrateFromDb(record) {
        runInAction(() => {
            if (record?.value) this.language = record.value;
        });
    }
}

export const preferencesStore = new PreferencesStore();
