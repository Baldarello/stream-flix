import {mediaStore} from '../store/mediaStore';


// This Client ID should be defined in a .env file for your project
// You can get one from the Google Cloud Console: https://console.cloud.google.com/apis/credentials
//
// We read it in this order of preference so the same code works whether
// the value is baked in at build time (`process.env.GOOGLE_CLIENT_ID`
// replaced by Vite, or `import.meta.env.GOOGLE_CLIENT_ID` exposed by
// Vite's native env handling) or supplied at runtime (useful for
// Docker / preview environments where the .env is not available at
// build time and the operator injects the value into `window`).
const BUILD_TIME_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || import.meta.env?.GOOGLE_CLIENT_ID || '';

/**
 * Resolves the Google OAuth client ID at runtime, falling back to a
 * window-level injection if the build-time value is empty. This lets
 * operators set the value via a `<script>` tag, a reverse proxy
 * response header, or devtools without rebuilding the app.
 *
 * @returns {string} The resolved client ID, or an empty string if none
 * is configured.
 */
const resolveGoogleClientId = () => {
    if (BUILD_TIME_CLIENT_ID) {
        return BUILD_TIME_CLIENT_ID;
    }
    if (typeof window !== 'undefined' && typeof window.__QUIX_GOOGLE_CLIENT_ID__ === 'string') {
        return window.__QUIX_GOOGLE_CLIENT_ID__;
    }
    return '';
};

const LOCAL_STORAGE_KEY = 'QUIX_GOOGLE_USER_SESSION';

let tokenClient = null;
let refreshTimer = null;
let authPopup = null;
let authPopupCheckInterval = null;

// Token refresh interval (in milliseconds) - refresh 5 minutes before expiry
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000; // 5 minutes

// Retry configuration for token refresh
const TOKEN_REFRESH_MAX_RETRIES = 3;
const TOKEN_REFRESH_RETRY_DELAYS = [1000, 2000, 4000]; // Exponential backoff: 1s, 2s, 4s

// Configuration for waiting on the Google Identity Services (GSI) script.
// The GSI library is loaded via a `<script async defer>` tag in index.html
// and may take longer than a few hundred milliseconds to download on slow
// networks. We poll for the global for up to `GSI_LOAD_TIMEOUT_MS` so
// initialization does not silently fail when the user is on a slow
// connection or the script is delayed by other network traffic.
const GSI_LOAD_TIMEOUT_MS = 10000; // 10 seconds
const GSI_LOAD_POLL_INTERVAL_MS = 100; // 100ms

/**
 * Returns true when the Google Identity Services library has finished
 * loading and is available on the global `google` object.
 */
const isGsiLibraryLoaded = () => {
    return typeof google !== 'undefined'
        && typeof google.accounts !== 'undefined'
        && typeof google.accounts.oauth2 !== 'undefined';
};

/**
 * Resolves `true` once the GSI library is detected, or `false` if it
 * does not become available within `timeoutMs`.
 *
 * Uses iteration count instead of `Date.now()` so the function works
 * correctly with fake test timers (which mock `setInterval` but not
 * `Date.now()` by default).
 */
const waitForGsiLibrary = (timeoutMs = GSI_LOAD_TIMEOUT_MS) => {
    return new Promise((resolve) => {
        if (isGsiLibraryLoaded()) {
            resolve(true);
            return;
        }
        const maxIterations = Math.ceil(timeoutMs / GSI_LOAD_POLL_INTERVAL_MS);
        let iteration = 0;
        const interval = setInterval(() => {
            iteration++;
            if (isGsiLibraryLoaded()) {
                clearInterval(interval);
                resolve(true);
            } else if (iteration >= maxIterations) {
                clearInterval(interval);
                resolve(false);
            }
        }, GSI_LOAD_POLL_INTERVAL_MS);
    });
};

/**
 * Stops the popup polling interval and cleans up.
 */
const stopPopupPolling = () => {
    if (authPopupCheckInterval) {
        clearInterval(authPopupCheckInterval);
        authPopupCheckInterval = null;
    }
    authPopup = null;
};

