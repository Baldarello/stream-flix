# Task

Fix the real-time link refresh bug in this React + MobX application.

## Bug
When adding links via `LinkEpisodesModal.jsx`, switching to `ManageLinksView.jsx` tab shows no newly added links. Page refresh doesn't fix it.

## Key files
- `frontend/store/libraryStore.js` — MobX store with `mediaLinks` Map
- `frontend/store/mediaStore.js` — has `refreshLinksForShow()` method  
- `frontend/services/linkService.js` — has `addLinksToMedia()`, `buildLinksForSeason()`
- `frontend/components/library/ManageLinksView.jsx` — displays links
- `frontend/components/modals/LinkEpisodesModal.jsx` — where links are added

## Your job
1. READ these files using shell commands
2. FIND the bug
3. FIX it by editing the files
4. COMMIT with `git add . && git commit -m "fix: description"`

## Important
- Use shell commands: `$ bash -c "cat file"`, `$ bash -c "grep pattern file"`, etc.
- Use `$ bash -c "echo 'content' > file"` to WRITE (overwrite) files
- Do NOT use `>>` (append) — it will break files
- After fixing, always commit
- Output `<promise>COMPLETE</promise>` when done
