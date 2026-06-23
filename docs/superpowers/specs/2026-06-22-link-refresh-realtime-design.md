# SPEC: LinkEpisodesModal → ManageLinksView Realtime Refresh Bugfix

**Date:** 2026-06-22
**Status:** Analysis & Proposed Fix
**Language:** EN

---

## 1. Bug Description

When a user adds video links via `LinkEpisodesModal.jsx` using a pattern such as `https://srv18-tsurukusa.sweetpixel.org/DDL/ANIME/DrStone4ITA/DrStone4_Ep_[@EP]_ITA.mp4`, and then switches to the **Manage** tab (rendering `ManageLinksView.jsx`), the newly added links are **not visible**. A full page refresh (F5) makes them appear. The expectation is that links appear in `ManageLinksView` immediately after the save, without requiring a page reload.

---

## 2. Root Cause Analysis

### 2.1 The Save Path (Write)

The save flow is:

1. `LinkEpisodesModal` renders `AddLinkTabs` with `onSave={setEpisodeLinksForSeason}` — a reference to `mediaStore.setEpisodeLinksForSeason`.
2. On save, `buildLinksForSeason` (linkService.js:102) constructs link records with `mediaId: ep.id` (episode-level ID, **not** show-level ID).
3. `addLinksToMediaSvc(show.id, linksToAdd)` persists those links to Dexie via `db.mediaLinks.bulkAdd`.
4. `refreshLinksForShow(show.id)` is called immediately after (mediaStore.js:1135).
5. `refreshLinksForShow` (mediaStore.js:1178):
   - Queries `db.mediaLinks` for the show ID **and all episode IDs** of the show.
   - Groups results by `String(link.mediaId)`.
   - Creates a **new Map reference**: `new Map(libraryStore.mediaLinks)` — a deliberate ponytail comment (line 1188) ensures MobX detects the mutation.
   - Assigns it inside `runInAction(() => { libraryStore.mediaLinks = newMediaLinks; })`.

**Key fact:** Links are stored keyed by **episode ID** (`ep.id`), not show ID. `refreshLinksForShow` correctly queries episode IDs.

### 2.2 The Read Path (Read)

`ManageLinksView.jsx` (lines 59–62):

```js
const episodeLinkMap = {};
for (const ep of currentSeason.episodes) {
    episodeLinkMap[ep.id] = libraryStore.mediaLinks.get(ep.id) || [];
}
```

`ManageLinksView` is an `observer`. It reads `libraryStore.mediaLinks` directly (not via `mediaStore.mediaLinks`). Since `libraryStore.mediaLinks` is `makeAutoObservable({ mediaLinks: true })`, the `.get()` call on the Map should be a tracked MobX read.

### 2.3 Why Reactivity Fails

**The bug is almost certainly a stale closure / missed observer dependency, NOT a missing write.**

The save flow is correct:
- Links ARE persisted to Dexie correctly.
- `refreshLinksForShow` IS called and IS creating a new Map reference.
- The new Map IS assigned to `libraryStore.mediaLinks` inside `runInAction`.

The likely failure point is that `ManageLinksView` does **not re-render** after `libraryStore.mediaLinks` is updated, even though it observes it. Three possible sub-causes:

**A. `currentSeason` prop is referentially stable**  
`currentSeason` is derived inside `LinkEpisodesModal` via:
```js
const currentSeason = item.seasons?.find(s => s.season_number === linkEpisodesSeason);
```
After saving, `setLinkEpisodesTab('manage')` is called. `LinkEpisodesModal` re-renders, but `currentSeason` references the **same object** (same show, same season). The `useEffect` in `ManageLinksView` (line 64–70) depends on `currentSeason.id` and `currentSeason.episodes.length` — neither changes when links are added. However, `linksByDomain` and `episodeLinkMap` are computed inline in the render body (not in `useEffect`), so they DO read the updated `libraryStore.mediaLinks` on re-render. The issue is **getting that re-render to fire**.

**B. `libraryStore` is not directly observed**  
`ManageLinksView` imports `libraryStore` directly. The `mediaLinks: true` override in `makeAutoObservable` (libraryStore.js:57) means `mediaLinks` itself is tracked as an observable property, not just its Map mutations. Assigning a new Map (`libraryStore.mediaLinks = newMediaLinks`) IS a tracked mutation. An `observer` component reading `libraryStore.mediaLinks.get(ep.id)` should react to the Map reference change — **unless** the reading happens through a non-reactive intermediate (e.g., if the component somehow only observes `mediaStore`).

**C. Race between tab switch and store update**  
`onSuccess()` (triggering `setLinkEpisodesTab('manage')`) is called synchronously after `setEpisodeLinksForSeason` returns `true`. The store update is synchronous (`runInAction`). In React 18, `setLinkEpisodesTab` queues a state update. The timing should be fine, but in some rendering paths the `ManageLinksView` might render before the `runInAction` batch flushes.

---

## 3. MobX Observable Data Flow

