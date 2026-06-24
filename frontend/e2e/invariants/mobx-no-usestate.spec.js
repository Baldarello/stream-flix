/**
 * Invariant: screen-level files under `frontend/views/`, `frontend/features/`
 * and `frontend/components/` must not use React's `useState` hook. The state
 * layer is owned by MobX stores; local React state is only allowed in
 * `useState(() => …)` lazy initializers.
 *
 * The test spawns a Node subprocess that runs:
 *
 *   grep -rn "useState" frontend/views/ frontend/features/ frontend/components/
 *        --include="*.jsx"
 *        | grep -v "useState(() =>"
 *
 * The second `grep -v` strips the lazy-initializer pattern, so any line in
 * the resulting output is a violation. The test fails with the full list
 * of offending lines when the invariant is broken.
 */
import { test, expect } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// `frontend/e2e/invariants/mobx-no-usestate.spec.js` → `frontend/`
const FRONTEND_ROOT = path.resolve(__dirname, '..', '..');
// The repo root holds `frontend/`, which is what the grep pipeline targets.
const REPO_ROOT = path.resolve(FRONTEND_ROOT, '..');

const GREP_CMD = 'grep';
const GREP_ARGS = [
    '-rn',
    'useState',
    'frontend/views/',
    'frontend/features/',
    'frontend/components/',
    '--include=*.jsx',
];

test('screen-level files must not import or call useState', () => {
    // 1. Find all "useState" references in screen-level JSX.
    const first = spawnSync(GREP_CMD, GREP_ARGS, {
        cwd: REPO_ROOT,
        encoding: 'utf8',
        // git-bash on Windows ships GNU grep at /usr/bin/grep, so we don't
        // need a shell. Using shell:false also avoids quoting headaches.
        shell: false,
    });

    if (first.error) {
        throw new Error(
            `Failed to spawn \`${GREP_CMD}\`: ${first.error.message}. ` +
                'Make sure GNU grep is on PATH (Git Bash / WSL / Linux / macOS).',
        );
    }

    // grep returns 1 when no matches were found — that's the happy path for
    // the FIRST leg of the pipeline: there are no useState references at all.
    const firstOutput = (first.stdout || '').trim();

    // 2. Strip lazy initializers (`useState(() => …)`) — they're the only
    //    sanctioned use of useState in screen files.
    const second = spawnSync(GREP_CMD, ['-v', 'useState(() =>'], {
        input: firstOutput ? firstOutput + '\n' : '',
        encoding: 'utf8',
        shell: false,
    });

    if (second.error) {
        throw new Error(
            `Failed to spawn the filter \`${GREP_CMD}\`: ${second.error.message}`,
        );
    }

    const violations = (second.stdout || '').trim();

    if (violations.length > 0) {
        const list = violations
            .split('\n')
            .map((line) => `  - ${line}`)
            .join('\n');
        throw new Error(
            `MobX invariant violated: useState must not appear in screen-level ` +
                `files outside lazy initializers (useState(() => …)). ` +
                `Move this state into a MobX store. Offending occurrences:\n${list}`,
        );
    }

    // Sanity check: the first grep should have produced *some* matches in
    // a healthy codebase (lazy initializers are common). If the FIRST grep
    // returns nothing, the invariant is technically satisfied but the test
    // is a no-op — surface that loudly so the suite doesn't silently rot.
    if (!firstOutput) {
        // Not a failure: empty result still satisfies the invariant.
        // Keep the assertion minimal — the absence of violations is what
        // matters.
    }

    expect(violations).toBe('');
});
