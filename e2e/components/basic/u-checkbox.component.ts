/**
 * Helper for interacting with Nuxt UI UCheckbox component
 *
 * UCheckbox renders a button[role="checkbox"] with aria-checked attribute.
 *
 * @example
 * await UCheckboxHelper.check(locator);
 * await UCheckboxHelper.expectChecked(locator);
 */

import type { Page, Locator } from '@playwright/test';
import { expect } from '@playwright/test';

export class UCheckboxHelper {
  constructor(
    private readonly _page: Page,
    private readonly root: Locator,
  ) {}

  /**
   * Check if currently checked
   */
  async isChecked(): Promise<boolean> {
    return UCheckboxHelper.isChecked(this.root);
  }

  /**
   * Check the checkbox (only if not already checked)
   */
  async check(): Promise<void> {
    await UCheckboxHelper.check(this.root);
  }

  /**
   * Uncheck the checkbox (only if checked)
   */
  async uncheck(): Promise<void> {
    await UCheckboxHelper.uncheck(this.root);
  }

  /**
   * Toggle checkbox
   */
  async toggle(): Promise<void> {
    await this.root.click();
  }

  /**
   * Expect the checkbox to be checked
   */
  async expectChecked(): Promise<void> {
    await UCheckboxHelper.expectChecked(this.root);
  }

  /**
   * Expect the checkbox to be unchecked
   */
  async expectUnchecked(): Promise<void> {
    await UCheckboxHelper.expectUnchecked(this.root);;
  }

  // Static methods

  static async isChecked(locator: Locator): Promise<boolean> {
    const ariaChecked = await locator.getAttribute('aria-checked');

    return ariaChecked === 'true';
  }

  static async check(locator: Locator): Promise<void> {
    if (!(await UCheckboxHelper.isChecked(locator))) {
      await locator.click();
    }
  }

  static async uncheck(locator: Locator): Promise<void> {
    if (await UCheckboxHelper.isChecked(locator)) {
      await locator.click();
    }
  }

  static async expectChecked(locator: Locator): Promise<void> {
    await expect(locator).toHaveAttribute('aria-checked', 'true');
  }

  static async expectUnchecked(locator: Locator): Promise<void> {
    await expect(locator).toHaveAttribute('aria-checked', 'false');
  }
}
