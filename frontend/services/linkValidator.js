const LINK_CHECK_TIMEOUT = 5000; // 5 seconds

export class LinkValidationResult {
    constructor(valid, invalid) {
        this.valid = valid;
        this.invalid = invalid;
    }
}

export class InvalidLinkInfo {
    constructor(mediaId, episodeId, episodeName, seasonNumber, showName, showId, url, label, language, type) {
        this.mediaId = mediaId;
        this.episodeId = episodeId;
        this.episodeName = episodeName;
        this.seasonNumber = seasonNumber;
        this.showName = showName;
        this.showId = showId;
        this.url = url;
        this.label = label;
        this.language = language;
        this.type = type;
    }
}

/**
 * Check if a single link is valid by making a request through the backend API
 * This bypasses CORS issues that would occur with direct fetch from frontend
 */
export const checkLinkValidity = async (url) => {
    try {
        const response = await fetch('/api/validate-link', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({url}),
        });

        if (!response.ok) {
            console.warn('Link validation API error:', response.status);
            return false;
        }

        const result = await response.json();
        return result.isValid;
    } catch (error) {
        console.warn('Link validation failed:', url, error);
        return false;
    }
};

/**
 * Check all links for a single episode
 */
export const checkLinksForEpisode = async (links) => {
    const valid = [];
    const invalid = [];

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
export const checkLinksForShow = async (item, existingLinks) => {
    const invalidLinks = [];
    const linksToCheck = [];

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
