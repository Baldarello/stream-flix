# Bug Fix Task

Fix the real-time link refresh bug in this React + MobX application.

## Bug Description
When adding links via `LinkEpisodesModal.jsx`, switching to `ManageLinksView.jsx` tab shows no newly added links. The links are saved to the database but the UI doesn't update until page refresh.

## Key Files
1. `frontend/store/libraryStore.js` — MobX store with `mediaLinks` Map
2. `frontend/store/mediaStore.js` — has `refreshLinksForShow()` method
3. `frontend/services/linkService.js` — has `addLinksToMedia()`, `buildLinksForSeason()`
4. `frontend/components/library/ManageLinksView.jsx` — displays links
5. `frontend/components/modals/LinkEpisodesModal.jsx` — where links are added

## STEP 1: READ THE CODE
You MUST read these exact files using cat before making ANY changes:
```
cat frontend/store/libraryStore.js
cat frontend/store/mediaStore.js
cat frontend/services/linkService.js
cat frontend/components/library/ManageLinksView.jsx
cat frontend/components/modals/LinkEpisodesModal.jsx
```

## STEP 2: IDENTIFY THE BUG
After reading, identify the exact issue in the MobX reactive flow. The bug is that when links are added, the UI doesn't update until page refresh.

## STEP 3: WRITE THE FIX
Use this EXACT heredoc format for each file you modify:
```
$ write frontend/path/file.js << EOF
// COMPLETE file content here - every line, no truncation
EOF
```

## STEP 4: COMMIT
After ALL file writes are complete, run:
```
bash -c "git add . && git commit -m 'fix: real-time link refresh bug'"
```

## RULES - FOLLOW EXACTLY
1. DO NOT output any completion signal until AFTER the git commit succeeds
2. DO NOT give generic advice - analyze the actual code and fix the specific bug
3. DO NOT use useState - this project uses MobX stores per project rules
4. DO NOT reformat code - only make targeted changes that fix the bug
5. DO read files with cat first - you cannot fix what you haven't read
