# Link Store Rework — Design Spec

## Goal

Fix the bug where links added via `LinkEpisodesModal` don't appear in `DetailView` until a page refresh, and reorganize store access so `libraryStore.mediaLinks` is the single source of truth for episode links.

## Root Cause

Two parallel data sources for episode links:

1. **`episode.video_urls`** — embedded in episode objects, populated once during `_fetchAndCacheMediaDetails`. Read by `DetailView` and episode cards. **Never refreshed after initial load.**
2. **`libraryStore.mediaLinks`** — MobX-observable Map keyed by `mediaId` (episode ID). Updated correctly by `refreshLinksForShow` after every add/delete operation. Read by `ManageLinksView`.

When `LinkEpisodesModal` saves links:
- ✅ `libraryStore.mediaLinks` is updated
- ❌ `episode.video_urls` on `currentSelectedItem` / `cachedItems` is stale
- ❌ `DetailView` re-renders but reads stale `video_urls`

Additionally, `ManageLinksView`'s reaction (lines 69–81) has a subtle issue: it tracks total link count across episodes, but the actual `episodeLinkMap` is built from `libraryStore.mediaLinks` directly in the render body. If the Map reference changes (new Map assigned), the reaction fires and forces a re-render — which is correct. But the initial render before the reaction fires may show nothing.

## Design

### Change 1 — Reactive link patching on `currentSelectedItem`

After `refreshLinksForShow` updates `libraryStore.mediaLinks`, patch the in-memory `currentSelectedItem` episodes so any component reading `episode.video_urls` gets fresh data.

Add to `mediaStore` (or `libraryStore`):

```js
// In mediaStore, after libraryStore.mediaLinks is mutated:
_patchCurrentItemVideoUrls(showId) {
    const item = this.selectedItem;
    if (!item || item.id !== showId || !item.seasons) return;
    item.seasons.forEach(season => {
        (season.episodes || []).forEach(ep => {
            ep.video_urls = libraryStore.mediaLinks.get(ep.id) || [];
            ep.video_url = ep.video_urls[0]?.url || null;
        });
    });
}
```

Call it at the end of `refreshLinksForShow`, inside the same `runInAction`.

Also patch `libraryStore.cachedItems.get(showId)` if present, so subsequent detail opens are already warm.

### Change 2 — `libraryStore.getLinksForMedia` as canonical reader

`libraryStore.getLinksForMedia(mediaId)` already exists and returns the links from the observable Map. Components should call this for reads instead of holding stale snapshots. No changes needed to the method itself — just audit the callers.

### Change 3 — Store access audit

Scan all components that read `episode.video_urls` or `libraryStore.mediaLinks`:

| Component | Read source | Issue |
|---|---|---|
| `DetailView.jsx` / `EpisodeListView` | `episode.video_urls` | Will be fixed by Change 1 |
| `SwipeableEpisodeCardDetailView` | `episode.video_urls` | Will be fixed by Change 1 |
| `ManageLinksView.jsx` | `libraryStore.mediaLinks` | Works, but reads Map directly in render body |
| `DetailDialogs.jsx` | unknown | Audit needed |
| `EpisodesDrawer.jsx` | unknown | Audit needed |

After Change 1, `DetailView` and episode cards get reactive updates for free. The Map-direct reads in `ManageLinksView` are acceptable since the Map is observable — but the reaction (lines 69–81) should be simplified to react to `libraryStore.mediaLinks` directly.

### Change 4 — Simplify `ManageLinksView` reaction

Replace the manual `reaction` that counts links with a direct MobX observable read:

```js
// Instead of the reaction on lines 69-81, use:
const totalLinks = (() => {
    let total = 0;
    for (const ep of currentSeason.episodes) {
        const epLinks = libraryStore.mediaLinks.get(ep.id);
        if (epLinks) total += epLinks.length;
    }
    return total;
})();
```

Since `libraryStore.mediaLinks` is a MobX-observable Map, accessing it inside the `observer` render body is already tracked. The `reaction` is redundant and adds unnecessary complexity.

## Files to change

- `frontend/store/mediaStore.js` — add `_patchCurrentItemVideoUrls`, call from `refreshLinksForShow`
- `frontend/store/libraryStore.js` — no structural changes; may add a helper if needed
- `frontend/components/library/ManageLinksView.jsx` — remove/redesign reaction
- `frontend/components/media/DetailView.jsx` — no direct changes if Change 1 works
- Any other component reading `episode.video_urls` (found during audit)

## Success criteria

1. After adding links via `LinkEpisodesModal`, switching to the `DetailView` shows the new links immediately — no page refresh.
2. After deleting links via `ManageLinksView`, `DetailView` reflects the deletion immediately.
3. All components read from a single source (`libraryStore.mediaLinks` / `getLinksForMedia`).
4. No redundant reactions or manual force-updates.