```
LinkEpisodesModal (observer)
  └─ onSave={mediaStore.setEpisodeLinksForSeason}
       │
       ├─ buildLinksForSeason(show, season, method, data)
       │     └─ linksToAdd = [{ mediaId: ep.id, url, label, language, type }, ...]
       │
       ├─ addLinksToMediaSvc(show.id, linksToAdd)
       │     └─ db.mediaLinks.bulkAdd(linksToAdd)  [persisted to IndexedDB]
       │
       └─ this.refreshLinksForShow(show.id)
              ├─ db.mediaLinks.where('mediaId').anyOf([showId, ...episodeIds]).toArray()
              ├─ grouped = Object.groupBy(allLinks, l => String(l.mediaId))
              ├─ newMediaLinks = new Map(libraryStore.mediaLinks)  ← new reference
              ├─ newMediaLinks.set(mediaId, links) for each group
              └─ runInAction(() => { libraryStore.mediaLinks = newMediaLinks; })
                        │
                        ▼
              libraryStore.mediaLinks (Map, observable, new reference)
                        │
                        ▼
              ManageLinksView (observer, reads libraryStore.mediaLinks.get(ep.id))
                    ├─ linksByDomain = { ... }   ← recomputed inline on re-render
                    └─ episodeLinkMap[ep.id] = libraryStore.mediaLinks.get(ep.id)
```

**Data Keying:**  
- `mediaLinks` Map: key = `String(ep.id)` (episode-level mediaId)  
- `episodeLinkMap[ep.id]`: `ep.id` comes from `currentSeason.episodes[n].id` (from `item.seasons` — TMDB show object)

**Potential type mismatch:** If `ep.id` from TMDB is a **number** but `libraryStore.mediaLinks` keys are **strings** (from `String(link.mediaId)` in `refreshLinksForShow`), the `.get(ep.id)` call with a numeric key on a string-keyed Map returns `undefined`. This would cause the link to never appear even if the Map IS updated.

---

## 4. Proposed Fixes

### Option A — Fix the type mismatch in episode ID keys (Most Likely Fix)

**Approach:** Ensure consistent string keys throughout the flow.

In `refreshLinksForShow` (mediaStore.js:1187), the Map keys are already string:
```js
const grouped = Object.groupBy(allLinks, (link) => String(link.mediaId));
```

But `ManageLinksView` uses `ep.id` directly, which may be a number:
```js
episodeLinkMap[ep.id] = libraryStore.mediaLinks.get(ep.id) || [];
```

**Fix:** Change `ManageLinksView` to use `String(ep.id)` when accessing the Map:
```js
episodeLinkMap[ep.id] = libraryStore.mediaLinks.get(String(ep.id)) || [];
```

Also fix `linksByDomain` similarly. This is a one-line-per-sitefix in `ManageLinksView.jsx`.

**Files changed:** `frontend/components/library/ManageLinksView.jsx` (lines ~48–62)

---

### Option B — Add explicit refresh call when switching to Manage tab

**Approach:** After `setEpisodeLinksForSeason` succeeds and before switching tabs, explicitly call `refreshLinksForShow`.

In `LinkEpisodesModal.jsx`, change `onSuccess` to also trigger a store refresh:
```js
onSuccess={async () => {
    if (item?.id) await mediaStore.refreshLinksForShow(item.id);
    setLinkEpisodesTab('manage');
}}
```

Or, alternatively, trigger the refresh inside `setEpisodeLinksForSeason` after the save, before returning.

**Files changed:** `frontend/components/modals/LinkEpisodesModal.jsx` (line ~155)

---

### Option C — Add a key or force remount on tab switch

**Approach:** Force `ManageLinksView` to fully remount when switching to the manage tab after a save by adding a key that changes:

```jsx
<ManageLinksView
    key={`manage-${item.id}-${linkEpisodesSeason}-${Date.now()}`}
    ...
/>
```

This is a blunt instrument but guarantees a fresh render cycle with the current store state. Only applied conditionally (after a save).

**Files changed:** `frontend/components/modals/LinkEpisodesModal.jsx`

---

### Recommended: Option A + Option B together

Option A fixes the type mismatch (most likely root cause). Option B is a defensive belt-and-suspenders refresh on tab switch. Both are minimal changes that don't alter architecture.

---

## 5. Key Files Involved

| File | Role |
|------|------|
| `frontend/components/modals/LinkEpisodesModal.jsx` | Save trigger; tab switching; passes `currentSeason` to `ManageLinksView` |
| `frontend/components/library/ManageLinksView.jsx` | Reads `libraryStore.mediaLinks` for episode links; likely has type-mismatch bug on `.get(ep.id)` |
| `frontend/store/libraryStore.js` | Owns `mediaLinks` Map (`makeAutoObservable({ mediaLinks: true })`); `bulkImportFromDb`, `getLinksForMedia`, `refreshLinksForMediaId` |
| `frontend/store/mediaStore.js` | Facade; `setEpisodeLinksForSeason`, `refreshLinksForShow` (lines 1114–1196) |
| `frontend/services/linkService.js` | `buildLinksForSeason` (creates links keyed by `ep.id`), `addLinksToMedia` (Dexie persist) |

---

## 6. Acceptance Criteria

1. After adding links via `LinkEpisodesModal` pattern input and clicking save, switching to the **Manage** tab shows the newly added links immediately (no page reload required).
2. The same fix works for all three add methods: **Pattern**, **List**, and **JSON**.
3. Existing delete, edit, and domain operations in `ManageLinksView` continue to work without regression.
4. Links added from `LinkEpisodesModal` also appear in the playback pipeline (VideoLinksTab) without reload.

---

## 7. Out of Scope

- Changes to the Dexie schema or `linkService.js` persistence logic.
- Changes to `mediaStore` facade architecture (the split store pattern is intentional).
- Visual or UX changes to either modal.
