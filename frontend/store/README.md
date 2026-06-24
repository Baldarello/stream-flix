# Store Architecture

The `mediaStore` used to be a 2,100+ line monolith that mixed catalog
data, search, library, preferences, UI, playback, watch-together,
sync and remote concerns in a single MobX class. It was refactored
into a thin **facade** backed by thematic sub-stores, so the rest
of the app keeps using the same `mediaStore` import without changes.

## Sub-stores

| Store | Owns |
| --- | --- |
| `catalogStore` | Trending, latest, top series, popular anime; `homePageRows`, `heroContent` |
| `searchStore` | `query`, `results`, `isSearching`, debounce timer |
| `libraryStore` | `myList`, `cachedItems`, `mediaLinks`, `episodeProgress`, `showIntroDurations`, `preferredSources`, `selectedSeasons`, `showFilterPreferences`, `episodeContextMap`, `viewingHistory`, bulk-selection state |
| `preferencesStore` | Active language, future theme/accent prefs |
| `uiStore` | Snackbar, notifications, debug overlay, every `is*ModalOpen` flag, expanded accordion state, profile drawer |
| `playbackStore` | `nowPlayingItem`, `nowPlayingShowDetails`, `playbackOriginItem`, `selectedItem`, `currentSeasonEpisodes`, `nextEpisode` |

The three cross-cutting stores (`remoteStore`, `watchTogetherStore`,
`syncStore`) are unchanged: the facade simply re-exposes their
fields and methods.

## Public surface

`mediaStore` re-exposes the full public surface that consumers relied
on. New code is encouraged to import the sub-store directly
(`import { libraryStore } from '../store/libraryStore'`) to avoid
the facade overhead, but the legacy access pattern still works.

## Adding new state

Pick the sub-store whose domain the state belongs to. If it doesn't
fit any of them, consider whether it really needs to be in MobX
(transient view state that lives in one component does not need
to be here).

## i18n events

`mediaStore.events` is a standard `EventTarget`. The `useTranslations`
hook subscribes to `languagechange` to re-render when the user
switches language. Other sub-stores can dispatch their own custom
events on this same target if they need cross-cutting notifications.
