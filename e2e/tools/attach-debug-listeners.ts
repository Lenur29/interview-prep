import type {
  Browser,
  BrowserContext,
  BrowserContextOptions,
  ConsoleMessage,
  Page,
  Request,
  Response,
} from '@playwright/test';

const MAX_BODY_BYTES = 1024 * 1024;
const BODY_EXCERPT_LIMIT = 2000;

export interface DebugBuffer {
  console: string[];
  network: string[];
}

export function createDebugBuffer(): DebugBuffer {
  return { console: [], network: [] };
}

export function isDebugEnabled(): boolean {
  return process.env.PW_LOG === '1' || process.env.PW_PREVIEW === '1';
}

function timestamp(): string {
  return new Date().toISOString().slice(11, 23);
}

export function attachDebugListeners(context: BrowserContext, buffer: DebugBuffer): void {
  if (!isDebugEnabled()) return;

  context.on('page', (page: Page) => {
    page.on('console', (msg: ConsoleMessage) => {
      const level = msg.type();
      if (level !== 'error' && level !== 'warning') return;
      buffer.console.push(`[${timestamp()}] [${level}] [${page.url()}] ${msg.text()}`);
    });

    page.on('pageerror', (err: Error) => {
      const stack = err.stack ? `\n${err.stack}` : '';
      buffer.console.push(`[${timestamp()}] [pageerror] [${page.url()}] ${err.message}${stack}`);
    });

    page.on('response', (response: Response) => {
      void (async () => {
        try {
          const status = response.status();
          if (status < 400) return;
          const request = response.request();
          if (request.method() === 'OPTIONS') return;

          const ts = timestamp();
          let bodyExcerpt = '';
          try {
            const headers = response.headers();
            const contentType = headers['content-type'] ?? '';
            const contentLength = parseInt(headers['content-length'] ?? '0', 10);
            const isTextual = /(json|text|xml|html|javascript)/i.test(contentType);
            if (isTextual && contentLength >= 0 && contentLength < MAX_BODY_BYTES) {
              const text = await response.text();
              bodyExcerpt =
                text.length > BODY_EXCERPT_LIMIT
                  ? text.slice(0, BODY_EXCERPT_LIMIT) + '... [truncated]'
                  : text;
            }
          } catch {
            // response.text() can race with navigation/context close
          }

          const bodyLine = bodyExcerpt ? `\n  body: ${bodyExcerpt}` : '';
          buffer.network.push(`[${ts}] [${status}] ${request.method()} ${response.url()}${bodyLine}`);
        } catch {
          // Never break a test
        }
      })();
    });

    page.on('requestfailed', (request: Request) => {
      const reason = request.failure()?.errorText ?? 'unknown';
      buffer.network.push(`[${timestamp()}] [FAILED] ${request.method()} ${request.url()} — ${reason}`);
    });
  });
}

export async function newInstrumentedContext(
  browser: Browser,
  options: BrowserContextOptions,
  buffer: DebugBuffer,
): Promise<BrowserContext> {
  const context = await browser.newContext(options);
  attachDebugListeners(context, buffer);
  return context;
}
