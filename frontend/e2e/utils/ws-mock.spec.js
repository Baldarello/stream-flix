/**
 * Self-test for the `ws-mock` Playwright helper.
 *
 * These tests don't talk to a real backend: they install the
 * fake `WebSocket` constructor, drive it from Node, and assert
 * that the page's app code sees the expected messages.
 *
 * They also exercise the helper's own plumbing (handler stringification,
 * `exposeFunction`-free design, etc.) so future refactors of
 * `ws-mock.js` can be validated here.
 */
import { test, expect } from '@playwright/test';
import { mockWebSocket } from './ws-mock';

test.describe('ws-mock', () => {
    test('replaces window.WebSocket before app code runs', async ({ page }) => {
        const ws = await mockWebSocket(page);

        // We do NOT navigate to the real app here — we just need the
        // init script to be installed on a real browsing context.
        await page.goto('about:blank');

        const replaced = await page.evaluate(
            () => window.WebSocket?.toString().includes('MockWebSocket'),
        );
        expect(replaced).toBe(true);

        // Constructing a WebSocket from the page should now hit the mock.
        const constructed = await page.evaluate(() => {
            const sock = new window.WebSocket('ws://example.invalid/test');
            sock.close();
            return {
                url: sock.url,
                count: window.__wsMockCount,
                sameInstance: window.__wsMockLast === sock,
            };
        });
        expect(constructed.url).toBe('ws://example.invalid/test');
        expect(constructed.count).toBe(1);
        expect(constructed.sameInstance).toBe(true);
    });

    test('auto-opens the connection and lets the app send messages', async ({
        page,
    }) => {
        const ws = await mockWebSocket(page);
        await page.goto('about:blank');

        const readyState = await page.evaluate(async () => {
            const sock = new window.WebSocket('ws://example.invalid');
            // Wait one microtask tick for the auto-open to fire.
            await Promise.resolve();
            await Promise.resolve();
            return sock.readyState;
        });

        expect(readyState).toBe(1); // OPEN

        // App code can now send.
        await page.evaluate(() => {
            window.__wsMockLast.send('hello from app');
        });
        const sent = await ws.sentMessages();
        expect(sent).toEqual(['hello from app']);
    });

    test('simulateServerMessage delivers a MessageEvent to the app', async ({
        page,
    }) => {
        const ws = await mockWebSocket(page);
        await page.goto('about:blank');

        await page.evaluate(() => {
            const sock = new window.WebSocket('ws://example.invalid');
            window.__lastMessage = null;
            sock.addEventListener('message', (ev) => {
                window.__lastMessage = ev.data;
            });
        });

        await ws.simulateServerMessage({ type: 'greeting', payload: { hi: 1 } });

        const received = await page.evaluate(() => window.__lastMessage);
        expect(JSON.parse(received)).toEqual({ type: 'greeting', payload: { hi: 1 } });
    });

    test('onSend handler can auto-reply via mockServerMessage', async ({
        page,
    }) => {
        // The handler is a Node-side function but it gets stringified and
        // rehydrated in the page. It receives the real MockWebSocket
        // instance, so it can call mockServerMessage directly.
        const ws = await mockWebSocket(page, {
            onSend: (mockWs, data) => {
                try {
                    const msg = JSON.parse(data);
                    if (msg.type === 'ping') {
                        mockWs.mockServerMessage({ type: 'pong' });
                    }
                } catch {
                    /* ignore non-JSON */
                }
            },
        });
        await page.goto('about:blank');

        const replied = await page.evaluate(
            () =>
                new Promise((resolve) => {
                    const sock = new window.WebSocket('ws://example.invalid');
                    sock.addEventListener('message', (ev) => {
                        try {
                            resolve(JSON.parse(ev.data).type);
                        } catch {
                            resolve(null);
                        }
                    });
                    // Wait for auto-open before sending.
                    setTimeout(() => sock.send(JSON.stringify({ type: 'ping' })), 5);
                }),
        );

        expect(replied).toBe('pong');
    });

    test('simulateServerClose fires a close event with the given code', async ({
        page,
    }) => {
        await mockWebSocket(page);
        await page.goto('about:blank');

        const result = await page.evaluate(
            () =>
                new Promise((resolve) => {
                    const sock = new window.WebSocket('ws://example.invalid');
                    sock.addEventListener('close', (ev) => {
                        resolve({ code: ev.code, reason: ev.reason });
                    });
                    setTimeout(
                        () => sock.mockServerClose(4001, 'bye'),
                        5,
                    );
                }),
        );
        expect(result).toEqual({ code: 4001, reason: 'bye' });
    });

    test('send() before open throws (matches real WebSocket behavior)', async ({
        page,
    }) => {
        await mockWebSocket(page, { autoOpen: false });
        await page.goto('about:blank');

        const threw = await page.evaluate(() => {
            const sock = new window.WebSocket('ws://example.invalid');
            try {
                sock.send('too early');
                return false;
            } catch (e) {
                return e.message;
            }
        });
        expect(threw).toMatch(/send\(\) called before connection was opened/);
    });

    test('messages sent before open are buffered and delivered on open', async ({
        page,
    }) => {
        await mockWebSocket(page, { autoOpen: false });
        await page.goto('about:blank');

        const received = await page.evaluate(
            () =>
                new Promise((resolve) => {
                    const sock = new window.WebSocket('ws://example.invalid');
                    const captured = [];
                    sock.addEventListener('message', (ev) => {
                        captured.push(ev.data);
                        if (captured.length === 2) resolve(captured);
                    });
                    // Server pushes two messages while the socket is still CONNECTING.
                    sock.mockServerMessage('first');
                    sock.mockServerMessage('second');
                    // Then it opens — buffered messages should be delivered.
                    sock.mockServerOpen();
                }),
        );
        expect(received).toEqual(['first', 'second']);
    });
});
