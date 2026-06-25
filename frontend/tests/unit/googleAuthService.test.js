/**
 * Tests for the Google Auth service initialization and sign-in flow.
 *
 * The service is sensitive to the timing of the Google Identity Services
 * (GSI) script load. These tests reproduce the original bug where the
 * service only waited 500ms for the GSI library, and verify that the
 * service can now wait longer and lazily initialize on first sign-in.
 */
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {mediaStore} from '../../store/mediaStore.js';

// The `GOOGLE_CLIENT_ID` constant is captured at module load time, so the
// env var must be set BEFORE the service module is imported. Vitest's
// `vi.hoisted` runs before all imports.
vi.hoisted(() => {
    process.env.GOOGLE_CLIENT_ID = 'test-client-id.apps.googleusercontent.com';
});

// Mock the media store so we can verify side effects without spinning up MobX.
vi.mock('../../store/mediaStore.js', () => {
    return {
        mediaStore: {
            isGoogleAuthLoading: false,
            googleUser: null,
            showSnackbar: vi.fn(),
            setGoogleUser: vi.fn().mockResolvedValue(undefined),
            synchronizeWithDrive: vi.fn().mockResolvedValue(undefined),
        },
    };
});

// Helper to (re-)import the service module after vi.resetModules so the
// module-level `tokenClient` state is fresh for each test.
const importService = async () => {
    const mod = await import('../../services/googleAuthService.js');
    return mod;
};

describe('googleAuthService initialization', () => {
    let originalGoogle;

    beforeEach(async () => {
        vi.useFakeTimers();
        originalGoogle = globalThis.google;
        // Reset the module so the module-level `tokenClient` starts as null.
        vi.resetModules();
        // Re-import after resetModules so the new `tokenClient` is the one
        // touched by the test below.
        await importService();
        // Reset mock calls between tests.
        vi.mocked(mediaStore.showSnackbar).mockClear();
        vi.mocked(mediaStore.setGoogleUser).mockClear();
        vi.mocked(mediaStore.synchronizeWithDrive).mockClear();
        mediaStore.isGoogleAuthLoading = false;
    });

    afterEach(() => {
        // Restore the original `google` global.
        if (originalGoogle === undefined) {
            delete globalThis.google;
        } else {
            globalThis.google = originalGoogle;
        }
        vi.useRealTimers();
    });

    it('initializes the token client when the GSI library is available immediately', async () => {
        // Simulate GSI library already loaded at the time init runs.
        globalThis.google = {
            accounts: {
                oauth2: {
                    initTokenClient: vi.fn(() => ({ requestAccessToken: vi.fn() })),
                },
            },
        };

        const { initGoogleAuth } = await importService();
        await initGoogleAuth();

        expect(globalThis.google.accounts.oauth2.initTokenClient).toHaveBeenCalledTimes(1);
    });

    it('waits for the GSI library to load when it arrives after a delay', async () => {
        // GSI not loaded yet.
        delete globalThis.google;

        const { initGoogleAuth } = await importService();
        const initPromise = initGoogleAuth();

        // Advance time 2s with the GSI still missing so we exercise the
        // polling loop without resolving early.
        await vi.advanceTimersByTimeAsync(2000);

        // Inject the GSI library and tick the timer once more so the next
        // polling iteration detects it.
        globalThis.google = {
            accounts: {
                oauth2: {
                    initTokenClient: vi.fn(() => ({ requestAccessToken: vi.fn() })),
                },
            },
        };
        await vi.advanceTimersByTimeAsync(200);

        await initPromise;

        // The init must have waited for the library and then initialized.
        expect(globalThis.google.accounts.oauth2.initTokenClient).toHaveBeenCalledTimes(1);
    });

    it('logs an error and does not throw when the GSI library fails to load within the timeout', async () => {
        // GSI never loads.
        delete globalThis.google;

        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        const { initGoogleAuth } = await importService();
        const initPromise = initGoogleAuth();

        // Advance time past the new longer timeout to confirm the service
        // doesn't crash and doesn't initialize the client.
        await vi.advanceTimersByTimeAsync(15000);

        await initPromise;

        expect(consoleErrorSpy).toHaveBeenCalled();
        // The init client should NOT have been called because the GSI library never loaded.
        expect(mediaStore.setGoogleUser).not.toHaveBeenCalled();
        consoleErrorSpy.mockRestore();
    });
});

