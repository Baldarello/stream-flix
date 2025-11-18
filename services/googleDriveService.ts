const DRIVE_API_URL = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files';
const BACKUP_FILE_PREFIX = 'quix_backup_';
const FOLDER = 'appDataFolder'; // Special, hidden folder for app data
const MAX_BACKUPS_TO_KEEP = 5;

export interface DriveFile {
    id: string;
    name: string;
}

// Helper to create common headers
const createHeaders = (accessToken: string) => ({
    'Authorization': `Bearer ${accessToken}`,
});

// 1. Find the latest backup file in the appDataFolder
export const findLatestBackupFile = async (accessToken: string): Promise<DriveFile | null> => {
    const params = new URLSearchParams({
        q: `name contains '${BACKUP_FILE_PREFIX}' and trashed=false`,
        spaces: FOLDER,
        fields: 'files(id, name, createdTime)',
        orderBy: 'createdTime desc', // Get the newest first
        pageSize: '1',
    });
    const response = await fetch(`${DRIVE_API_URL}?${params}`, {
        headers: createHeaders(accessToken),
    });
    if (!response.ok) {
        console.error("Drive API Error (find latest file):", await response.json());
        throw new Error('Failed to search for backup file.');
    }

    const data = await response.json();
    return data.files.length > 0 ? data.files[0] : null;
};

// New function to list all backup files for cleanup
export const listBackupFiles = async (accessToken: string): Promise<DriveFile[]> => {
    const params = new URLSearchParams({
        q: `name contains '${BACKUP_FILE_PREFIX}' and trashed=false`,
        spaces: FOLDER,
        fields: 'files(id, name, createdTime)',
        orderBy: 'createdTime desc', // Newest first
    });
    const response = await fetch(`${DRIVE_API_URL}?${params}`, {
        headers: createHeaders(accessToken),
    });
     if (!response.ok) {
        console.error("Drive API Error (list files):", await response.json());
        throw new Error('Failed to list backup files.');
    }
    const data = await response.json();
    return data.files;
};

// New function to delete old backups
export const deleteOldBackups = async (accessToken: string) => {
    const files = await listBackupFiles(accessToken);
    if (files.length <= MAX_BACKUPS_TO_KEEP) {
        return; // Nothing to delete
    }
    const filesToDelete = files.slice(MAX_BACKUPS_TO_KEEP);
    
    // Google Drive API does not support batch delete in v3 with a single HTTP request.
    // We must send one request per file.
    for (const file of filesToDelete) {
        await fetch(`${DRIVE_API_URL}/${file.id}?supportsAllDrives=true`, {
            method: 'DELETE',
            headers: createHeaders(accessToken),
        });
    }
};

// 2. Read the content of the backup file
export const readBackupFile = async (accessToken: string, fileId: string): Promise<any> => {
    const response = await fetch(`${DRIVE_API_URL}/${fileId}?alt=media`, {
        headers: createHeaders(accessToken),
    });
    if (!response.ok) {
        console.error("Drive API Error (read file):", await response.json());
        throw new Error('Failed to read backup file.');
    }
    return response.json();
};

// 3. Create a new backup file with a timestamp
export const writeBackupFile = async (accessToken: string, content: object): Promise<DriveFile> => {
    const timestamp = Date.now();
    const filename = `${BACKUP_FILE_PREFIX}${timestamp}.json`;
    
    const metadata = {
        name: filename,
        mimeType: 'application/json',
        parents: [FOLDER],
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' }));

    const url = new URL(DRIVE_UPLOAD_URL);
    url.searchParams.set('uploadType', 'multipart');
    url.searchParams.set('fields', 'id, name'); // Ask for the new file's ID and name back

    const response = await fetch(url.toString(), {
        method: 'POST',
        headers: createHeaders(accessToken),
        body: form,
    });

    if (!response.ok) {
        const errorData = await response.json();
        console.error("Google Drive API Error (write file):", errorData);
        throw new Error(`Failed to create backup file.`);
    }
    return response.json();
};

/**
 * Uploads a JSON file to the user's Google Drive, makes it public, and returns a direct download link.
 * @param accessToken The user's Google access token.
 * @param content The JSON object to upload.
 * @returns A promise that resolves to an object containing the direct download URL and the file ID.
 */
export const createPublicShareFile = async (accessToken: string, content: object): Promise<{ downloadUrl: string, fileId: string }> => {
    const timestamp = Date.now();
    const filename = `quix_share_${timestamp}.json`;
    
    // Step 1: Create the file in the user's root Drive folder
    const metadata = {
        name: filename,
        mimeType: 'application/json',
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', new Blob([JSON.stringify(content)], { type: 'application/json' }));

    const createResponse = await fetch(`${DRIVE_UPLOAD_URL}?uploadType=multipart&fields=id&supportsAllDrives=true`, {
        method: 'POST',
        headers: createHeaders(accessToken),
        body: form,
    });

    if (!createResponse.ok) {
        const errorData = await createResponse.json();
        console.error("Google Drive API Error (create share file):", errorData);
        throw new Error(`Failed to create share file.`);
    }
    
    const { id: fileId } = await createResponse.json();

    // Step 2: Make the file public (anyone with the link can read)
    const permissionBody = {
        'role': 'reader',
        'type': 'anyone'
    };

    const permissionResponse = await fetch(`${DRIVE_API_URL}/${fileId}/permissions?supportsAllDrives=true`, {
        method: 'POST',
        headers: {
            ...createHeaders(accessToken),
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(permissionBody)
    });

    if (!permissionResponse.ok) {
        const errorData = await permissionResponse.json();
        console.error("Google Drive API Error (set permission):", errorData);
        // Clean up by deleting the created file if permissions fail
        await fetch(`${DRIVE_API_URL}/${fileId}?supportsAllDrives=true`, { method: 'DELETE', headers: createHeaders(accessToken) });
        throw new Error('Failed to set file permissions to public.');
    }

    // Step 3: Construct and return the direct download URL
    const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;

    return { downloadUrl, fileId };
};