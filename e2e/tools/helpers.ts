import type { Page } from '@playwright/test';

/**
 * Wait for page to be fully loaded (network idle)
 */
export async function waitForPageLoad(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
}

/**
 * Wait for a specified time in preview mode only.
 * Useful for video recordings to see UI changes.
 * Does nothing in normal test runs.
 */
export async function previewDelay(page: Page, ms: number = 2000): Promise<void> {
  if (process.env.PW_PREVIEW === '1') {
    await page.waitForTimeout(ms);
  }
}

/**
 * Take a screenshot with a descriptive name
 */
export async function takeScreenshot(
  page: Page,
  name: string
): Promise<Buffer> {
  return page.screenshot({
    path: `test-results/screenshots/${name}.png`,
    fullPage: true,
  });
}
