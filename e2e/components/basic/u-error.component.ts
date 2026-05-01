/**
 * Helper for interacting with the UErrorView / Nuxt UI UError component.
 *
 * The UError component renders:
 * - [data-slot="statusCode"]    — HTTP status code text (e.g., "403")
 * - [data-slot="statusMessage"] — Main heading (e.g., "Access Denied")
 * - [data-slot="message"]       — Detail message
 *
 * @example
 * const error = new UErrorHelper(page);
 * await error.expectStatusCode('403');
 * await error.expectStatusMessage('Access Denied');
 * await error.expectMessage('You do not have access to scope');
 * await error.expectNotVisible();
 */

import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export class UErrorHelper {
  private readonly root;

  constructor(private readonly page: Page) {
    this.root = page.getByTestId('u-error');
  }

  async expectVisible(): Promise<void> {
    await expect(this.root).toBeVisible();
  }

  async expectNotVisible(): Promise<void> {
    await expect(this.root).not.toBeVisible();
  }

  async expectStatusCode(code: string): Promise<void> {
    await expect(this.root.locator('[data-slot="statusCode"]')).toHaveText(code);
  }

  async expectStatusMessage(message: string): Promise<void> {
    await expect(this.root.locator('[data-slot="statusMessage"]')).toHaveText(message);
  }

  async expectMessage(text: string): Promise<void> {
    await expect(this.root.locator('[data-slot="message"]')).toContainText(text);
  }
}
