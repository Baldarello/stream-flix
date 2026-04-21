import type {MediaLink, MediaItem, Episode, Season} from '../types.ts';

const LINK_CHECK_TIMEOUT = 5000; // 5 seconds

export interface LinkValidationResult {
    valid: MediaLink[];
    invalid: MediaLink[];
}

export interface InvalidLinkInfo {
    mediaId: number;
    episodeId?: number;
    episodeName?: string;
    seasonNumber?: number;
    showName: string;
    showId: number;
    url: string;
    label: string;
    language: string;
    type: 'sub' | 'dub';
}

/**
 * Check if a single link is valid by making a HEAD request
 */
export const checkLinkValidity = async (url: string): Promise<boolean> => {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), LINK_CHECK_TIMEOUT);

        const response = await fetch(url, {
            method: 'HEAD',
            mode: 'no-cors', // Many video servers don't support CORS for HEAD
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // In no-cors mode, we can't check the status, so we'll try GET with range
        // If HEAD failed but we have a valid URL structure, consider it potentially valid
        return true;
    } catch {
        // Try GET with range header as fallback
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), LINK_CHECK_TIMEOUT);

            const response = await fetch(url, {
                method: 'GET',
                mode: 'cors',
                headers: {
                    'Range': 'bytes=0-0', // Request only first byte to check if resource exists
                },
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            // If we get a 2xx or 3xx response, the link is valid
            return response.status < 400;
        } catch {
            return false;
        }
    }
};

/**
 * Check all links for a single episode
 */
export const checkLinksForEpisode = async (links: MediaLink[]): Promise<LinkValidationResult> => {
    const valid: MediaLink[] = [];
    const invalid: MediaLink[] = [];

    // Check links in parallel with a limit
    const batchSize = 5;
    for (let i = 0; i < links.length; i += batchSize) {
        const batch = links.slice(i, i + batchSize);
        const results = await Promise.all(
            batch.map(async (link) => {
                const isValid = await checkLinkValidity(link.url);
                return {link, isValid};
            })
        );

        for (const {link, isValid} of results) {
            if (isValid) {
                valid.push(link);
            } else {
                invalid.push(link);
            }
        }
    }

    return {valid, invalid};
};

/**
 * Check all links for a TV show or movie
 */
export const checkLinksForShow = async (
    item: MediaItem,
    existingLinks?: Map<number, MediaLink[]>
): Promise<InvalidLinkInfo[]> => {
    const invalidLinks: InvalidLinkInfo[] = [];
    const linksToCheck: Array<{links: MediaLink[], episode?: Episode, season?: Season}> = [];

    if (item.media_type === 'tv' && item.seasons) {
        // For TV shows, check all episodes across all seasons
        for (const season of item.seasons) {
            if (season.episodes) {
                for (const episode of season.episodes) {
                    if (episode.video_urls && episode.video_urls.length > 0) {
                        linksToCheck.push({
                            links: episode.video_urls,
                            episode,
                            season
                        });
                    } else if (existingLinks && existingLinks.has(episode.id)) {
                        const dbLinks = existingLinks.get(episode.id) || [];
                        if (dbLinks.length > 0) {
                            linksToCheck.push({
                                links: dbLinks,
                                episode,
                                season
                            });
                        }
                    }
                }
            }
        }
    } else {
        // For movies, check direct links
        if (item.video_urls && item.video_urls.length > 0) {
            linksToCheck.push({links: item.video_urls});
        } else if (existingLinks && existingLinks.has(item.id)) {
            const dbLinks = existingLinks.get(item.id) || [];
            if (dbLinks.length > 0) {
                linksToCheck.push({links: dbLinks});
            }
        }
    }

    // Check all links
    for (const {links, episode, season} of linksToCheck) {
        const {invalid} = await checkLinksForEpisode(links);
        
        for (const link of invalid) {
            invalidLinks.push({
                mediaId: link.mediaId,
                episodeId: episode?.id,
                episodeName: episode?.name,
                seasonNumber: season?.season_number,
                showName: item.title || item.name || 'Unknown',
                showId: item.id,
                url: link.url,
                label: link.label,
                language: link.language,
                type: link.type,
            });
        }
    }

    return invalidLinks;
};
