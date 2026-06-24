# Link Store Rework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the bug where links added via `LinkEpisodesModal` don't appear in `DetailView` until page refresh, and reorganize store access so `libraryStore.mediaLinks` is the single source of truth.

**Architecture:** After `refreshLinksForShow` mutates `libraryStore.mediaLinks`, also patch `currentSelectedItem` episodes so `episode.video_urls` is always in sync. Simplify `ManageLinksView`'s redundant MobX reaction. Audit all components reading `episode.video_urls`.

**Tech Stack:** MobX, Dexie (IndexedDB), React, JavaScript

---

## File Map

| File | Change |
|---|---|
| `frontend/store/mediaStore.js` | Add `_patchCurrentItemVideoUrls`, call from `refreshLinksForShow` |
| `frontend/components/library/ManageLinksView.jsx` | Remove redundant `reaction`, use direct observable Map access |
| `frontend/components/media/DetailView.jsx` | Audit only — no direct changes expected if Change 1 works |

---

## Pre-flight: Audit all `video_urls` reads

Before writing any code, find all consumers of `video_urls` to confirm no other component is affected.

**Files to check:**
- `frontend/components/media/DetailView.jsx`
- `frontend/components/media/DetailDialogs.jsx`
- `frontend/components/library/ManageLinksView.jsx`
- Any other `*.jsx` under `frontend/components/`

```bash
grep -rn "video_urls" frontend/components/ --include="*.jsx"
```

List every file and the exact line where `video_urls` is read (not written). This determines if additional patches are needed beyond Change 1.

---

## Task 1: Add `_patchCurrentItemVideoUrls` to mediaStore

**Files:**
- Modify: `frontend/store/mediaStore.js`

- [ ] **Step 1: Find where `refreshLinksForShow` ends (line ~1198)**

Read lines 1175–1210 of `frontend/store/mediaStore.js` to find the exact end of `refreshLinksForShow`.

- [ ] **Step 2: Add `_patchCurrentItemVideoUrls` method to MediaStore class**

Insert this method inside the class (anywhere, but near `refreshLinksForShow` is logical):

```js
/**
 * Patch `currentSelectedItem` and `cachedItems` episodes so their
 * `video_urls` stays in sync with the observable `libraryStore.mediaLinks`.
 * Called after every link mutation.
 */
_patchCurrentItemVideoUrls(showId) {
    const item = this.selectedItem;
    if (!item || item.id !== showId || !item.seasons) return;
    item.seasons.forEach(season => {
        (season.episodes || []).forEach(ep => {
            ep.video_urls = libraryStore.mediaLinks.get(ep.id) || [];
            ep.video_url = ep.video_urls[0]?.url || null;
        });
    });
    // Also patch cachedItems so next detail open is warm
    const cached = libraryStore.cachedItems.get(showId);
    if (cached && cached.seasons) {
        cached.seasons.forEach(season => {
            (season.episodes || []).forEach(ep => {
                ep.video_urls = libraryStore.mediaLinks.get(ep.id) || [];
                ep.video_url = ep.video_urls[0]?.url || null;
            });
        });
    }
}
```

- [ ] **Step 3: Call `_patchCurrentItemVideoUrls` inside `refreshLinksForShow`'s `runInAction`**

In `refreshLinksForShow`, after the line `libraryStore.mediaLinks = newMediaLinks;`, add:

```js
this._patchCurrentItemVideoUrls(showId);
```

The full `runInAction` block becomes:
```js
runInAction(() => {
    libraryStore.mediaLinks = newMediaLinks;
    this._patchCurrentItemVideoUrls(showId);
});
```

- [ ] **Step 4: Verify the edit**

Read lines 1190–1210 to confirm the `runInAction` block contains both assignments.

---

## Task 2: Simplify `ManageLinksView` reaction

**Files:**
- Modify: `frontend/components/library/ManageLinksView.jsx:64-81`

- [ ] **Step 1: Read the current reaction code**

Read lines 60–90 of `ManageLinksView.jsx`.

- [ ] **Step 2: Remove the `reaction` and `forceRender`**

Delete:
- Line 64: `const [, forceRender] = useState(0);`
- Lines 65–81: the `useEffect` with the `reaction`

- [ ] **Step 3: Replace with a derived variable inside the observer render body**

The `episodeLinkMap` and `linksByDomain` are already computed from `libraryStore.mediaLinks` inside the `observer` render body (lines 48–63). Since `libraryStore.mediaLinks` is a MobX-observable Map, these reads are automatically tracked — no manual reaction needed.

