/**
 * Unit tests for the a11y helper. We mock @axe-core/playwright so the
 * tests can run without installing the (heavy) browser-driven stack,
 * and we exercise the pure report/formatting logic directly.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@axe-core/playwright', () => {
    return {
        default: class FakeAxeBuilder {
            constructor({ page }) {
                this.page = page;
                this._options = null;
            }
            options(options) {
                this._options = options;
                return this;
            }
            async analyze() {
                if (this.page && typeof this.page._analyze === 'function') {
                    return this.page._analyze(this._options);
                }
                return { violations: [] };
            }
        },
    };
});

const { expectNoA11yViolations, formatViolationsReport, __testing } = await import(
    '../../e2e/utils/a11y-helper.js'
);

function makeViolation(overrides = {}) {
    return {
        id: 'image-alt',
        impact: 'critical',
        description: 'Images must have alt text',
        help: 'Images must have alternate text',
        helpUrl: 'https://dequeuniversity.com/rules/axe/4.7/image-alt',
        nodes: [
            {
                target: ['main > img.hero'],
                html: '<img src="/hero.png">',
                failureSummary: 'Fix any of the following:\n  Element does not have an alt attribute',
            },
        ],
        ...overrides,
    };
}

function makePage(analyzeImpl) {
    return { _analyze: analyzeImpl };
}

describe('a11y-helper', () => {
    describe('formatViolationsReport', () => {
        it('returns a pass message for an empty list', () => {
            const out = formatViolationsReport([]);
            expect(out).toMatch(/passed/i);
            expect(out).toContain('0');
        });

        it('lists every violation with id, impact, help, and docs link', () => {
            const v = makeViolation();
            const out = formatViolationsReport([v]);
            expect(out).toContain('[critical]');
            expect(out).toContain('image-alt');
            expect(out).toContain('Images must have alternate text');
            expect(out).toContain('https://dequeuniversity.com/rules/axe/4.7/image-alt');
        });

        it('renders node target, html snippet, and fix hint for each node', () => {
            const v = makeViolation();
            const out = formatViolationsReport([v]);
            expect(out).toContain('main > img.hero');
            expect(out).toContain('<img src="/hero.png">');
            expect(out).toContain('Fix any of the following:');
        });

        it('handles multiple rules and aggregates node counts', () => {
            const v1 = makeViolation({ id: 'image-alt', impact: 'critical' });
            const v2 = makeViolation({
                id: 'color-contrast',
                impact: 'serious',
                nodes: [
                    { target: ['p.lead'], html: '<p class="lead">x</p>', failureSummary: 'fix' },
                    {
                        target: ['span.cta'],
                        html: '<span class="cta">y</span>',
                        failureSummary: 'fix',
                    },
                ],
            });
            const out = formatViolationsReport([v1, v2]);
            expect(out).toMatch(/2 blocking rules/);
            expect(out).toMatch(/3 nodes/);
            expect(out).toContain('[1]');
            expect(out).toContain('[2]');
        });

        it('singularizes "rule" / "node" when counts are 1', () => {
            const single = makeViolation();
            const out = formatViolationsReport([single]);
            expect(out).toMatch(/1 blocking rule affecting 1 node/);
        });

        it('joins multi-element target arrays with spaces', () => {
            const v = makeViolation({
                nodes: [
                    {
                        target: ['div', 'a', 'span.icon'],
                        html: '<span>x</span>',
                        failureSummary: 'f',
                    },
                ],
            });
            const out = formatViolationsReport([v]);
            expect(out).toContain('div a span.icon');
        });

        it('truncates very long html snippets to keep reports readable', () => {
            const longHtml = '<div>' + 'x'.repeat(500) + '</div>';
            const v = makeViolation({ nodes: [{ target: ['div'], html: longHtml, failureSummary: '' }] });
            const out = formatViolationsReport([v]);
            expect(out.length).toBeLessThan(800);
            expect(out).toContain('…');
        });

        it('omits fix hint when failureSummary is missing', () => {
            const v = makeViolation({ nodes: [{ target: ['a'], html: '<a/>' }] });
            const out = formatViolationsReport([v]);
            expect(out).not.toContain('fix:');
        });

        it('coerces missing target to a friendly placeholder', () => {
            const v = makeViolation({ nodes: [{ html: '<x/>' }] });
            const out = formatViolationsReport([v]);
            expect(out).toContain('(unknown target)');
        });
    });

    describe('expectNoA11yViolations', () => {
        beforeEach(() => {
            vi.clearAllMocks();
        });

        it('resolves silently when there are zero blocking violations', async () => {
            const page = makePage(async () => ({
                violations: [
                    makeViolation({ impact: 'minor' }),
                    makeViolation({ id: 'label', impact: 'moderate' }),
                ],
            }));
            await expect(expectNoA11yViolations(page)).resolves.toBeUndefined();
        });

        it('passes excluded tags as runOnly.exclude to AxeBuilder', async () => {
            let captured = null;
            const page = makePage(async (opts) => {
                captured = opts;
                return { violations: [] };
            });
            await expectNoA11yViolations(page, { excludedTags: ['region', 'best-practice'] });
            expect(captured).toEqual({
                runOnly: { type: 'exclude', values: ['region', 'best-practice'] },
            });
        });

        it('uses the default excludedTags when none are provided', async () => {
            let captured = null;
            const page = makePage(async (opts) => {
                captured = opts;
                return { violations: [] };
            });
            await expectNoA11yViolations(page);
            expect(captured).toEqual({
                runOnly: { type: 'exclude', values: ['region'] },
            });
        });

        it('skips the runOnly option when excludedTags is an empty array', async () => {
            let captured = 'not-called';
            const page = makePage(async (opts) => {
                captured = opts;
                return { violations: [] };
            });
            await expectNoA11yViolations(page, { excludedTags: [] });
            expect(captured).toBeNull();
        });

        it('throws a descriptive Error when a critical violation is found', async () => {
            const page = makePage(async () => ({
                violations: [makeViolation({ impact: 'critical' })],
            }));
            await expect(expectNoA11yViolations(page)).rejects.toThrow(
                /Accessibility audit failed/
            );
        });

        it('throws a descriptive Error when a serious violation is found', async () => {
            const page = makePage(async () => ({
                violations: [makeViolation({ impact: 'serious' })],
            }));
            await expect(expectNoA11yViolations(page)).rejects.toThrow(/blocking rule/);
        });

        it('error message lists every failing node with its target and html', async () => {
            const page = makePage(async () => ({
                violations: [
                    makeViolation({
                        impact: 'critical',
                        nodes: [
                            {
                                target: ['img.a'],
                                html: '<img class="a">',
                                failureSummary: 'add alt',
                            },
                            {
                                target: ['img.b'],
                                html: '<img class="b">',
                                failureSummary: 'add alt',
                            },
                        ],
                    }),
                ],
            }));
            let err;
            try {
                await expectNoA11yViolations(page);
            } catch (e) {
                err = e;
            }
            expect(err).toBeDefined();
            expect(err.message).toContain('img.a');
            expect(err.message).toContain('<img class="a">');
            expect(err.message).toContain('img.b');
            expect(err.message).toContain('<img class="b">');
            expect(err.message).toContain('add alt');
        });

        it('rejects a missing page argument with a clear error', async () => {
            await expect(expectNoA11yViolations(null)).rejects.toThrow(/`page` argument is required/);
            await expect(expectNoA11yViolations(undefined)).rejects.toThrow(
                /`page` argument is required/
            );
        });
    });

    describe('normalizeExcludedTags', () => {
        it('returns the default tags when nothing is passed', () => {
            expect(__testing.normalizeExcludedTags(undefined)).toEqual(['region']);
            expect(__testing.normalizeExcludedTags(null)).toEqual(['region']);
        });

        it('wraps a single string in an array', () => {
            expect(__testing.normalizeExcludedTags('best-practice')).toEqual(['best-practice']);
        });

        it('trims and drops empty entries', () => {
            expect(__testing.normalizeExcludedTags(['  region  ', '', 'wcag2a'])).toEqual([
                'region',
                'wcag2a',
            ]);
        });
    });
});
