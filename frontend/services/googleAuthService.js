import {mediaStore} from '../store/mediaStore';


// This Client ID should be defined in a .env file for your project
// You can get one from the Google Cloud Console: https://console.cloud.google.com/apis/credentials
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
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
                client_id: GOOGLE_CLIENT_ID,
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


export const initGoogleAuth = async () => {
    console.log("[GoogleAuth] Initializing Google Auth...");
    
    // If the client ID is not configured, skip all Google authentication logic.
    if (!GOOGLE_CLIENT_ID) {
        console.warn("[GoogleAuth] Google Client ID is not configured. Skipping Google Auth initialization.");
        return;
    }

    if (typeof google === 'undefined' || typeof google.accounts === 'undefined') {
        // Wait a moment for the GSI script to load from index.html
        await new Promise(resolve => setTimeout(resolve, 500));
        if (typeof google === 'undefined' || typeof google.accounts === 'undefined') {
            console.error("[GoogleAuth] Google Identity Services library still not loaded after delay.");
            return;
        }
    }

    // Attempt to restore session before initializing the client for new logins.
    await tryRestoringSession();


    try {
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CLIENT_ID,
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
    }
};

export const handleSignIn = () => {
    console.log("[GoogleAuth] handleSignIn called");
    
    if (!tokenClient) {
        console.error("[GoogleAuth] Google Auth not initialized.");
        mediaStore.showSnackbar("Google Authentication is not ready.", "error");
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
