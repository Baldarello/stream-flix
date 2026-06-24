export const en = {
    "common": {
        "close": "Close",
        "loading": "Loading..."
    },
    "header": {
        "home": "Home",
        "series": "TV Series",
        "movies": "Movies",
        "anime": "Anime",
        "searchPlaceholder": "Search titles..."
    },
    "hero": {
        "play": "Play",
        "moreInfo": "More Info"
    },
    "contentRow": {
        "scrollLeft": "scroll left",
        "scrollRight": "scroll right",
        "editOrder": "Edit order",
        "reorderInstructions": "Drag items to reorder, or use the arrows",
        "saveOrder": "Save order",
        "openDetail": "Open the detail screen"
    },
    "myListDetail": {
        "title": "My List",
        "subtitle": "{count, plural, one {# saved item} other {# saved items}}",
        "subtitle_one": "{count} saved item",
        "subtitle_other": "{count} saved items",
        "searchPlaceholder": "Search your list…",
        "reorderOn": "Reorder mode",
        "reorderOff": "Exit reorder mode",
        "removeTooltip": "Remove from list",
        "emptyTitle": "Your list is empty",
        "emptySubtitle": "Add movies and TV shows to see them here.",
        "emptyCta": "Explore the catalog",
        "stats": {
            "total": "Total: {count}",
            "movies": "Movies: {count}",
            "series": "TV Series: {count}"
        },
        "filter": {
            "all": "All",
            "movie": "Movies",
            "tv": "TV Series"
        },
        "sort": {
            "recent": "Most recent",
            "title": "Title (A-Z)",
            "edited": "Last edited"
        }
    },
    "card": {
        "detailsFor": "View details for {title}",
        "removeFromList": "Remove from My List",
        "addToList": "Add to My List",
        "removeFromContinueWatching": "Remove from Continue Watching",
        "moveToTop": "Move to top",
        "moveToBottom": "Move to bottom"
    },
    "detail": {
        "close": "Close detail",
        "seasons": "Seasons",
        "vote": "Vote",
        "play": "Play",
        "removeFromList": "Remove from My List",
        "addToList": "Add to My List",
        "watchTogether": "Watch Together",
        "episodes": "Episodes",
        "linkEpisodesTooltip": "Link video files",
        "introDuration": "Intro Duration",
        "season": "Season",
        "scrollEpisodesLeft": "scroll episodes left",
        "scrollEpisodesRight": "scroll episodes right",
        "markAsWatched": "Mark as watched",
        "markAsUnwatched": "Mark as unwatched",
        "filterLanguage": "Language",
        "filterType": "Type",
        "episodeDetails": "Episode details",
        "episode": "Episode",
        "availableIn": "Available in",
        "playEpisode": "Play Episode"
    },
    "gridView": {
        "myListTitle": "My List",
        "searchResultsFor": "Results for \"{query}\"",
        "seriesTitle": "TV Series",
        "moviesTitle": "Movies",
        "animeTitle": "Anime",
        "empty": {
            "default": {
                "title": "No content available",
                "subtitle": "Check back later for new content."
            },
            "myList": {
                "title": "Your list is empty",
                "subtitle": "Add movies and TV shows to see them here."
            },
            "search": {
                "title": "No results found",
                "subtitle": "Try searching for something else or check your spelling."
            }
        }
    },
    "videoPlayer": {
        "back": "back",
        "nextEpisode": "Next Episode",
        "episodeList": "Episode List",
        "skipIntro": "Skip Intro",
        "playbackSpeed": "Playback Speed",
        "downloadVideo": "Download Video",
        "skipBack10": "Rewind 10s",
        "forward10": "Forward 10s"
    },
    "episodesDrawer": {
        "title": "Episodes",
        "season": "Season {number}",
        "markWatched": "Watched",
        "markUnwatched": "Unwatched",
        "details": "Details",
        "availableLanguages": "Available Languages",
        "airDate": "Air Date",
        "runtime": "Runtime",
        "episode": "Episode",
        "empty": "No episodes available for this season."
    },
    "linkMovieModal": {
        "title": "Link Videos for {title}",
        "addLink": "Add Link",
        "url": "URL",
        "label": "Label (optional)",
        "add": "Add",
        "noLinks": "No video links associated with this movie.",
        "deleteLink": "Delete Link",
        "language": "Language",
        "type": "Type",
        "sub": "Subtitled",
        "dub": "Dubbed"
    },
    "linkEpisodesModal": {
        "title": "Link Episodes for {name}",
        "selectSeason": "Select season",
        "addLinks": "Add Links",
        "manageLinks": "Manage Links",
        "add": {
            "pattern": "Pattern",
            "list": "List",
            "json": "JSON",
            "save": "Add Links",
            "patternInfo": "Use [@EP] as a placeholder for the episode number. It will be replaced for each episode in the season.",
            "patternUrl": "Pattern URL",
            "linkLabel": "Link Label (optional)",
            "linkLabelHelper": "Use [@EP] here too. Ex: ENG SUB - Ep. [@EP]",
            "padding": "Episode number padding",
            "paddingHelper": "E.g., 2 for '01', 3 for '001'",
            "listInfo": "Paste a list of links, one per line. The number of links must match the number of episodes ({count}).",
            "listLinks": "List of links",
            "jsonInfo": "Paste a JSON array of strings (links) or objects (e.g., {\"url\": \"...\", \"label\": \"...\", \"language\": \"ENG\", \"type\": \"dub\"}).",
            "jsonArray": "JSON Array",
            "jsonPlaceholder": "[ \"http://link1.mp4\", \"http://link2.mp4\" ]",
            "advancedConfig": "Advanced configuration",
            "startEpisode": "From episode",
            "endEpisode": "To episode",
            "startNumberPlaceholder": "Start number for [@EP]",
            "endNumberPlaceholder": "End number for [@EP]",
            "language": "Language",
            "type": "Type",
            "sub": "Subtitled",
            "dub": "Dubbed",
            "method": "Method",
            "errors": {
                "emptyPattern": "The pattern cannot be empty.",
                "missingPlaceholder": "The pattern must include the [@EP] placeholder.",
                "emptyList": "The list cannot be empty.",
                "emptyJson": "The JSON cannot be empty."
            },
            "preview": {
                "title": "Generated URL preview",
                "empty": "Fill in the pattern to see the preview.",
                "more": "and {count} more…"
            }
        },
        "manage": {
            "deleteAllSeasonLinks": "Delete all links for this season",
            "linksCount": "Links: {count}",
            "noLinks": "No associated links.",
            "copyUrl": "Copy URL",
            "deleteLink": "Delete Link",
            "groupOps": "Group Operations",
            "groupOpsInfo": "Bulk edit the domain for all links that share the same origin.",
            "linksFrom": "{count} links from:",
            "newDomain": "New Domain/Origin",
            "update": "Update",
            "setAsPreferred": "Set as preferred source",
            "removePreferred": "Remove preference",
            "editLink": "Edit Link",
            "save": "Save",
            "cancel": "Cancel",
            "deleteAllFromDomainTooltip": "Delete all links from this domain",
            "deleteAllFromDomainConfirm": "Are you sure you want to delete all {count} links from {domain}?"
        }
    },
    "linkSelectionModal": {
        "title": "Ep {episode}: {name}",
        "defaultTitle": "Select a link",
        "subtitle": "Choose which link to play:"
    },
    "profileDrawer": {
        "profile": "Profile",
        "backup": "Backup to Google Drive",
        "restore": "Restore from Google Drive",
        "logout": "Logout",
        "login": "Sign in with Google",
        "scanQR": "Scan TV QR Code",
        "showQR": "Show QR for Remote",
        "language": "Language",
        "library": "Library",
        "share": "Share Library",
        "import": "Import Library",
        "history": "Change History",
        "manageLibrary": "Manage Library",
        "savedDevices": "Saved TV Devices",
        "noSavedDevices": "No saved TV devices found.",
        "connect": "Connect",
        "editName": "Edit Name",
        "forgetDevice": "Forget Device",
        "save": "Save",
        "cancel": "Cancel",
        "online": "Online",
        "offline": "Offline",
        "changeName": "Change Name"
    },
    "qrScanner": {
        "close": "Close scanner",
        "title": "Point your camera at the QR Code on the TV",
        "error": "Invalid QR code. Make sure you are scanning the code shown on the TV.",
        "or": "OR",
        "enterCode": "Enter TV Code",
        "connect": "Connect",
        "scanInstructions": "Position the QR code within the frame for best results",
        "connecting": "Connecting...",
        "connectingMessage": "Please wait while we establish the connection",
        "success": "Connection successful!"
    },
    "smartTV": {
        "connected": "Remote Connected!",
        "connectedSubtitle": "Use your device to choose what to watch.",
        "connectTitle": "Control the TV with Your Phone",
        "qrAlt": "QR Code for remote control",
        "instructions": "1. Open the camera on your phone.\n2. Point it at the QR code to connect.",
        "initializing": "Initializing device...",
        "browseOnTV": "Browse the catalog directly on the TV",
        "orEnterCode": "Or enter the code manually:",
        "reconnecting": "Reconnecting..."
    },
    "watchTogether": {
        "joinRoomTitle": "Join Room",
        "createRoomTitle": "Watch together with your friends",
        "yourName": "Your Name",
        "selectEpisode": "Select an episode to start",
        "episodes": "Episodes",
        "season": "Season",
        "createRoom": "Create a new room",
        "or": "or",
        "roomCodePlaceholder": "Enter room code",
        "join": "Join",
        "roomTitle": "Room: {title}",
        "roomCode": "Room Code",
        "copyLink": "Copy Room Link",
        "copied": "Copied!",
        "changeCode": "Change Code",
        "participants": "Participants ({count})",
        "host": "Host",
        "changeContent": "Change Content",
        "startForAll": "Start for everyone",
        "waitingForHost": "Waiting for the host to start...",
        "changeContentTitle": "Change Content",
        "searchPlaceholder": "Search for movies or TV series",
        "cancel": "Cancel",
        "transferHostTitle": "Transfer Host",
        "transferHostConfirm": "Are you sure you want to transfer host to {name}?",
        "confirm": "Confirm"
    },
    "chat": {
        "title": "Room Chat",
        "participants": "Participants ({count})",
        "makeHost": "Make Host",
        "sentImageAlt": "Sent image",
        "uploadImage": "upload image",
        "placeholder": "Write a message...",
        "imageTooLarge": "Image size exceeds 5MB limit",
        "imageAttached": "Image attached",
        "previewAlt": "Image preview",
        "removeImage": "Remove image"
    },
    "remote": {
        "title": "Quix Remote",
        "chooseForTV": "Choose what to watch on the TV",
        "detail": {
            "back": "Back",
            "episodes": "Episodes",
            "season": "Season",
            "playOnTV": "Play on TV"
        },
        "player": {
            "title": "Remote Control",
            "back": "back",
            "nowPlaying": "Now playing on TV",
            "connectionLost": "Connection Lost",
            "connectionLostDesc": "The TV has disconnected. Scan the QR code to reconnect.",
            "reconnect": "Reconnect",
            "noContent": "No content playing.",
            "seekBackward": "rewind 10 seconds",
            "seekForward": "forward 10 seconds",
            "play": "play",
            "pause": "pause",
            "skipIntro": "Skip Intro",
            "episodes": "Episodes",
            "introDuration": "Intro Duration (sec)",
            "nextEpisode": "next episode",
            "previousEpisode": "previous episode",
            "disconnect": "Disconnect"
        }
    },
    "misc": {
        "continueWatching": "Continue Watching",
        "myList": "My List",
        "latestReleases": "Latest Releases",
        "topRated": "Top Rated",
        "popularSeries": "Popular TV Series",
        "mustWatchAnime": "Must-Watch Anime",
        "searchPrompt": {
            "title": "Search for movies, series and more",
            "subtitle": "Find your favorite content right away."
        }
    },
    "search": {
        "resultsCount": "{count, plural, one {# result} other {# results}}"
    },
    "shareAndImport": {
        "shareTitle": "Share Library",
        "importTitle": "Import Library",
        "selectShows": "Select shows to include:",
        "selectAll": "Select all ({count})",
        "generateLink": "Generate Share Link",
        "generating": "Generating...",
        "shareLinkReady": "Your share link is ready:",
        "copyLink": "Copy Link",
        "back": "Back",
        "pasteLink": "Paste a share link to add content to your library.",
        "linkPlaceholder": "https://...",
        "import": "Import",
        "importing": "Importing...",
        "loginRequired": "You must be logged in with Google to share your library."
    },
    "revisions": {
        "title": "Change History",
        "revert": "Revert",
        "revertConfirm": "Are you sure you want to revert this change?",
        "noHistory": "No changes have been recorded yet.",
        "loading": "Loading history...",
        "showRawData": "Show Raw Data",
        "hideRawData": "Hide Raw Data",
        "errors": {
            "missingOldObject": "Cannot revert: old object data is missing from revision history."
        },
        "descriptions": {
            "myList": {
                "add": "Added '{name}' to your list",
                "remove": "Removed '{name}' from your list"
            },
            "cachedItems": {
                "add": "Cached '{name}'",
                "update": "Updated cached data for '{name}'",
                "remove": "Removed '{name}' from cache"
            },
            "episodeLinks": {
                "add": "Linked a video to '{show}' S{s}E{e}",
                "remove": "Removed a link from '{show}' S{s}E{e}",
                "update": "Updated a link for '{show}' S{s}E{e}"
            },
            "showIntroDurations": {
                "set": "Set intro duration to {duration}s for '{show}'",
                "remove": "Removed custom intro duration for '{show}'"
            },
            "viewingHistory": {
                "add": "Watched episode: {show} S{s}E{e}"
            },
            "unknown": "Action '{type}' on table '{table}'"
        }
    },
    "syncConflict": {
        "title": "Sync Conflict",
        "overviewInfo": "Differences were found between the local data and the cloud. Click \"Continue\" to pick what to take from where for each show, or use one of the quick actions below.",
        "chooseInfo": "Pick for each show what to take from where. You can also delete shows you don't want to keep.",
        "stepOverview": "Overview",
        "stepChoose": "Choose",
        "bulkLocal": "Take all from Local",
        "bulkRemote": "Take all from Remote",
        "bulkBoth": "Take from both",
        "deleteLocalOnly": "Delete local-only shows ({count})",
        "deleteRemoteOnly": "Delete remote-only shows ({count})",
        "stats": {
            "total": "Total: {count}",
            "conflicts": "With conflicts: {count}",
            "localOnly": "Local only: {count}",
            "remoteOnly": "Remote only: {count}",
            "toDelete": "To delete: {count}"
        },
        "rowsCount": "{count} shows",
        "rowsCountWithDelete": "{count} shows ({toDelete} to delete)",
        "noConflict": "No conflict",
        "myList": "My list",
        "links": "Links ({local} local / {remote} remote)",
        "progress": "Progress ({local} local / {remote} remote)",
        "actions": {
            "continue": "Continue and choose for each show",
            "mergeAuto": "Merge automatically (keep everything)",
            "overwriteLocal": "Overwrite local with remote",
            "overwriteRemote": "Overwrite remote with local",
            "cancel": "Cancel sync (logout)",
            "back": "Back",
            "confirmMerge": "Confirm Merge ({count} shows)"
        },
        "processing": "Processing...",
        "showId": "ID: {id}",
        "deleted": "DELETED",
        "labels": {
            "myListBadge": "My List",
            "linksBadge": "Links",
            "progressBadge": "Progress"
        },
        "options": {
            "locale": "Local",
            "remote": "Remote",
            "both": "Both",
            "notIncluded": "Not included",
            "inBoth": "In both",
            "onlyLocal": "Local only",
            "onlyRemote": "Remote only"
        }
    },
    "libraryManagement": {
        "title": "Library Management",
        "tabs": {
            "myList": "My List",
            "continueWatching": "Continue Watching",
            "links": "Video Links",
            "preferredSources": "Preferred Sources"
        },
        "type": {
            "series": "TV Series",
            "movie": "Movie"
        },
        "links": "links",
        "empty": {
            "myList": "Your list is empty. Add movies and TV series to see them here.",
            "continueWatching": "Nothing to continue watching.",
            "links": "No video links associated.",
            "preferredSources": "No preferred source set."
        },
        "removeFromMyList": "Remove from list",
        "removeFromContinue": "Remove from Continue Watching",
        "clearAllLinks": "Delete all links",
        "markWatched": "Mark watched",
        "markUnwatched": "Mark unwatched",
        "sub": "SUB",
        "dub": "DUB",
        "remove": "Remove",
        "deleteConfirm": {
            "title": "Confirm deletion",
            "message": "Are you sure you want to delete \"{name}\"?"
        },
        "cancel": "Cancel",
        "delete": "Delete",
        "filters": {
            "allShows": "All series",
            "showOnlyInvalid": "Only invalid links",
            "deleteAllInvalid": "Delete all invalid",
            "invalidLink": "Invalid link",
            "noInvalidLinks": "No invalid links"
        },
        "confirmDeleteAllInvalid": {
            "title": "Delete all invalid links",
            "message": "Are you sure you want to delete all {count} invalid links? This action cannot be undone."
        },
        "deletedAllInvalid": "{count} invalid links deleted successfully.",
        "dashboard": {
            "searchPlaceholder": "Search the library…",
            "searchAriaLabel": "Search the library",
            "counters": {
                "myList": "My list",
                "continueWatching": "Continue",
                "links": "Links",
                "invalid": "Expired"
            },
            "noResults": "No results for \"{query}\""
        },
        "common": {
            "lastEdited": "Last edited: {date}",
            "editLink": "Edit link",
            "copyUrl": "Copy URL",
            "delete": "Delete"
        },
        "myList": {
            "lastEdited": "Last edited {date}",
            "removeConfirm": "Remove \"{name}\" from your list?",
            "exploreCta": "Explore the catalog"
        },
        "continueWatching": {
            "removeConfirm": "Remove \"{name}\" from Continue Watching?",
            "emptyCta": "Browse the catalog",
            "play": "Play",
            "playAria": "Play {name}"
        },
        "videoLinks": {
            "bulkBar": {
                "selected": "{count} selected",
                "changeLanguage": "Change language",
                "changeType": "Change type",
                "deleteN": "Delete {count}",
                "clearSelection": "Clear selection",
                "selectAll": "Select all",
                "languagePrompt": "Language (3 chars)",
                "apply": "Apply",
                "type": "Type"
            },
            "showInfo": {
                "title": "Show info",
                "episodes": "{count} episodes",
                "links": "{count} links",
                "invalid": "{count} expired",
                "lastEdited": "Last edited: {date}",
                "preferredSource": "Preferred source"
            },
            "emptySearch": "No links match \"{query}\""
        },
        "linkEdit": {
            "title": "Edit link",
            "showContext": "{show} - S{season}E{episode}",
            "urlLabel": "URL",
            "urlPreview": "Preview: {preview}",
            "labelLabel": "Label",
            "languageLabel": "Language (3 chars)",
            "typeLabel": "Type",
            "preferredSwitch": "Mark as preferred source for this show",
            "validateNow": "Validate now",
            "validating": "Validating...",
            "valid": "Link is valid",
            "invalid": "Link is not valid",
            "save": "Save",
            "cancel": "Cancel",
            "missingUrl": "Please enter a valid URL.",
            "savedSuccess": "Link saved successfully.",
            "validatedSuccess": "Link is valid.",
            "validatedInvalid": "The link does not respond or cannot be reached."
        },
        "preferredSources": {
            "linksAvailable": "{count} links available",
            "emptySearch": "No preferred source matches \"{query}\"",
            "edit": "Edit",
            "editAria": "Edit preferred source for {name}",
            "editTitle": "Edit preferred source - {name}",
            "editInfo": "Enter the full source URL. The origin (scheme + host) will be saved as the preferred source for this show.",
            "editUrl": "Source URL",
            "editPreview": "Preview: {preview}",
            "editSave": "Save",
            "editCancel": "Cancel",
            "editInvalidUrl": "Please enter a valid URL (e.g. https://example.com/...)."
        }
    },
    "notifications": {
        "roomCreated": "Room created! Share the code to invite friends.",
        "tvReady": "TV device ready. Scan the QR code to connect.",
        "connectedToTV": "Successfully connected to the TV!",
        "disconnectedFromTV": "Disconnected from the TV.",
        "remoteConnected": "Remote connected!",
        "slaveBusy": "TV is currently connected to another device. Please disconnect first.",
        "slaveNotFound": "Device not found. Make sure the TV is turned on and ready to connect.",
        "slaveReconnecting": "TV is reconnecting. Please wait...",
        "slaveReconnected": "TV reconnected!",
        "slaveDisconnected": "TV disconnected. Please scan the QR code to reconnect.",
        "masterDisconnected": "Remote control disconnected.",
        "reconnectingAsRemote": "Reconnecting as remote control...",

        "failedToLoadSeriesDetails": "Could not load series details.",
        "noPlayableEpisodes": "No playable episodes found for this series.",
        "noVideoLinks": "No video links found for this content.",
        "linkCountMismatch": "The number of links ({linkCount}) does not match the number of episodes ({episodeCount}).",
        "processingError": "Error processing data: {error}",
        "linksAddedSuccess": "{count} links added successfully!",
        "savingLinksError": "Error while saving links.",
        "copiedToClipboard": "Copied to clipboard!",
        "allSeasonLinksDeleted": "All {count} links for season {season} have been deleted.",
        "noLinksToDelete": "No links to delete for season {season}.",
        "welcomeUser": "Welcome, {name}!",
        "logoutSuccess": "Logged out successfully.",
        "backupFound": "Backup found on Google Drive. Do you want to restore?",
        "restore": "Restore",
        "loginRequired": "You must be logged in to use this feature.",
        "backupInProgress": "Saving to Google Drive...",
        "backupError": "Error while preparing the backup.",
        "backupComplete": "Backup completed successfully!",
        "backupSaveError": "Error while saving to Google Drive.",
        "restoreInProgress": "Restoring from Google Drive...",
        "noBackupFound": "No backup found on Google Drive.",
        "restoreComplete": "Restore complete!",
        "restoreError": "Error during restore: {error}",
        "linksUpdated": "{count} links updated successfully.",
        "domainUpdateError": "Error updating domains: {error}",
        "shareNoShowsSelected": "Please select at least one show to share.",
        "importInvalidFile": "Import file is invalid or corrupt.",
        "importInvalidLink": "The provided share link is not valid.",
        "importInProgress": "Importing library...",
        "importSuccess": "Imported {showCount} shows and {linkCount} links successfully and added to 'My List'!",
        "importError": "Failed to import library: {error}",
        "revertSuccess": "Change successfully reverted.",
        "revertError": "Failed to revert change: {error}",
        "preferredSourceSet": "Preferred source set successfully.",
        "syncChecking": "Checking for cloud data...",
        "syncError": "Error syncing with cloud.",
        "noBackupFoundCreating": "No cloud backup found. Creating one now...",
        "restoringFromCloud": "Newer data found in the cloud. Restoring now...",
        "shareLinkCreateError": "Failed to create share link: {error}",
        "syncUpToDate": "Your data is already up to date.",
        "removedFromContinueWatching": "Removed from 'Continue Watching'.",
        "removeFromContinueWatchingError": "Error removing from 'Continue Watching'.",
        "markedAsWatched": "Episode marked as watched.",
        "markedAsUnwatched": "Episode marked as unwatched.",
        "invalidEpisodeRange": "Invalid episode range.",
        "episodeNumberRangeMismatch": "The episode range ({epRange}) and the numbering range ({numRange}) must have the same length.",
        "linkUpdatedSuccess": "Link updated successfully.",
        "linksFromDomainDeletedSuccess": "{count} links from {domain} deleted successfully.",
        "syncMergeComplete": "Merge completed successfully!",
        "syncMergeError": "Error merging data: {error}",
        "syncOverwriteLocalComplete": "Local data overwritten with remote data.",
        "syncOverwriteLocalError": "Error overwriting local data: {error}",
        "syncOverwriteRemoteComplete": "Remote data overwritten with local data.",
        "syncOverwriteRemoteError": "Error overwriting remote data: {error}",
        "syncCancelled": "Sync cancelled. Logged out.",
        "title": "Notifications",
        "noNotifications": "No notifications",
        "markAllRead": "Mark all as read",
        "clearAll": "Clear all",
        "invalidLinks": "Invalid links found",
        "invalidLinksDesc": "{count} video link(s) may no longer be valid.",
        "manageLinks": "Manage Links",
        "dismiss": "Dismiss",
        "new": "New",
        "season": "Season",
        "episode": "Episode",
        "bulkLinksUpdated": "{count} links updated ({language}/{type}).",
        "bulkLinksDeleted": "{count} links deleted.",
        "linkValidatedSuccess": "Link validated successfully."
    },
    "tv": {
        "title": "TV",
        "signIn": "Sign in with Google",
        "signOut": "Sign out",
        "signOutConfirm": "Do you want to sign out?",
        "myList": "My List",
        "showQR": "QR Code",
        "continueWatching": "Continue Watching",
        "pairingTitle": "Connect your device",
        "pairingStep1": "Open the StreamFlix app on your phone or tablet",
        "pairingStep2": "Tap \"Connect to TV\" and scan the QR code",
        "orEnterCode": "Or enter the code above on your device",
        "empty": "No content available",
        "emptyHome": "Sign in with Google and connect a device to get started",
        "emptyList": "Your list is empty",
        "browseCatalog": "Browse catalog",
        "back": "Back",
        "qrCodeAlt": "QR Code for pairing",
        "exitPlayerTitle": "Do you want to stop playback?",
        "exit": "Exit"
    }
}
