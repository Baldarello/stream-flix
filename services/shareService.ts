
import type { SharedLibraryData } from '../types';
import * as driveService from './googleDriveService';

/**
 * Creates a shareable link by uploading library data to Google Drive.
 * @param accessToken The user's Google access token.
 * @param data The library data to share.
 * @returns A promise that resolves to a full Quix URL containing the link to the public Drive file.
 */
export const createShareLink = async (accessToken: string, data: SharedLibraryData): Promise<string> => {
  try {
    const { downloadUrl } = await driveService.createPublicShareFile(accessToken, data);
    const baseUrl = `${window.location.origin}${window.location.pathname}`;
    return `${baseUrl}?importFromUrl=${encodeURIComponent(downloadUrl)}`;
  } catch (error) {
    console.error("Error creating share link:", error);
    // Re-throw to be caught by the UI component for user feedback
    throw error;
  }
};

/**
 * Parses a share link by fetching data from the embedded Google Drive URL.
 * @param link The share link URL (can be a Quix URL or a direct Google Drive link).
 * @returns A promise that resolves to the parsed SharedLibraryData object, or null if parsing fails.
 */
export const parseDataFromLink = async (link: string): Promise<SharedLibraryData | null> => {
  try {
    const url = new URL(link);
    // Extract the Google Drive URL from the 'importFromUrl' parameter, or use the link directly if it's a Drive URL.
    const dataUrl = url.searchParams.get('importFromUrl') || (url.hostname.includes('drive.google.com') ? link : null);

    if (!dataUrl) {
      console.warn("Link does not contain a valid import URL.");
      return null;
    }
    
    // Prepend a CORS proxy to the Google Drive URL to bypass browser restrictions.
    // The previous proxy (cors.eu.org) was being blocked by Google Drive, resulting in a 403 error.
    // This new proxy is an alternative to bypass CORS issues. The target URL must be encoded.
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(dataUrl)}`;

    const response = await fetch(proxyUrl);
    if (!response.ok) {
        // Provide a more specific error if the proxy itself fails
        if (response.status === 404 && response.url.includes('corsproxy.io')) {
             throw new Error(`Failed to fetch from proxy. The original URL might be invalid or unreachable.`);
        }
        throw new Error(`Failed to fetch library from URL. Status: ${response.status}`);
    }
    const data = await response.json();

    // Basic validation to ensure the fetched data has the correct structure.
    if (data && data.version === 1 && Array.isArray(data.shows)) {
      return data as SharedLibraryData;
    }
    console.warn("Fetched data has invalid format.", data);
    return null;
  } catch (error) {
    console.error("Failed to parse share link:", error);
    return null;
  }
};