/**
 * Check if the auth popup has been closed without completing login.
 * Called periodically after the OAuth popup is opened.
 */
const checkAuthPopupClosed = () => {
    // If popup was already closed by callback (success or error), stop checking
    if (!authPopup || authPopup.closed) {
        stopPopupPolling();
        
        // If we still have the loading flag set, it means no callback was triggered
        // (user closed the popup without completing login)
        if (mediaStore.isGoogleAuthLoading) {
            console.log("[GoogleAuth] Auth popup was closed without completing login.");
            mediaStore.isGoogleAuthLoading = false;
        }
    }
};

/**
 * Attempts to refresh the access token using the stored refresh token.
 * @returns A new GoogleUser object with the new access token, or null if refresh failed.
 */
const refreshAccessToken = async (user) => {
    if (!user.refreshToken) {
        console.warn("[GoogleAuth] No refresh token available for renewal.");
        return null;
    }

    console.log("[GoogleAuth] Attempting to refresh access token...");

    try {
        // Use Google's token endpoint to exchange refresh token for new access token
        const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                client_id: resolveGoogleClientId(),
                grant_type: 'refresh_token',
                refresh_token: user.refreshToken,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error("[GoogleAuth] Failed to refresh token:", errorData);
            return null;
        }

        const tokenData = await response.json();
        console.log("[GoogleAuth] Token refresh successful. New token expires in:", tokenData.expires_in, "seconds");
        
        return {
            ...user,
            accessToken: tokenData.access_token,
            tokenExpiry: Date.now() + (tokenData.expires_in * 1000),
            // Optionally update refresh token if a new one is provided
            refreshToken: tokenData.refresh_token || user.refreshToken,
        };
    } catch (error) {
        console.error("[GoogleAuth] Error during token refresh:", error);
        return null;
    }
};

/**
 * Attempts to refresh the access token with exponential backoff retry logic.
 * @param {Object} user - The user object containing the refresh token
 * @returns A new GoogleUser object with the new access token, or null if all retries failed.
 */
