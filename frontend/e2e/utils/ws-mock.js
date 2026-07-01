/**
 * WebSocket mock for Playwright E2E tests.
 *
 * `mockWebSocket(page, handlers)` installs a fake `window.WebSocket`
 * constructor in the page BEFORE the app's own scripts execute
 * (via `page.addInitScript`). The app's `new WebSocket(url)` calls
 * are intercepted, giving the test full control over the
 * server side of the connection: opening the socket, sending
 * messages, raising errors, and closing.
 *
 * The returned controller is the test's handle into the mock:
 *   - `lastInstance()`              - most recently created mock socket
 *   - `instances()`                 - every mock socket the app created
 *   - `count()`                     - number of sockets created
 *   - `sentMessages()`              - what the app sent (array of strings)
 *   - `simulateServerMessage(data)` - push a message to the app
 *   - `simulateServerOpen()`        - fire the open event
 *   - `simulateServerError(msg?)`   - fire an error event
 *   - `simulateServerClose(c?, r?)` - fire a close event
 *   - `clearSentMessages()`         - reset the sent-message buffer
 *
 * The optional `handlers` argument lets the test react to app-driven
 * events from inside the page:
 *   - `autoOpen`   (default true) - open the connection as soon as
 *                                   the app creates it
 *   - `onCreate(mockWs)`           - called when a new socket is created
 *   - `onSend(mockWs, data)`       - called after the app sends a message
 *   - `onClose(mockWs, code, reason)` - called when the socket closes
 *
 * Note: handlers are stringified and rehydrated in the page context, so
 * they run in the browser. They receive real `MockWebSocket` instances
 * and can call `mockServerMessage(...)` etc. directly on them.
 *
 * Example:
 *
 *   import { mockWebSocket } from './utils/ws-mock';
 *
 *   test('replies to join-room with a room-update', async ({ page }) => {
 *       const ws = await mockWebSocket(page, {
 *           onSend: (mockWs, data) => {
 *               if (data.includes('"type":"quix-join-room"')) {
 *                   setTimeout(() => mockWs.mockServerMessage({
 *                       type: 'quix-room-update',
 *                       payload: { participants: [] },
 *                   }), 0);
 *               }
 *           },
 *       });
 *
 *       await page.goto('/');
 *       const sent = await ws.sentMessages();
 *       expect(sent.some((m) => m.includes('"type":"quix-join-room"'))).toBe(true);
 *   });
 */

const STATES = { CONNECTING: 0, OPEN: 1, CLOSING: 2, CLOSED: 3 };

/**
 * Build the init-script source. Handlers are stringified so they can
 * be rehydrated in the page context (this is how the test injects
 * Node-side closures into the browser).
 */
