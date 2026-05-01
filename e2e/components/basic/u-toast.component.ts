/**
 * Helper for interacting with Nuxt UI toast notifications.
 *
 * The notifications container only appears in the DOM when a toast is shown.
 * Toasts render inside a region with aria-label="Notifications (F8)".
 * Each toast is a <li role="alert"> with:
 * - [data-slot="title"] for the toast title
 * - [data-slot="description"] for the toast description
 *
 * @example
 * const toast = new UToastHelper(page);
 * await toast.expectToast('already a member');
 */

import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export class UToastHelper {
  constructor(private readonly page: Page) {}

  /**
   * Assert that a toast with the given description text appears.
   * Waits for the notifications container to appear first, then checks for the message.
   */
  async expectToast(descriptionText: string, options?: { timeout?: number }): Promise<void> {
    const timeout = options?.timeout ?? 10000;
    // Target the toast li[role="alert"] directly — the parent container div
    // has aria-hidden="true" and collapses to zero height (children are position: fixed)
    const toast = this.page.locator('ol[data-slot="viewport"] > [role="alert"]').filter({
      has: this.page.locator('[data-slot="description"]', { hasText: descriptionText }),
    });
    await expect(toast).toBeVisible({ timeout });
  }

  /**
   * Assert that a toast with the given title text appears.
   */
  async expectToastTitle(titleText: string, options?: { timeout?: number }): Promise<void> {
    const timeout = options?.timeout ?? 10000;
    const toast = this.page.locator('ol[data-slot="viewport"] > [role="alert"]').filter({
      has: this.page.locator('[data-slot="title"]', { hasText: titleText }),
    });
    await expect(toast).toBeVisible({ timeout });
  }
}