const refreshAccessTokenWithRetry = async (user) => {
    let lastError = null;
    
    for (let attempt = 0; attempt < TOKEN_REFRESH_MAX_RETRIES; attempt++) {
        console.log(`[GoogleAuth] Token refresh attempt ${attempt + 1} of ${TOKEN_REFRESH_MAX_RETRIES}`);
        
        const result = await refreshAccessToken(user);
        
        if (result) {
            return result;
        }
        
        lastError = "Token refresh returned null";
        
        // If not the last attempt, wait before retrying
        if (attempt < TOKEN_REFRESH_MAX_RETRIES - 1) {
            const delay = TOKEN_REFRESH_RETRY_DELAYS[attempt];
            console.log(`[GoogleAuth] Token refresh failed, retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    
    console.error(`[GoogleAuth] Token refresh failed after ${TOKEN_REFRESH_MAX_RETRIES} attempts. Last error:`, lastError);
    return null;
};


/**
 * Checks if the token needs to be refreshed and schedules a refresh if needed.
 */
const scheduleTokenRefresh = (user) => {
    // Clear any existing refresh timer
    if (refreshTimer !== null) {
        clearTimeout(refreshTimer);
        refreshTimer = null;
    }

    if (!user.refreshToken || !user.tokenExpiry) {
        // No refresh token available, token will expire naturally
        console.log("[GoogleAuth] No refresh token or expiry. Token will expire naturally.");
        return;
    }

    // Calculate time until refresh is needed (5 minutes before expiry)
    const timeUntilRefresh = user.tokenExpiry - Date.now() - TOKEN_REFRESH_BUFFER_MS;
    
    if (timeUntilRefresh > 0) {
        console.log(`[GoogleAuth] Scheduling token refresh in ${Math.round(timeUntilRefresh / 1000 / 60)} minutes.`);
        refreshTimer = window.setTimeout(async () => {
            console.log("[GoogleAuth] Token refresh timer triggered. Attempting to refresh access token...");
            const newUser = await refreshAccessTokenWithRetry(user);
            
            if (newUser) {
                // Save updated session
                localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newUser));
                await mediaStore.setGoogleUser(newUser);
                console.log("[GoogleAuth] Access token refreshed successfully via scheduled refresh.");
                
                // Schedule next refresh
                scheduleTokenRefresh(newUser);
            } else {
                // Refresh failed, user will need to re-authenticate
                console.warn("[GoogleAuth] Token refresh failed after all retries. User will need to sign in again.");
                mediaStore.showSnackbar("Session expired. Please sign in again.", "warning");
            }
        }, timeUntilRefresh);
    } else {
        // Token already needs refresh
        console.log("[GoogleAuth] Token already expired or close to expiry. Attempting immediate refresh...");
        refreshAccessTokenWithRetry(user).then((newUser) => {
            if (newUser) {
                localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newUser));
                mediaStore.setGoogleUser(newUser);
                scheduleTokenRefresh(newUser);
            }
        });
    }
};


const tryRestoringSession = async () => {
    console.log("[GoogleAuth] Attempting to restore Google session...");
    
    const sessionData = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!sessionData) {
        console.log("[GoogleAuth] No session data found in localStorage.");
        return;
    }

    console.log("[GoogleAuth] Session data found in localStorage. Parsing...");

    try {
        const user = JSON.parse(sessionData);
        if (!user || !user.accessToken) {
            throw new Error("Invalid session data in localStorage.");
        }

        console.log("[GoogleAuth] Session data parsed successfully. User:", user.email);

        // Check if token is expired or about to expire
        const now = Date.now();
        const isTokenExpired = user.tokenExpiry ? now >= user.tokenExpiry : true;
        const isTokenExpiringSoon = user.tokenExpiry ? now >= (user.tokenExpiry - TOKEN_REFRESH_BUFFER_MS) : false;

        console.log(`[GoogleAuth] Token status - Expired: ${isTokenExpired}, Expiring Soon: ${isTokenExpiringSoon}`);

        if (isTokenExpired) {
            // Token is expired, try to use refresh token
            if (user.refreshToken) {
                console.log("[GoogleAuth] Access token expired. Attempting to refresh with retry logic...");
                const newUser = await refreshAccessTokenWithRetry(user);
                
                if (newUser) {
                    // Save refreshed session
                    console.log("[GoogleAuth] Session restored successfully via refresh.");
                    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newUser));
                    await mediaStore.setGoogleUser(newUser);
                    scheduleTokenRefresh(newUser);
                    return;
                }
                
                console.warn("[GoogleAuth] Token refresh failed after all retries.");
            } else {
                console.warn("[GoogleAuth] No refresh token available.");
            }
            
            // Refresh failed or no refresh token available
            console.warn("[GoogleAuth] Google session expired and could not be refreshed.");
            localStorage.removeItem(LOCAL_STORAGE_KEY);
            return;
        }

        // Token is valid (or expiring soon but we'll refresh it)
        // Validate by fetching user info if token is not about to expire
        if (!isTokenExpiringSoon) {
            console.log("[GoogleAuth] Validating token with Google API...");
            const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: {'Authorization': `Bearer ${user.accessToken}`}
            });

            if (!response.ok) {
                // Token validation failed, try refresh
                console.log("[GoogleAuth] Token validation failed. Status:", response.status);
                if (user.refreshToken) {
                    console.log("[GoogleAuth] Attempting to refresh token...");
                    const newUser = await refreshAccessTokenWithRetry(user);
                    
                    if (newUser) {
                        console.log("[GoogleAuth] Session restored after failed validation.");
                        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newUser));
                        await mediaStore.setGoogleUser(newUser);
                        scheduleTokenRefresh(newUser);
                        return;
                    }
                }
                
                console.warn("[GoogleAuth] Google session invalid and could not be refreshed.");
                localStorage.removeItem(LOCAL_STORAGE_KEY);
                return;
            }
            
            console.log("[GoogleAuth] Token validated successfully with Google API.");
        } else {
            console.log("[GoogleAuth] Token is expiring soon. Skipping validation, will refresh proactively.");
        }

        // Token is valid (or we refreshed it)
        console.log("[GoogleAuth] Restoring session for user:", user.email);
        await mediaStore.setGoogleUser(user);
        scheduleTokenRefresh(user);
    } catch (error) {
        console.warn("[GoogleAuth] Could not restore session:", error);
        // Clean up invalid data
        localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
};


/**
 * Creates the Google OAuth2 token client. Returns `null` if the GSI
 * library has not been loaded or no client ID can be resolved.
 */
const createTokenClient = () => {
    // Re-resolve on every call so a runtime-injected client ID
    // (e.g. via `window.__QUIX_GOOGLE_CLIENT_ID__`) is picked up
    // even if the build-time value is empty.
    const clientId = resolveGoogleClientId();
    if (!clientId) {
        return null;
    }
    if (!isGsiLibraryLoaded()) {
        return null;
    }
    try {
        return google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: [
                'https://www.googleapis.com/auth/drive.appdata',
                'https://www.googleapis.com/auth/drive.file',
                'https://www.googleapis.com/auth/userinfo.profile',
                'https://www.googleapis.com/auth/userinfo.email'
            ].join(' '),
            // prompt: 'consent' ensures we get a refresh token for persistent sessions
            prompt: 'consent',
            callback: async (tokenResponse) => {
                // Reset loading state
                mediaStore.isGoogleAuthLoading = false;
                stopPopupPolling();

                console.log("[GoogleAuth] Token response received:", {
                    hasAccessToken: !!tokenResponse?.access_token,
                    hasRefreshToken: !!tokenResponse?.refresh_token,
                    expiresIn: tokenResponse?.expires_in,
                    error: tokenResponse?.error
                });

                if (tokenResponse && tokenResponse.access_token) {
                    // Fetch user profile after getting the token
                    try {
                        const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                            headers: {'Authorization': `Bearer ${tokenResponse.access_token}`}
                        });
                        if (!response.ok) throw new Error('Failed to fetch user info');
                        const profile = await response.json();

                        // Calculate token expiry time (typically 1 hour = 3600 seconds)
                        const expiresIn = tokenResponse.expires_in || 3600;
                        const tokenExpiry = Date.now() + (expiresIn * 1000);

                        const user = {
                            name: profile.name,
                            email: profile.email,
                            picture: profile.picture,
                            accessToken: tokenResponse.access_token,
                            // Store refresh token for session persistence
                            refreshToken: tokenResponse.refresh_token,
                            tokenExpiry: tokenExpiry,
                        };

                        // Persist session to localStorage
                        console.log("[GoogleAuth] Saving session to localStorage. User:", user.email, "Token expires in:", tokenResponse.expires_in, "seconds");
                        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(user));

                        await mediaStore.setGoogleUser(user);

                        // Schedule automatic token refresh
                        scheduleTokenRefresh(user);

                        // Trigger initial sync
                        await mediaStore.synchronizeWithDrive();

                    } catch (error) {
                        console.error("[GoogleAuth] Error fetching user profile:", error);
                        mediaStore.showSnackbar("Failed to fetch user profile.", "error");
                    }
                } else {
                    console.error("[GoogleAuth] Token response is missing access_token", tokenResponse);
                    mediaStore.showSnackbar("Authentication failed: No access token received.", "error");
                }
            },
            error_callback: (error) => {
                // Reset loading state
                mediaStore.isGoogleAuthLoading = false;
                stopPopupPolling();

                console.error("[GoogleAuth] Google Auth Error:", error);
                mediaStore.showSnackbar(`Authentication Error: ${error.type}`, "error");
            }
        });
    } catch (error) {
        console.error("[GoogleAuth] Failed to initialize Google Token Client:", error);
        return null;
    }
};

export const initGoogleAuth = async () => {
    console.log("[GoogleAuth] Initializing Google Auth...");

    // If the client ID is not configured, skip all Google authentication logic.
    const clientId = resolveGoogleClientId();
    if (!clientId) {
        console.warn(
            "[GoogleAuth] Google Client ID is not configured (set GOOGLE_CLIENT_ID in .env or window.__QUIX_GOOGLE_CLIENT_ID__ at runtime). Skipping Google Auth initialization."
        );
        return;
    }

    // Wait for the GSI script to load. The script is loaded with
    // `async defer` in index.html so it may complete after React has
    // mounted, especially on slow networks. Polling for up to
    // GSI_LOAD_TIMEOUT_MS gives the script a fair chance to load.
    if (!isGsiLibraryLoaded()) {
        console.log("[GoogleAuth] Google Identity Services library not yet loaded, waiting up to", GSI_LOAD_TIMEOUT_MS, "ms...");
        const loaded = await waitForGsiLibrary();
        if (!loaded) {
            console.error("[GoogleAuth] Google Identity Services library failed to load within", GSI_LOAD_TIMEOUT_MS, "ms. Sign-in will not work until the script is available.");
            return;
        }
        console.log("[GoogleAuth] Google Identity Services library loaded.");
    }

    // Attempt to restore session before initializing the client for new logins.
    await tryRestoringSession();

    // Initialize the token client for fresh sign-ins.
    tokenClient = createTokenClient();
    if (!tokenClient) {
        console.error("[GoogleAuth] Failed to create Google Token Client. The GSI library may not expose oauth2.");
    }
};

export const handleSignIn = () => {
    console.log("[GoogleAuth] handleSignIn called");

    // Lazily initialize the token client if it isn't ready. The GSI
    // library may have finished loading after `initGoogleAuth` returned,
    // so we try to create the client on demand when it's available.
    // We intentionally do NOT wait for the library here: that would
    // block the user interaction for up to 10 seconds with no feedback.
    if (!tokenClient && isGsiLibraryLoaded()) {
        console.log("[GoogleAuth] Token client missing but GSI is available, creating it on demand.");
        tokenClient = createTokenClient();
    }

    if (!tokenClient) {
        // Use the same resolution path as `createTokenClient` so the
        // snackbar/console messages are consistent with what would
        // have actually happened if we had tried to create the client.
        const clientId = resolveGoogleClientId();
        const reason = !clientId
            ? "Google Client ID is not configured. Set GOOGLE_CLIENT_ID in .env or define window.__QUIX_GOOGLE_CLIENT_ID__ before the app loads."
            : !isGsiLibraryLoaded()
                ? "Google Identity Services script is still loading. Please try again in a moment."
                : "Google Token Client could not be created.";
        console.error(`[GoogleAuth] Google Auth not initialized: ${reason}`);
        mediaStore.showSnackbar(reason, "error");
        return;
    }
    
    // Set loading state to show app loading screen
    mediaStore.isGoogleAuthLoading = true;
    
    // Prompt the user to select an account and grant access
    tokenClient.requestAccessToken();
    
    // Start polling to detect if popup is closed without completing login
    // Give a small delay for the popup to open
    setTimeout(() => {
        // Try to get reference to the popup window (may not always work due to browser security)
        try {
            // Most browsers will have the popup as the most recently focused window
            authPopup = window;
        } catch (e) {
            console.log("[GoogleAuth] Cannot access popup window reference");
        }
        
        // Start checking interval
        authPopupCheckInterval = window.setInterval(checkAuthPopupClosed, 500);
    }, 100);
};

export const handleSignOut = () => {
    console.log("[GoogleAuth] handleSignOut called");
    
    const user = mediaStore.googleUser;

    // Clear any scheduled refresh timers
    if (refreshTimer !== null) {
        clearTimeout(refreshTimer);
        refreshTimer = null;
    }

    // Clear the persisted session
    localStorage.removeItem(LOCAL_STORAGE_KEY);

    if (user?.accessToken) {
        // Revoke the token to sever the connection
        google.accounts.oauth2.revoke(user.accessToken, () => {
            console.log('[GoogleAuth] Access token revoked.');
        });
    }
    // Clear user data from the store
    mediaStore.setGoogleUser(null);
};

// Google Identity Services are loaded via script tag in index.html
// The google global object is available at runtime