describe('googleAuthService.handleSignIn', () => {
    let originalGoogle;

    beforeEach(async () => {
        originalGoogle = globalThis.google;
        vi.mocked(mediaStore.showSnackbar).mockClear();
        mediaStore.isGoogleAuthLoading = false;
        // Reset the module so the module-level `tokenClient` starts as null
        // for every test in this block, regardless of test order.
        vi.resetModules();
        await importService();
    });

    afterEach(() => {
        if (originalGoogle === undefined) {
            delete globalThis.google;
        } else {
            globalThis.google = originalGoogle;
        }
    });

    it('shows a user-friendly error when the GSI library has not been loaded and cannot be initialized on demand', async () => {
        delete globalThis.google;

        const { handleSignIn } = await importService();
        handleSignIn();

        expect(mediaStore.showSnackbar).toHaveBeenCalled();
        // It should not have flipped the loading flag because there is nothing to wait for.
        expect(mediaStore.isGoogleAuthLoading).toBe(false);
    });

    it('lazily initializes the token client when called before initGoogleAuth has completed', async () => {
        // GSI is loaded but the service was never initialized (e.g. initGoogleAuth
        // was called when the library was not yet present).
        const requestAccessToken = vi.fn();
        globalThis.google = {
            accounts: {
                oauth2: {
                    initTokenClient: vi.fn(() => ({ requestAccessToken })),
                },
            },
        };

        const { handleSignIn } = await importService();
        handleSignIn();

        // The service should attempt to lazily initialize and then proceed
        // to request an access token.
        expect(globalThis.google.accounts.oauth2.initTokenClient).toHaveBeenCalled();
        expect(requestAccessToken).toHaveBeenCalled();
        expect(mediaStore.isGoogleAuthLoading).toBe(true);
    });

    it('falls back to window.__QUIX_GOOGLE_CLIENT_ID__ when the build-time client ID is empty', async () => {
        // Simulate an environment (e.g. Docker, preview) where the .env
        // was not available at build time so the build-time client ID
        // is empty, but the operator has injected one at runtime.
        //
        // We use vi.stubEnv to override the env, then vi.resetModules
        // so the service re-reads the env at module load time.
        vi.stubEnv('GOOGLE_CLIENT_ID', '');
        vi.resetModules();
        await importService();

        const requestAccessToken = vi.fn();
        const injectedClientId = 'runtime-injected.apps.googleusercontent.com';
        globalThis.window = globalThis.window || globalThis;
        globalThis.window.__QUIX_GOOGLE_CLIENT_ID__ = injectedClientId;
        globalThis.google = {
            accounts: {
                oauth2: {
                    initTokenClient: vi.fn(() => ({ requestAccessToken })),
                },
            },
        };

        const { handleSignIn } = await importService();
        handleSignIn();

        // The service should pick up the runtime-injected client ID
        // and successfully call requestAccessToken on the new client.
        expect(globalThis.google.accounts.oauth2.initTokenClient).toHaveBeenCalledTimes(1);
        const initArgs = globalThis.google.accounts.oauth2.initTokenClient.mock.calls[0][0];
        expect(initArgs.client_id).toBe(injectedClientId);
        expect(requestAccessToken).toHaveBeenCalled();
        expect(mediaStore.isGoogleAuthLoading).toBe(true);

        delete globalThis.window.__QUIX_GOOGLE_CLIENT_ID__;
        vi.unstubAllEnvs();
    });
});
