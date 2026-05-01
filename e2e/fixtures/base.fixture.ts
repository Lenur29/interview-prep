import { test as base } from '@playwright/test';
import {
  createDebugBuffer,
  isDebugEnabled,
  type DebugBuffer,
} from '@/tools/attach-debug-listeners.js';

/**
 * Base test fixture for the UGI E2E suite.
 *
 * When PW_LOG=1 (or PW_PREVIEW=1) is set, a per-test `debugBuffer` collects
 * browser console errors/warnings and 4xx/5xx network failures. Each call site
 * that creates a BrowserContext (in auth.fixture.ts) calls
 * `newInstrumentedContext(browser, opts, debugBuffer)` so the buffer sees every
 * event across every context opened by the test.
 *
 * At test teardown the buffer is flushed via `testInfo.attach()` so the custom
 * reporter can render it into failure.md.
 */

export const test = base.extend<{ debugBuffer: DebugBuffer }>({
  debugBuffer: async ({}, use, testInfo) => {
    const buffer = createDebugBuffer();
    await use(buffer);

    if (!isDebugEnabled()) return;

    if (buffer.console.length > 0) {
      await testInfo.attach('browser-console.log', {
        body: buffer.console.join('\n'),
        contentType: 'text/plain',
      });
    }
    if (buffer.network.length > 0) {
      await testInfo.attach('network-errors.log', {
        body: buffer.network.join('\n'),
        contentType: 'text/plain',
      });
    }
  },
});

export { expect } from '@playwright/test';
