import type { SharedLibraryData } from '../types';

/**
 * Creates a self-contained shareable link from library data.
 * @param data The library data to share.
 * @returns A full URL string containing the encoded data.
 */
export const createShareLink = (data: SharedLibraryData): string => {
  try {
    const jsonString = JSON.stringify(data);
    const base64String = btoa(unescape(encodeURIComponent(jsonString))); // Handle UTF-8 characters
    const encodedData = encodeURIComponent(base64String);
    const baseUrl = `${window.location.origin}${window.location.pathname}`;
    return `${baseUrl}?importData=${encodedData}`;
  } catch (error) {
    console.error("Error creating share link:", error);
    return '';
  }
};

/**
 * Parses a share link and extracts the library data.
 * @param link The share link URL.
 * @returns The parsed SharedLibraryData object, or null if parsing fails.
 */
export const parseDataFromLink = (link: string): SharedLibraryData | null => {
  try {
    const url = new URL(link);
    const encodedData = url.searchParams.get('importData');
    if (!encodedData) return null;
    
    const base64String = decodeURIComponent(encodedData);
    const jsonString = decodeURIComponent(escape(atob(base64String))); // Handle UTF-8 characters
    const data = JSON.parse(jsonString);

    // Basic validation to ensure the data structure is correct
    if (data && data.version === 1 && Array.isArray(data.shows)) {
      return data as SharedLibraryData;
    }
    return null;
  } catch (error) {
    console.error("Failed to parse share link:", error);
    return null;
  }
};