function buildInstallScript(handlers) {
    const autoOpen = handlers.autoOpen !== false;
    const has = (k) => typeof handlers[k] === 'function';
    const fnAsString = (fn) => fn.toString();

    // The script body is built as an array of lines to avoid any
    // template-literal vs. comment-vs-string escaping issues. The user
    // handlers are stringified (Function.prototype.toString) and embedded
    // as raw function literals.
    const lines = [];
    const push = (s) => lines.push(s);

    push('(() => {');
    push('    if (window.__wsMockInstalled) return;');
    push('    window.__wsMockInstalled = true;');
    push('');
    push('    const userHandlers = {');
    push('        autoOpen: ' + JSON.stringify(autoOpen) + ',');
    if (has('onCreate')) {
        push('        onCreate: ' + fnAsString(handlers.onCreate) + ',');
    }
    if (has('onSend')) {
        push('        onSend: ' + fnAsString(handlers.onSend) + ',');
    }
    if (has('onClose')) {
        push('        onClose: ' + fnAsString(handlers.onClose) + ',');
    }
    push('    };');
    push('');
    push('    const STATES = { CONNECTING: 0, OPEN: 1, CLOSING: 2, CLOSED: 3 };');
    push('');
    push('    class MockWebSocket extends EventTarget {');
    push('        constructor(url, protocols) {');
    push('            super();');
    push('            this.url = url;');
    push('            this.protocols = protocols;');
    push('            this.readyState = STATES.CONNECTING;');
    push('            this.bufferedAmount = 0;');
    push("            this.extensions = '';");
    push("            this.binaryType = 'blob';");
    push('            this.sentMessages = [];');
    push('            this._listeners = { open: [], message: [], close: [], error: [] };');
    push('            this._pendingMessages = [];');
    push('');
    push('            window.__wsMockInstances.push(this);');
    push('            window.__wsMockLast = this;');
    push('            window.__wsMockCount = (window.__wsMockCount || 0) + 1;');
    push('');
    push("            // Defer side effects so the consumer's 'onopen = ...' and");
    push("            // 'addEventListener(open, ...)' calls take effect first.");
    push('            Promise.resolve().then(() => {');
    push('                try {');
    push('                    if (userHandlers.onCreate) userHandlers.onCreate(this);');
    push('                } catch (e) {');
    push("                    console.error('[ws-mock] onCreate threw:', e);");
    push('                }');
    push('                if (userHandlers.autoOpen !== false) {');
    push('                    this.mockServerOpen();');
    push('                    // Flush any messages that arrived before the open event');
    push('                    const pending = this._pendingMessages;');
    push('                    this._pendingMessages = [];');
    push('                    for (const m of pending) this.mockServerMessage(m);');
    push('                }');
    push('            });');
    push('        }');
    push('');
    push('        send(data) {');
    push('            if (this.readyState !== STATES.OPEN) {');
    push(
        "                throw new Error('MockWebSocket: send() called before connection was opened (readyState=' + this.readyState + ')');"
    );
    push('            }');
    push('            this.sentMessages.push(data);');
    push('            Promise.resolve().then(() => {');
    push('                try {');
    push('                    if (userHandlers.onSend) userHandlers.onSend(this, data);');
    push('                } catch (e) {');
    push("                    console.error('[ws-mock] onSend threw:', e);");
    push('                }');
    push('            });');
    push('        }');
    push('');
    push('        close(code = 1000, reason = "") {');
    push('            if (this.readyState === STATES.CLOSED) return;');
    push('            this.readyState = STATES.CLOSED;');
    push("            this._dispatch('close', { type: 'close', code, reason, wasClean: code === 1000 });");
    push('            try {');
    push('                if (userHandlers.onClose) userHandlers.onClose(this, code, reason);');
    push('            } catch (e) {');
    push("                console.error('[ws-mock] onClose threw:', e);");
    push('            }');
    push('        }');
    push('');
    push('        // --- Mock control methods (NOT part of standard WebSocket API) ---');
    push('');
    push('        /** Simulate a successful open. */');
    push('        mockServerOpen() {');
    push('            if (this.readyState === STATES.OPEN) return;');
    push('            this.readyState = STATES.OPEN;');
    push("            this._dispatch('open', { type: 'open' });");
    push('            // Flush any messages queued while the socket was CONNECTING.');
    push('            const pending = this._pendingMessages;');
    push('            this._pendingMessages = [];');
    push('            for (const m of pending) this.mockServerMessage(m);');
    push('        }');
    push('');
    push('        /**');
    push('         * Simulate a server-sent message. Objects are JSON.stringified');
    push('         * so the app sees a real MessageEvent.data string.');
    push('         * If the socket is not open yet, the message is buffered and');
    push('         * delivered when the socket opens.');
    push('         */');
    push('        mockServerMessage(data) {');
    push('            if (this.readyState !== STATES.OPEN) {');
    push('                this._pendingMessages.push(data);');
    push('                return;');
    push('            }');
    push('            const payload = typeof data === "string" ? data : JSON.stringify(data);');
    push("            this._dispatch('message', { type: 'message', data: payload });");
    push('        }');
    push('');
    push('        /** Simulate a server-side error. */');
    push('        mockServerError(message = "mock error") {');
    push("            this._dispatch('error', { type: 'error', message, error: new Error(message) });");
    push('        }');
    push('');
    push('        /** Simulate the server closing the connection. */');
    push('        mockServerClose(code = 1006, reason = "") {');
    push('            if (this.readyState === STATES.CLOSED) return;');
    push('            this.readyState = STATES.CLOSED;');
    push("            this._dispatch('close', { type: 'close', code, reason, wasClean: false });");
    push('        }');
    push('');
    push('        addEventListener(type, listener) {');
    push('            if (!this._listeners[type]) this._listeners[type] = [];');
    push('            this._listeners[type].push(listener);');
    push('            super.addEventListener(type, listener);');
    push('        }');
    push('');
    push('        removeEventListener(type, listener) {');
    push('            if (this._listeners[type]) {');
    push('                this._listeners[type] = this._listeners[type].filter((l) => l !== listener);');
    push('            }');
    push('            super.removeEventListener(type, listener);');
    push('        }');
    push('');
    push('        _dispatch(type, event) {');
    push('            // Fire the property-style handler (e.g. ws.onopen = fn)');
    push("            const prop = 'on' + type;");
    push("            if (typeof this[prop] === 'function') {");
    push('                try {');
    push('                    this[prop](event);');
    push('                } catch (_) {');
    push('                    /* swallow in mock */');
    push('                }');
    push('            }');
    push('            // Fire addEventListener listeners');
    push('            for (const l of this._listeners[type] || []) {');
    push('                try {');
    push('                    l(event);');
    push('                } catch (_) {');
    push('                    /* swallow in mock */');
    push('                }');
    push('            }');
    push('        }');
    push('    }');
    push('');
    push('    MockWebSocket.CONNECTING = STATES.CONNECTING;');
    push('    MockWebSocket.OPEN = STATES.OPEN;');
    push('    MockWebSocket.CLOSING = STATES.CLOSING;');
    push('    MockWebSocket.CLOSED = STATES.CLOSED;');
    push('');
    push('    window.__wsMockInstances = [];');
    push('    window.__wsMockLast = null;');
    push('    window.__wsMockCount = 0;');
    push('    window.WebSocket = MockWebSocket;');
    push("    if (typeof globalThis !== 'undefined') {");
    push('        globalThis.WebSocket = MockWebSocket;');
    push('    }');
    push('})();');

    return lines.join('\n');
}

