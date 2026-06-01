# Project Rules

- Instead of reading all the project files all the time read the structure from graphify-out folder

## Coding rules frontend

- Main section of the software frontend are defined as Screens.
- Don't use useState but create mobx stores named after main Screen, all the variables and functions must be in that store, this mainly to prevent props drilling and useless components refresh.
- Components must be atomic, instead of creating a component with 800+ lines, divide it in smaller components.
- Always add to the components an id to identify it, examples <div id="main-container-tv" ../> 


## Development Environment

During the plan mode always add a test for the mcp playwright to run.

**Example with bug fixing**

1. You have a task to fix a specific issue caused by X steps done in sequence, find how to fix and write a test that will do the same X steps;
2. Restart docker with the commands `docker compose down` and then `docker compose up -d --build`;
3. Run the test after you applied the fix and be sure the bug is fixed, otherwise find a new fix and run the test again;
4. Iterate steps 1-3 until the bug is fixed.

**Example with a new feature**

1. You have a task to implement a new component with a specific logic, while planning the code also write a test to check the new logic;
2. Restart docker with the commands `docker compose down` and then `docker compose up -d --build`;
3. Run the test after you implemented the new code, if everything works it's good, otherwise find a fix and run the test again;
4. Iterate steps 1-3 until the bug is fixed.

### Pre-commit Verification
Before making a git commit after completing any task, you must perform the following verification steps:

1. **Build Docker image**: Run `docker build -t quix .` to build the Docker image from the Dockerfile in the project root
2. **Restart docker**: Run `docker compose down` and then `docker compose up -d --build`;
3. **Check Docker logs**: Start the containers and verify there are no errors in the logs
4. **Test frontend with Playwright**: Open the frontend application using Playwright at http://localhost:3002/, login as guest, and verify there are no console errors
5. **Verify no errors**: Confirm that all verification steps pass before proceeding to commit

Only after all verification steps pass should you proceed with the git commit workflow.

### Git Commit on Task Completion
After completing each task, perform a git commit with an automatic commit message following these steps:

1. **Check git status**: Use `git status` via JetBrains terminal to identify modified files
2. **Stage changes**: Stage all modified files using `git add`
3. **Generate commit message**: Analyze the changes and generate a descriptive commit message following conventional commits format:
   - Format: `<type>(<scope>): <description>` or `<type>: <description>`
   - Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`, `ci`
   - Description: brief summary in Italian or English based on the issue language
4. **Create commit**: Use `git commit -m "<message>"` via JetBrains terminal

Use JetBrains MCP terminal commands (`mcp__jetbrains__execute_terminal_command`) to execute git operations.

For every change run `graphify export callflow-html` to update the structure.

## Semantic graph (graphify)

This repo ships a precomputed semantic index in `graphify-out/`. Before running
any graphify command that needs to *rebuild* the graph, set your API key:

    copy graphify.env.example graphify.env
    # edit graphify.env to set GEMINI_API_KEY=...

Useful commands (read-only, no key needed once `graph.json` exists):

    graphify query "how does the watch-together room sync playback?"
    graphify explain MediaStore
    graphify path frontend/components/VideoPlayer.tsx backend/src/wss.ts
    graphify tree
    graphify export callflow-html

The post-commit hook (`graphify hook install`) keeps the graph fresh locally;
the committed `graphify-out/` is the shared source of truth.
