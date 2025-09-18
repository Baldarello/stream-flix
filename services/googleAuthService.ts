import { mediaStore } from '../store/mediaStore';
import type { GoogleUser } from '../types';

// This Client ID should be defined in a .env file for your project
// You can get one from the Google Cloud Console: https://console.cloud.google.com/apis/credentials
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const LOCAL_STORAGE_KEY = 'QUIX_GOOGLE_USER_SESSION';

let tokenClient: google.accounts.oauth2.TokenClient | null = null;


const tryRestoringSession = async () => {
  const sessionData = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!sessionData) {
    return;
  }

  try {
    const user: GoogleUser = JSON.parse(sessionData);
    if (!user || !user.accessToken) {
      throw new Error("Invalid session data in localStorage.");
    }

    // Validate token by fetching user info
    const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { 'Authorization': `Bearer ${user.accessToken}` }
    });

    if (response.ok) {
      // Token is valid, set user and then trigger sync
      await mediaStore.setGoogleUser(user);
      await mediaStore.synchronizeWithDrive();
    } else {
      // Token is invalid/expired
      throw new Error("Token validation failed.");
    }
  } catch (error) {
    console.warn("Could not restore session:", error);
    // Clean up invalid data
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  }
};


export const initGoogleAuth = async () => {
  if (typeof google === 'undefined' || typeof google.accounts === 'undefined') {
    // Wait a moment for the GSI script to load from index.html
    await new Promise(resolve => setTimeout(resolve, 500));
    if (typeof google === 'undefined' || typeof google.accounts === 'undefined') {
      console.error("Google Identity Services library still not loaded after delay.");
      return;
    }
  }
  
  if (!GOOGLE_CLIENT_ID) {
    console.error("Google Client ID is not configured. Please set process.env.GOOGLE_CLIENT_ID.");
    return;
  }
  
  // Attempt to restore session before initializing the client for new logins.
  // This now also handles the initial data sync.
  await tryRestoringSession();


  try {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/drive.file',
        callback: async (tokenResponse) => {
          if (tokenResponse && tokenResponse.access_token) {
            // Fetch user profile after getting the token
            try {
              const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { 'Authorization': `Bearer ${tokenResponse.access_token}` }
              });
              if (!response.ok) throw new Error('Failed to fetch user info');
              const profile = await response.json();
              
              const user: GoogleUser = {
                  name: profile.name,
                  email: profile.email,
                  picture: profile.picture,
                  accessToken: tokenResponse.access_token,
              };
              
              // Persist session to localStorage
              localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(user));
              
              await mediaStore.setGoogleUser(user);
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
  // Prompt the user to select an account and grant access
  tokenClient.requestAccessToken();
};

export const handleSignOut = () => {
    const user = mediaStore.googleUser;
    
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

// Define google types globally as they come from a script tag
// This avoids needing to install a full @types/google.accounts.id package
declare global {
  namespace google {
    namespace accounts {
      namespace id {
        function initialize(config: any): void;
        function renderButton(parent: HTMLElement, options: any): void;
        function prompt(): void;
      }
      namespace oauth2 {
        function initTokenClient(config: TokenClientConfig): TokenClient;
        function revoke(token: string, callback: () => void): void;
        interface TokenClient {
          requestAccessToken(overrideConfig?: { prompt: string }): void;
        }
        interface TokenClientConfig {
          client_id: string;
          scope: string;
          callback: (response: TokenResponse) => void;
          error_callback?: (error: any) => void;
        }
        interface TokenResponse {
          access_token: string;
          [key: string]: any;
        }
      }
    }
  }
}