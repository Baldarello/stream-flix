/**
 * Accessibility test helper built on top of @axe-core/playwright.
 *
 * Usage:
 *   import { expectNoA11yViolations } from './utils/a11y-helper.js';
 *
 *   test('home page is accessible', async ({ page }) => {
 *     await page.goto('/');
 *     await expectNoA11yViolations(page);
 *   });
 *
 * The helper runs axe-core against the current page, optionally excludes
 * axe tags (default: `['region']`) from the run, and asserts that no
 * `critical` or `serious` violations were found. On failure it throws
 * an `Error` containing every offending node, the rule that flagged it,
 * and a link to the documentation so a human can fix the regression.
 *
 * `moderate` and `minor` impacts are reported as warnings but never
 * fail the assertion — they are noisy and don't block merges.
 */

// @axe-core/playwright is intentionally loaded via a dynamic import so the
// helper can be unit-tested in isolation (the pure formatting helpers don't
// need a browser) and so the module isn't required to be installed when
// running unrelated tests. The real package is loaded on the first call.
const DEFAULT_EXCLUDED_TAGS = ['region'];
const BLOCKING_IMPACTS = new Set(['critical', 'serious']);

let axeBuilderModulePromise = null;
async function loadAxeBuilder() {
    if (!axeBuilderModulePromise) {
        axeBuilderModulePromise = import('@axe-core/playwright');
    }
    return axeBuilderModulePromise;
}

/**
 * Assert that the given Playwright page has no `critical` or `serious`
 * axe-core violations. Throws an `Error` with a detailed report when
 * any such violation is detected.
 *
 * @param {import('@playwright/test').Page} page
 *   The Playwright page under test. Must already be navigated.
 * @param {Object} [options]
 * @param {string[]} [options.excludedTags=['region']]
 *   Axe tags to exclude from the run (passed as
 *   `runOnly: { type: 'exclude' }`). Pass `[]` to disable exclusions.
 * @returns {Promise<void>} Resolves when the page passes the audit.
 * @throws {Error} When at least one critical/serious violation is found.
 */
export async function expectNoA11yViolations(page, options = {}) {
    if (!page) {
        throw new Error('expectNoA11yViolations: `page` argument is required');
    }

    const excluded = normalizeExcludedTags(options.excludedTags);

    const { default: AxeBuilder } = await loadAxeBuilder();
    const builder = new AxeBuilder({ page });
    if (excluded.length > 0) {
        builder.options({ runOnly: { type: 'exclude', values: excluded } });
    }

    const results = await builder.analyze();
    const blocking = (results.violations || []).filter((v) =>
        BLOCKING_IMPACTS.has(v.impact)
    );

    if (blocking.length === 0) {
        return;
    }

    throw new Error(formatViolationsReport(blocking));
}

/**
 * Build a human-readable report of axe violations.
 *
 * Exported for unit tests — production code goes through
 * `expectNoA11yViolations`. Pure function: no I/O.
 *
 * @param {Array<Object>} violations
 *   Subset of `AxeResults.violations` to render.
 * @returns {string} A multi-line report ready to throw.
 */
export function formatViolationsReport(violations) {
    if (!Array.isArray(violations) || violations.length === 0) {
        return 'Accessibility audit passed: 0 blocking violations.';
    }

    const totalNodes = violations.reduce((sum, v) => sum + (v.nodes?.length ?? 0), 0);
    const ruleWord = violations.length === 1 ? 'rule' : 'rules';
    const nodeWord = totalNodes === 1 ? 'node' : 'nodes';

    const header =
        `Accessibility audit failed: ${violations.length} blocking ${ruleWord} ` +
        `affecting ${totalNodes} ${nodeWord}.`;

    const sections = violations.map((v, i) => {
        const ruleHeader = `  ${i + 1}. [${v.impact ?? 'unknown'}] ${v.id} — ${v.help ?? '(no help text)'}`;
        const ruleDocs = v.helpUrl ? `     docs: ${v.helpUrl}` : '';
        const nodesBlock = (v.nodes || [])
            .map((n, j) => formatNode(n, j))
            .filter(Boolean)
            .join('\n');
        return [ruleHeader, ruleDocs, nodesBlock].filter(Boolean).join('\n');
    });

    return [header, ...sections].join('\n\n') + '\n';
}

function formatNode(node, index) {
    if (!node) return '';
    const target = Array.isArray(node.target)
        ? node.target.map(String).join(' ')
        : String(node.target ?? '(unknown target)');
    const html = truncate(normalizeWhitespace(node.html), 200);
    const summary = node.failureSummary
        ? normalizeWhitespace(node.failureSummary).replace(/\n+/g, ' ')
        : '';
    const lines = [
        `      [${index + 1}] target: ${target}`,
        `          html:   ${html}`,
    ];
    if (summary) {
        lines.push(`          fix:    ${summary}`);
    }
    return lines.join('\n');
}

function normalizeExcludedTags(tags) {
    if (tags === undefined || tags === null) {
        return [...DEFAULT_EXCLUDED_TAGS];
    }
    const list = Array.isArray(tags) ? tags : [tags];
    return list.map((t) => String(t).trim()).filter(Boolean);
}

function normalizeWhitespace(s) {
    return String(s ?? '').replace(/\s+/g, ' ').trim();
}

function truncate(s, max) {
    return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

export const __testing = {
    normalizeExcludedTags,
    normalizeWhitespace,
    truncate,
    BLOCKING_IMPACTS,
};
