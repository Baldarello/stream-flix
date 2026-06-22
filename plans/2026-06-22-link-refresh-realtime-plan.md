# Plan: LinkEpisodesModal → ManageLinksView Realtime Refresh Bugfix

**Date:** 2026-06-22
**Spec:** `docs/superpowers/specs/2026-06-22-link-refresh-realtime-design.md`
**Changes:** 2 files, 3 lines total

---

## Bug Summary

Links added via `LinkEpisodesModal` don't appear in `ManageLinksView` until page refresh.

Two independent causes (both fixed here):
1. **Type mismatch** — `libraryStore.mediaLinks` Map uses **string** keys (`String(link.mediaId)` in `refreshLinksForShow`), but `ManageLinksView` calls `.get(ep.id)` with a **number** key → always `undefined`.
2. **Tab switch races store update** — `setLinkEpisodesTab('manage')` is called without a defensive refresh; the modal may render before `runInAction` in `refreshLinksForShow` flushes.

---

## Step 1 — Fix type mismatch in `ManageLinksView.jsx`

**File:** `frontend/components/library/ManageLinksView.jsx`

**Root cause:** `libraryStore.mediaLinks` Map keys are strings (set via `String(link.mediaId)` in `refreshLinksForShow`), but `ep.id` from TMDB is a number. `Map.get(number)` on a string-keyed Map returns `undefined` — links never appear.

**Lines 48–62** — change both `.get(ep.id)` calls to `.get(String(ep.id))`:

```
[e/stream-flix/frontend/components/library/ManageLinksView.jsx#BCFF]
SWAP 47.=57:
    const linksByDomain = {};
    for (const ep of currentSeason.episodes) {
        const epLinks = libraryStore.mediaLinks.get(String(ep.id)) || [];
        for (const link of epLinks) {
            try {
                const origin = new URL(link.url).origin;
                if (!linksByDomain[origin]) linksByDomain[origin] = [];
                linksByDomain[origin].push(link);
            } catch (_) {}
        }
    }

    const episodeLinkMap = {};
    for (const ep of currentSeason.episodes) {
        episodeLinkMap[ep.id] = libraryStore.mediaLinks.get(String(ep.id)) || [];
    }
```

**Lines changed:** 49 (1 occurrence), 61 (1 occurrence) — both in the same `for` loop block.

---

## Step 2 — Add defensive refresh in `LinkEpisodesModal.jsx`

**File:** `frontend/components/modals/LinkEpisodesModal.jsx`

**Root cause:** `onSuccess={() => setLinkEpisodesTab('manage')}` switches tabs without ensuring the store has propagated the update. Adding a defensive `refreshLinksForShow(item.id)` call before the tab switch guarantees the data is in the store before `ManageLinksView` mounts.

**Line 584** — add `mediaStore.refreshLinksForShow(item.id)` before `setLinkEpisodesTab('manage')`:

```
[e/stream-flix/frontend/components/modals/LinkEpisodesModal.jsx#BB48]
SWAP 584.=584:
                                                                            onSuccess={() => { mediaStore.refreshLinksForShow(item.id); setLinkEpisodesTab('manage'); }}
```

---

## Acceptance Criteria (from SPEC)

| # | Criterion |
|---|-----------|
| AC1 | After adding links via pattern/list/JSON and clicking save, switching to **Manage** tab shows newly added links immediately — no F5 required. |
| AC2 | Fix works for all three add methods: **Pattern**, **List**, and **JSON**. |
| AC3 | Existing delete, edit, and domain operations in `ManageLinksView` continue to work without regression. |
| AC4 | Links added from `LinkEpisodesModal` also appear in the playback pipeline (VideoLinksTab) without reload. |

---

## Verification

### Code review checklist

1. **`ManageLinksView.jsx` line 49 and 61:** Confirm both `.get()` calls now use `String(ep.id)`. No other `.get(ep.id)` calls remain in the file.

2. **`LinkEpisodesModal.jsx` line 584:** Confirm `onSuccess` prop calls `mediaStore.refreshLinksForShow(item.id)` **before** `setLinkEpisodesTab('manage')`.

3. **No regressions in other files:** `linkService.js`, `mediaStore.js`, `libraryStore.js` are unchanged (verified by grep for any accidental edits).

4. **MobX reactivity path intact:** `libraryStore.mediaLinks` is set inside `runInAction` in `refreshLinksForShow` (mediaStore.js:1178). `ManageLinksView` is an `observer` reading `libraryStore.mediaLinks.get(...)`. With the string-key fix, the correct Map entry will be returned and displayed.

### Manual smoke steps

After applying both changes:
1. Open a show in `LinkEpisodesModal`.
2. Use **Pattern** add with `https://srv18.example.com/[@EP].mp4`, episodes 1–3.
3. Click **Save** — wait for snackbar confirmation.
4. Tab switches to **Manage** — links for episodes 1–3 appear immediately.
5. Repeat for **List** and **JSON** methods.
6. Use delete and edit on a link in `ManageLinksView` — operations work.
7. Open VideoLinksTab / playback — links appear without reload.