Verify lines 48–63 look like this:
```js
const linksByDomain = {};
for (const ep of currentSeason.episodes) {
    const epLinks = libraryStore.mediaLinks.get(ep.id) || [];
    // ...
}
const episodeLinkMap = {};
for (const ep of currentSeason.episodes) {
    episodeLinkMap[ep.id] = libraryStore.mediaLinks.get(ep.id) || [];
}
```

If they do, the component is already reactive without the `reaction`. The only remaining `useEffect` should be line 66 (`mediaStore.refreshLinksForShow(item.id)`) and lines 82–88 (domain inputs init). The effect at line 65–81 is fully redundant.

- [ ] **Step 4: Remove unused `reaction` import if no other reaction exists**

Check if `reaction` from 'mobx' is used elsewhere in the file. If not, remove from import:
```js
import {reaction} from 'mobx';
```

---

## Task 3: Write Playwright test for the bug

**Files:**
- Create: `.playwright-mcp/link-store-rework.spec.js`

- [ ] **Step 1: Write the test**

```js
const { test, expect } = require('@playwright/test');

test('links added via LinkEpisodesModal appear in DetailView without refresh', async ({ page }) => {
    // Login as guest
    await page.goto('http://localhost:3002/');
    await page.click('text=Accedi come Guest');

    // Search for a TV show
    await page.fill('[data-component="search-input"]', 'Dragon Ball');
    await page.waitForTimeout(500);

    // Open detail view
    const showCard = page.locator('[data-component="media-card"]').first();
    await showCard.click();
    await page.waitForSelector('[data-component="detail-view"]');

    // Open Link Episodes Modal
    await page.click('[data-component="link-episode"]');
    await page.waitForSelector('[data-component="link-episodes-modal"]');

    // Select season 1
    await page.selectOption('select, [role="combobox"]', { index: 0 });
    await page.waitForTimeout(300);

    // Add links via pattern (simple test pattern)
    const patternInput = page.locator('#pattern-url-episode');
    await patternInput.fill('https://example.com/episode/[@EP]');
    await page.waitForTimeout(200);

    // Set padding
    const paddingInput = page.locator('input[type="number"]').first();
    await paddingInput.fill('1');

    // Save
    await page.click('#add-links-button');
    await page.waitForTimeout(1000);

    // Switch to manage tab
    await page.click('#link-episodes-tab-manage');
    await page.waitForTimeout(500);

    // Verify links appear in manage view
    const manageLinksCount = page.locator('[data-component="episode-card-detail"]').count();
    expect(manageLinksCount).toBeGreaterThan(0);

    // Close modal
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Verify DetailView shows language chips (indicating links are present)
    const langChips = page.locator('[data-component="episode-card-detail-languages"]').count();
    expect(langChips).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run the test**

```bash
docker compose down && docker compose up -d --build
# Wait for container to be ready
docker exec stream-flix-frontend npx playwright test .playwright-mcp/link-store-rework.spec.js --reporter=line
```

Expected: test should pass after the implementation.

---

## Task 4: Verify with Playwright

- [ ] **Step 1: Run the test from Task 3**

Confirm it passes.

- [ ] **Step 2: Manual smoke test**

1. Open a show detail
2. Open `LinkEpisodesModal`
3. Add links to a season
4. Switch to Manage tab — links should appear
5. Switch back to DetailView — links should still be visible (language chips)
6. Delete a link in Manage tab
7. Return to DetailView — deleted link should no longer appear

---

## Verification Checklist

- [ ] `mediaStore.refreshLinksForShow` calls `_patchCurrentItemVideoUrls`
- [ ] `ManageLinksView` has no `reaction` import or forceRender
- [ ] Playwright test passes
- [ ] Manual smoke test passes
- [ ] No console errors in browser
- [ ] `git commit` with all changes

---

## Commit

```bash
git add frontend/store/mediaStore.js frontend/components/library/ManageLinksView.jsx .playwright-mcp/link-store-rework.spec.js
git commit -m "fix: patch currentSelectedItem.video_urls after link mutations

After refreshLinksForShow updates libraryStore.mediaLinks, also patch
the in-memory currentSelectedItem episodes so DetailView sees the new
links immediately without a page refresh.

Also remove the redundant MobX reaction from ManageLinksView — the
observable Map reads in the observer render body are already tracked.
"
```
