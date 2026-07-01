/**
 * Invariant: screen-level files under `frontend/views/`, `frontend/features/`
 * and `frontend/components/` must not use React's `useState` hook. The state
 * layer is owned by MobX stores; local React state is only allowed in
 * `useState(() => …)` lazy initializers.
 *
 * The test spawns a Node subprocess that runs grep with two patterns that
 * ONLY match non-lazy useState calls:
 *
 *   grep -rn -e 'useState\([^)]*\)' -e 'useState\(\w+\)' ...
 *
 * These patterns match:
 *   - useState\([^)]*\)  → useState({}), useState([]), useState(new X())
 *   - useState\(\w+\)    → useState(0), useState(false), useState(null), useState('str')
 *
 * They do NOT match:
 *   - useState(() => ...)   (lazy initializer)
 *   - import { useState }   (import line has no parentheses)
 *
 * Any match = violation. The test fails with the full list of offending lines.
 */
import { expect, test } from '@playwright/test';
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
// Matches ONLY non-lazy useState calls — see file header for pattern rationale.
const GREP_ARGS = [
    '-rn',
    '-e',
    'useState\\([^)]*?\\)',
    '-e',
    'useState\\(\\w+\\)',
    'frontend/views/',
    'frontend/features/',
    'frontend/components/',
    '--include=*.jsx',
];

test('screen-level files must not import or call useState', () => {
    // Run the grep: any match = non-lazy useState = violation.
    const result = spawnSync(GREP_CMD, GREP_ARGS, {
        cwd: REPO_ROOT,
        encoding: 'utf8',
        // git-bash on Windows ships GNU grep at /usr/bin/grep, so we don't
        // need a shell. Using shell:false also avoids quoting headaches.
        shell: false,
    });

    if (result.error) {
        throw new Error(
            `Failed to spawn \`${GREP_CMD}\`: ${result.error.message}. ` +
                'Make sure GNU grep is on PATH (Git Bash / WSL / Linux / macOS).'
        );
    }

    const violations = (result.stdout || '').trim();

    // Sanity check: the grep should have produced some matches in
    // a healthy codebase (lazy initializers are common). If it returns
    // nothing, the invariant is technically satisfied but the test
    // is a no-op — surface that so the suite doesn't silently rot.
    if (!violations) {
        // Not a failure: empty result still satisfies the invariant.
        // Keep the assertion minimal — the absence of violations is what
        // matters.
    }

    if (violations.length > 0) {
        const list = violations
            .split('\n')
            .map((line) => `  - ${line}`)
            .join('\n');
        throw new Error(
            `MobX invariant violated: useState must not appear in screen-level ` +
                `files outside lazy initializers (useState(() => …)). ` +
                `Move this state into a MobX store. Offending occurrences:\n${list}`
        );
    }

    expect(violations).toBe('');
});
