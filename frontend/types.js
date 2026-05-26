/**
 * @typedef {Object} MediaLink
 * @property {number} [id] - Auto-incrementing primary key from Dexie
 * @property {number} mediaId
 * @property {string} url
 * @property {string} label
 * @property {string} language - e.g., 'ITA', 'ENG', 'JPN'
 * @property {'sub'|'dub'} type - Subtitled or Dubbed
 * @property {boolean} [isValid] - Cached validity status from last validation
 */

/**
 * @typedef {Object} Episode
 * @property {number} id
 * @property {number} episode_number
 * @property {string} name
 * @property {string} overview
 * @property {string} still_path - URL to an image
 * @property {string} [video_url] - The first available URL for convenience
 * @property {MediaLink[]} [video_urls] - Array of all available links
 * @property {number} [intro_start_s] - Start time of intro in seconds
 * @property {number} [intro_end_s] - End time of intro in seconds
 */

/**
 * @typedef {Object} Season
 * @property {number} id
 * @property {number} season_number
 * @property {string} name
 * @property {number} episode_count
 * @property {Episode[]} episodes
 */

/**
 * @typedef {Object} MediaItem
 * @property {number} id
 * @property {string} title - For movies
 * @property {string} [name] - For TV series/anime
 * @property {string} overview
 * @property {string} poster_path
 * @property {string} backdrop_path
 * @property {number} vote_average
 * @property {string} [release_date] - For movies
 * @property {string} [first_air_date] - For TV series
 * @property {'movie'|'tv'} media_type
 * @property {Season[]} [seasons]
 * @property {string} [video_url]
 * @property {MediaLink[]} [video_urls]
 */

/**
 * @typedef {Object} PlayableItem
 * @property {number} startTime
 */

/**
 * @typedef {Object} ViewingHistoryItem
 * @property {number} showId
 * @property {number} episodeId
 * @property {number} watchedAt - timestamp
 */

/**
 * @typedef {Object} EpisodeProgress
 * @property {number} episodeId - Primary key
 * @property {number} currentTime
 * @property {number} duration
 * @property {boolean} watched
 * @property {number} [lastWatchedAt] - Timestamp of when the episode was last watched
 */

/**
 * @typedef {Object} ChatMessage
 * @property {string} id
 * @property {string} senderId
 * @property {string} senderName
 * @property {string} [text]
 * @property {string} [image] - base64 encoded image
 * @property {number} timestamp
 */

/**
 * @typedef {Object} GoogleUser
 * @property {string} name
 * @property {string} email
 * @property {string} picture
 * @property {string} accessToken
 * @property {string} [refreshToken]
 * @property {number} [tokenExpiry] - Unix timestamp when the token expires
 */

/**
 * @typedef {Object} SharedEpisodeLink
 * @property {number} seasonNumber
 * @property {number} episodeNumber
 * @property {string} url
 * @property {string} label
 * @property {string} language
 * @property {'sub'|'dub'} type
 */

/**
 * @typedef {Object} SharedShowData
 * @property {number} tmdbId
 * @property {SharedEpisodeLink[]} links
 */

/**
 * @typedef {Object} SharedLibraryData
 * @property {1} version
 * @property {SharedShowData[]} shows
 */

/**
 * @typedef {Object} Revision
 * @property {number} [id] - Auto-incremented primary key
 * @property {number} timestamp
 * @property {string} table
 * @property {*} key
 * @property {1|2|3} type - 1:create, 2:update, 3:delete
 * @property {*} [obj]
 * @property {*} [oldObj]
 * @property {string} [description] - Client-side properties for UI display
 * @property {'add'|'update'|'delete'|'unknown'} [icon]
 */

/**
 * @typedef {Object} ShowFilterPreference
 * @property {number} showId - Primary key
 * @property {string} [language]
 * @property {'sub'|'dub'} [type]
 */

/**
 * @typedef {Object} PreferredSource
 * @property {number} showId - Primary key
 * @property {string} origin - e.g., "https://srv18-acqua.sweetpixel.org"
 */

export {};
