# Context

## Project Structure

StreamFlix is a movie/TV show streaming management app. Key directories:

```
frontend/
  components/
    library/       — ManageLinksView, EmptyEpisodes
    media/         — DetailView
    modals/        — LinkMovieModal, LinkEpisodesModal, etc.
    overlay/       — OverlayLayer (lazy-loaded modals)
  store/           — MobX stores: mediaStore, libraryStore, remoteStore, fxStore
  services/        — linkService, linkValidator, db (Dexie/IndexedDB)
  views/           — ViewSwitch, TVHomeView, MovieHomeView, SearchView, PreferencesView
  features/shared/ — AppInitializer
  fx/             — AmbientCanvas, SceneCanvas, TransitionPortal (WebGL effects)

backend/src/       — Elysia.js server, WebSocket, static file serving
```

## Key Technologies

- **Frontend**: React 18, MobX 6 (observable Maps), Dexie (IndexedDB), MUI, GSAP
- **Lazy loading**: All modals use React.lazy() with Suspense — crashes if a lazy module throws on load
- **Maps as keys**: libraryStore.mediaLinks is a MobX `Map<number|string, Link[]>`. ALWAYS use `String(id)` when calling `.get()`/`.has()` — TMDB IDs are numbers but Object.groupBy stringifies keys to strings.
- **MobX reactions**: Components use `reaction()` to track Map changes. Track CONTENT (e.g. total link count), not `map.size` — size doesn't change when updating existing keys.
- **Sandbox env**: The code lives at `/home/agent/workspace` inside the Docker container. `gh` CLI is authenticated.

## Open Issues

Run the following to list open issues:
```
gh issue list --state open --label Sandcastle --limit 100 --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'
```

To view a specific issue:
```
gh issue view <number> --comments
```

## Task

Work on the open issues one by one. After completing each issue, close it with:
```
gh issue close <number> --comment "Completed by Sandcastle"
```

## Development Workflow

After making code changes:
1. Rebuild and restart: `cd /home/agent/workspace && docker compose down && docker compose up -d --build`
2. Wait for container to be healthy: `docker compose ps`
3. Test at http://localhost:3002/ — check for console errors and page rendering

## Important Patterns

- `libraryStore.mediaLinks.get(String(id))` — always String() for Map lookups
- `libraryStore.safeKey(v)` — available in LibraryStore for safe key coercion
- `mediaStore.mediaLinks` — observable MobX Map; changes trigger re-renders
- MobX `reaction()` — track computed values (e.g. total links), not reference changes
- Lazy-loaded modals — if a modal crashes, ALL modals fail to render (blank screen)
