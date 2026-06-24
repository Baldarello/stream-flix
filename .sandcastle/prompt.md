# Task

Fix the real-time link refresh bug in this React + MobX application.

## Bug Description
When adding links via `LinkEpisodesModal.jsx`, switching to `ManageLinksView.jsx` tab shows no newly added links. The links are saved to the database but the UI doesn't update until page refresh.

## Key Files to Investigate
1. `frontend/store/libraryStore.js` — MobX store with `mediaLinks` Map
2. `frontend/store/mediaStore.js` — has `refreshLinksForShow()` method  
3. `frontend/services/linkService.js` — has `addLinksToMedia()`, `buildLinksForSeason()`
4. `frontend/components/library/ManageLinksView.jsx` — displays links
5. `frontend/components/modals/LinkEpisodesModal.jsx` — where links are added

## How to Fix
1. READ files using: `$ cat frontend/store/libraryStore.js`
2. UNDERSTAND the code flow: LinkEpisodesModal → setEpisodeLinksForSeason → refreshLinksForShow
3. WRITE fixed files using ONLY this format:
```
$ write frontend/path/file.js << 'EOF'
// full file content here
EOF
```
4. COMMIT when done: `$ bash -c "git add . && git commit -m 'fix: description'"`

## Important Rules
- Use `> file` or `tee` for writing files, NEVER `>>` (append)
- Write the COMPLETE file content, not just snippets
- Read files with `cat` first to understand the exact structure
- After fixing, ALWAYS commit
- Output `<promise>COMPLETE</promise>` when committed
