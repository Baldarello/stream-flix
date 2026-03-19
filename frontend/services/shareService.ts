import type {SharedLibraryData} from '../types';
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

    // Extract the Google Drive file ID from the URL
    const fileId = extractFileIdFromUrl(dataUrl);
    if (!fileId) {
      console.warn("Could not extract file ID from Google Drive URL.");
      return null;
    }

    // Call the Google Apps Script to fetch the file content from Google Drive
    const scriptUrl = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL;
    if (!scriptUrl) {
      console.error("Google Apps Script URL is not configured. Please set VITE_GOOGLE_APPS_SCRIPT_URL in your .env file.");
      return null;
    }

    const response = await fetch(`${scriptUrl}?action=getFile&fileId=${fileId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch library from Google Apps Script. Status: ${response.status}`);
    }
    const data = await response.json();

    // Check for error response from the Apps Script
    if (data.error) {
      console.error("Google Apps Script returned an error:", data.error);
      return null;
    }

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

/**
 * Extracts the Google Drive file ID from a Google Drive URL.
 * Supports URLs in the format:
 * - https://drive.google.com/uc?export=download&id=FILE_ID
 * - https://drive.google.com/file/d/FILE_ID/view
 * - https://drive.google.com/open?id=FILE_ID
 * @param driveUrl The Google Drive URL.
 * @returns The file ID if found, otherwise null.
 */
function extractFileIdFromUrl(driveUrl: string): string | null {
  try {
    const url = new URL(driveUrl);
    // Check for 'id' query parameter (e.g., uc?export=download&id=FILE_ID)
    const idParam = url.searchParams.get('id');
    if (idParam) {
      return idParam;
    }
    // Check for 'id' path parameter (e.g., /file/d/FILE_ID/view or /open?id=FILE_ID)
    const pathMatch = url.pathname.match(/\/\/drive\.google\.com\/.*?\/(?:file\/d|open|uc)\??.*id=([^&\/]+)/);
    if (pathMatch) {
      return pathMatch[1];
    }
    // Fallback: check path segments for known patterns
    const segments = url.pathname.split('/').filter(Boolean);
    const idIndex = segments.indexOf('d');
    if (idIndex !== -1 && segments[idIndex + 1]) {
      return segments[idIndex + 1];
    }
    return null;
  } catch {
    return null;
  }
}
