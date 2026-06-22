# StreamFlix — Playwright Test Configuration

Drives automated test loop: bundle → test → log bugs → fix → repeat.

---

## App Under Test

| Field | Value |
|---|---|
| **URL** | http://localhost:3002 |
| **Bundle command** | npm run bundle |
| **EXE** (optional) | n/a |

---

## Bundle Command

```bash
npm run bundle
```

Steps:
1. `docker compose down` (stop containers)
2. `docker compose up -d --build` (rebuild and start containers)

---

## Test Prompts

### Prompt 1 — Smoke: App loads
**Goal:** Verify the Streamflix app loads and the main UI is visible.
**Steps:**
1. Navigate to http://localhost:3002
2. Wait for the main page to load
3. Check that the page has loaded (body visible)
**Pass criteria:** Body element exists, no crash error in console

### Prompt 2 — Add links via pattern, switch to Manage tab, verify links appear without reload
**Goal:** Links added via LinkEpisodesModal Pattern method appear immediately in ManageLinksView after tab switch, without page reload.
**Steps:**
1. Navigate to http://localhost:3002
2. Open any show that has seasons/episodes
3. Click the "Link Episodes" button/modal trigger
4. In the modal, select a season
5. In the "Add" tab, enter a URL pattern like `https://srv18-tsurukusa.sweetpixel.org/DDL/ANIME/DrStone4ITA/DrStone4_Ep_[@EP]_ITA.mp4`
6. Click the [@EP] button to insert the placeholder
7. Click Save and wait for the success snackbar
8. Click the "Manage" tab (do NOT reload the page)
9. Verify links appear in the episode accordion list for that season
**Pass criteria:** Episode accordion shows link count > 0, links are visible in the DOM without reload

### Prompt 3 — Add links via List method, verify in Manage tab without reload
**Goal:** Links added via List method appear immediately in Manage tab without page reload.
**Steps:**
1. Navigate to http://localhost:3002
2. Open a show, open LinkEpisodesModal
3. Switch to List tab, enter multiple URLs (one per line)
4. Click Save
5. Switch to Manage tab WITHOUT reloading
6. Verify links appear
**Pass criteria:** Links visible in Manage tab DOM

### Prompt 4 — Add links via JSON method, verify in Manage tab without reload
**Goal:** Links added via JSON method appear immediately in Manage tab without page reload.
**Steps:**
1. Navigate to http://localhost:3002
2. Open a show, open LinkEpisodesModal
3. Switch to JSON tab, enter a JSON array of link objects
4. Click Save
5. Switch to Manage tab WITHOUT reloading
6. Verify links appear
**Pass criteria:** Links visible in Manage tab DOM

### Prompt 5 — Delete a link, verify removal without reload
**Goal:** Deleting a link from Manage tab removes it from the DOM immediately without page reload.
**Steps:**
1. Navigate to http://localhost:3002
2. Open a show with linked episodes, open LinkEpisodesModal
3. Switch to Manage tab
4. Expand an episode accordion that has links
5. Click the delete icon on one link
6. Confirm deletion in the dialog
7. Verify the link is no longer visible in the DOM
**Pass criteria:** Deleted link absent from DOM, link count decreased

### Prompt 6 — Edit a link, verify update without reload
**Goal:** Editing a link in Manage tab shows the updated value immediately without page reload.
**Steps:**
1. Navigate to http://localhost:3002
2. Open a show with linked episodes, open LinkEpisodesModal
3. Switch to Manage tab
4. Expand an episode accordion with links
5. Click the edit icon on a link
6. Change the URL or label
7. Click Save
8. Verify the link shows the new value in the DOM
**Pass criteria:** Edited link displays new value, no reload needed

---

## Errors Output

`ERRORS.md` bug card format (constant):

```markdown
## [BUG-###] — Short Title

**Severity:** critical | major | minor

**Test Prompt:** Prompt N (name)

**File:** path/to/file.js

**Symptom:** What was observed in browser/app.

**Steps to Reproduce:**
1. Step one
2. Step two

**Expected:** What should happen.

**Actual:** What actually happened.

**Suggested Fix:** How to fix (optional).
```

---

## Test Loop Protocol

1. Bundle → `npm run bundle`
2. Wait for URL ready (poll HTTP HEAD, 30s timeout)
3. Run prompts in order
4. Log bugs to ERRORS.md
5. If bugs: fix → bundle → repeat (max 5 iterations)
6. If clean: done

---

## Notes

- Frontend: http://localhost:3002 (docker compose maps 3002→3000)
- Backend API: http://localhost:3000
- Links stored in Dexie IndexedDB (`mediaLinks` table)
- MobX stores: `libraryStore.mediaLinks` (Map), `mediaStore` (facade)
- Key fix: `libraryStore.mediaLinks.get(String(ep.id))` in ManageLinksView — type mismatch (number vs string key)
