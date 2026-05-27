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
            console.log("Auth popup was closed without completing login.");
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
        console.warn("No refresh token available for renewal.");
        return null;
    }

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
            console.error("Failed to refresh token:", errorData);
            return null;
        }

        const tokenData = await response.json();
        
        return {
            ...user,
            accessToken: tokenData.access_token,
            tokenExpiry: Date.now() + (tokenData.expires_in * 1000),
            // Optionally update refresh token if a new one is provided
            refreshToken: tokenData.refresh_token || user.refreshToken,
        };
    } catch (error) {
        console.error("Error during token refresh:", error);
        return null;
    }
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
        return;
    }

    // Calculate time until refresh is needed (5 minutes before expiry)
    const timeUntilRefresh = user.tokenExpiry - Date.now() - TOKEN_REFRESH_BUFFER_MS;
    
    if (timeUntilRefresh > 0) {
        console.log(`Scheduling token refresh in ${Math.round(timeUntilRefresh / 1000 / 60)} minutes.`);
        refreshTimer = window.setTimeout(async () => {
            console.log("Attempting to refresh access token...");
            const newUser = await refreshAccessToken(user);
            
            if (newUser) {
                // Save updated session
                localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newUser));
                await mediaStore.setGoogleUser(newUser);
                console.log("Access token refreshed successfully.");
                
                // Schedule next refresh
                scheduleTokenRefresh(newUser);
            } else {
                // Refresh failed, user will need to re-authenticate
                console.warn("Token refresh failed. User will need to sign in again.");
                mediaStore.showSnackbar("Session expired. Please sign in again.", "warning");
            }
        }, timeUntilRefresh);
    } else {
        // Token already needs refresh
        console.log("Token already expired or close to expiry. Attempting refresh...");
        refreshAccessToken(user).then((newUser) => {
            if (newUser) {
                localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newUser));
                mediaStore.setGoogleUser(newUser);
                scheduleTokenRefresh(newUser);
            }
        });
    }
};


const tryRestoringSession = async () => {
    const sessionData = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!sessionData) {
        return;
    }

    try {
        const user = JSON.parse(sessionData);
        if (!user || !user.accessToken) {
            throw new Error("Invalid session data in localStorage.");
        }

        // Check if token is expired or about to expire
        const now = Date.now();
        const isTokenExpired = user.tokenExpiry ? now >= user.tokenExpiry : true;
        const isTokenExpiringSoon = user.tokenExpiry ? now >= (user.tokenExpiry - TOKEN_REFRESH_BUFFER_MS) : false;

        if (isTokenExpired) {
            // Token is expired, try to use refresh token
            if (user.refreshToken) {
                console.log("Access token expired. Attempting to refresh...");
                const newUser = await refreshAccessToken(user);
                
                if (newUser) {
                    // Save refreshed session
                    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newUser));
                    await mediaStore.setGoogleUser(newUser);
                    scheduleTokenRefresh(newUser);
                    return;
                }
            }
            
            // Refresh failed or no refresh token available
            console.warn("Google session expired and could not be refreshed.");
            localStorage.removeItem(LOCAL_STORAGE_KEY);
            return;
        }

        // Token is valid (or expiring soon but we'll refresh it)
        // Validate by fetching user info if token is not about to expire
        if (!isTokenExpiringSoon) {
            const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: {'Authorization': `Bearer ${user.accessToken}`}
            });

            if (!response.ok) {
                // Token validation failed, try refresh
                if (user.refreshToken) {
                    console.log("Token validation failed. Attempting to refresh...");
                    const newUser = await refreshAccessToken(user);
                    
                    if (newUser) {
                        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newUser));
                        await mediaStore.setGoogleUser(newUser);
                        scheduleTokenRefresh(newUser);
                        return;
                    }
                }
                
                console.warn("Google session invalid and could not be refreshed.");
                localStorage.removeItem(LOCAL_STORAGE_KEY);
                return;
            }
        }

        // Token is valid (or we refreshed it)
        await mediaStore.setGoogleUser(user);
        scheduleTokenRefresh(user);
    } catch (error) {
        console.warn("Could not restore session:", error);
        // Clean up invalid data
        localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
};


export const initGoogleAuth = async () => {
    // If the client ID is not configured, skip all Google authentication logic.
    if (!GOOGLE_CLIENT_ID) {
        console.warn("Google Client ID is not configured. Skipping Google Auth initialization.");
        return;
    }

    if (typeof google === 'undefined' || typeof google.accounts === 'undefined') {
        // Wait a moment for the GSI script to load from index.html
        await new Promise(resolve => setTimeout(resolve, 500));
        if (typeof google === 'undefined' || typeof google.accounts === 'undefined') {
            console.error("Google Identity Services library still not loaded after delay.");
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
                        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(user));

                        await mediaStore.setGoogleUser(user);
                        
                        // Schedule automatic token refresh
                        scheduleTokenRefresh(user);
                        
                        // Trigger initial sync
                        await mediaStore.synchronizeWithDrive();

                    } catch (error) {
                        console.error("Error fetching user profile:", error);
                        mediaStore.showSnackbar("Failed to fetch user profile.", "error");
                    }
                } else {
                    console.error("Token response is missing access_token", tokenResponse);
                    mediaStore.showSnackbar("Authentication failed: No access token received.", "error");
                }
            },
            error_callback: (error) => {
                // Reset loading state
                mediaStore.isGoogleAuthLoading = false;
                stopPopupPolling();
                
                console.error("Google Auth Error:", error);
                mediaStore.showSnackbar(`Authentication Error: ${error.type}`, "error");
            }
        });
    } catch (error) {
        console.error("Failed to initialize Google Token Client:", error);
    }
};

export const handleSignIn = () => {
    if (!tokenClient) {
        console.error("Google Auth not initialized.");
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
            console.log("Cannot access popup window reference");
        }
        
        // Start checking interval
        authPopupCheckInterval = window.setInterval(checkAuthPopupClosed, 500);
    }, 100);
};

export const handleSignOut = () => {
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
            console.log('Access token revoked.');
        });
    }
    // Clear user data from the store
    mediaStore.setGoogleUser(null);
};

// Google Identity Services are loaded via script tag in index.html
// The google global object is available at runtime