/**
 * Inject a fake `window.WebSocket` constructor into the page before
 * any app script runs, returning a controller the test uses to drive
 * the server side of the connection.
 *
 * @param {import('@playwright/test').Page} page
 * @param {{
 *   autoOpen?: boolean,
 *   onCreate?: (mockWs: any) => void,
 *   onSend?: (mockWs: any, data: string) => void,
 *   onClose?: (mockWs: any, code: number, reason: string) => void,
 * }} [handlers]
 */
export async function mockWebSocket(page, handlers = {}) {
    const source = buildInstallScript(handlers || {});
    await page.addInitScript({ content: source });

    const ensure = async () => {
        const ok = await page.evaluate(() => Boolean(window.__wsMockInstalled));
        if (!ok) {
            throw new Error(
                'ws-mock: init script did not run before navigation; ' + 'call mockWebSocket(page) BEFORE page.goto()'
            );
        }
    };

    return {
        /** All mock WebSocket instances the app has created. */
        async instances() {
            await ensure();
            return await page.evaluate(() => window.__wsMockInstances || []);
        },
        /** The most recently created mock WebSocket instance, or null. */
        async lastInstance() {
            await ensure();
            return await page.evaluate(() => window.__wsMockLast || null);
        },
        /** The number of mock sockets the app has created. */
        async count() {
            await ensure();
            return await page.evaluate(() => window.__wsMockCount || 0);
        },
        /** Messages the app sent on the most recent instance. */
        async sentMessages() {
            await ensure();
            return await page.evaluate(() => window.__wsMockLast?.sentMessages || []);
        },
        /** Reset the sent-message buffer on the most recent instance. */
        async clearSentMessages() {
            await ensure();
            await page.evaluate(() => {
                if (window.__wsMockLast) window.__wsMockLast.sentMessages = [];
            });
        },
        /** Fire a server-sent message on the most recent instance. */
        async simulateServerMessage(data) {
            await ensure();
            await page.evaluate((d) => {
                if (!window.__wsMockLast) {
                    throw new Error('No mock WebSocket has been created yet');
                }
                window.__wsMockLast.mockServerMessage(d);
            }, data);
        },
        /** Fire the open event on the most recent instance. */
        async simulateServerOpen() {
            await ensure();
            await page.evaluate(() => {
                if (!window.__wsMockLast) {
                    throw new Error('No mock WebSocket has been created yet');
                }
                window.__wsMockLast.mockServerOpen();
            });
        },
        /** Fire an error event on the most recent instance. */
        async simulateServerError(message) {
            await ensure();
            await page.evaluate((m) => {
                if (!window.__wsMockLast) {
                    throw new Error('No mock WebSocket has been created yet');
                }
                window.__wsMockLast.mockServerError(m);
            }, message ?? 'mock error');
        },
        /** Fire a close event on the most recent instance. */
        async simulateServerClose(code, reason) {
            await ensure();
            await page.evaluate(
                ({ c, r }) => {
                    if (!window.__wsMockLast) {
                        throw new Error('No mock WebSocket has been created yet');
                    }
                    window.__wsMockLast.mockServerClose(c, r);
                },
                { c: code ?? 1006, r: reason ?? '' }
            );
        },
    };
}

export { STATES };
