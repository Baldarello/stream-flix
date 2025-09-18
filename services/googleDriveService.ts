const DRIVE_API_URL = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files';
const BACKUP_FILENAME = 'quix_backup.json';
const FOLDER = 'appDataFolder'; // Special, hidden folder for app data

interface DriveFile {
    id: string;
    name: string;
}

// Helper to create common headers
const createHeaders = (accessToken: string) => ({
    'Authorization': `Bearer ${accessToken}`,
});

// 1. Find the backup file in the appDataFolder
export const findBackupFile = async (accessToken: string): Promise<DriveFile | null> => {
    const params = new URLSearchParams({
        q: `name='${BACKUP_FILENAME}' and trashed=false`,
        spaces: FOLDER,
        fields: 'files(id, name)',
    });
    const response = await fetch(`${DRIVE_API_URL}?${params}`, {
        headers: createHeaders(accessToken),
    });
    if (!response.ok) {
        console.error("Drive API Error (find file):", await response.json());
        throw new Error('Failed to search for backup file.');
    }

    const data = await response.json();
    return data.files.length > 0 ? data.files[0] : null;
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

// 3. Create a new backup file or update an existing one
export const writeBackupFile = async (accessToken: string, content: object, fileId: string | null = null): Promise<void> => {
    const metadata = {
        name: BACKUP_FILENAME,
        mimeType: 'application/json',
        // The parent folder is only specified on creation
        ...(fileId ? {} : { parents: [FOLDER] }),
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' }));

    const url = new URL(fileId ? `${DRIVE_UPLOAD_URL}/${fileId}` : DRIVE_UPLOAD_URL);
    url.searchParams.set('uploadType', 'multipart');

    const response = await fetch(url.toString(), {
        method: fileId ? 'PATCH' : 'POST',
        headers: createHeaders(accessToken),
        body: form,
    });

    if (!response.ok) {
        const errorData = await response.json();
        console.error("Google Drive API Error (write file):", errorData);
        throw new Error(`Failed to ${fileId ? 'update' : 'create'} backup file.`);
    }
};
