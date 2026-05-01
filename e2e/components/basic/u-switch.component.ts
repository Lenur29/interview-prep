/**
 * Helper for interacting with Nuxt UI USwitch component
 *
 * USwitch uses data-state attribute: "checked" or "unchecked"
 *
 * @example
 * await USwitchHelper.enable(page, locator);
 * await USwitchHelper.expectEnabled(locator);
 */

import type { Page, Locator } from '@playwright/test';
import { expect } from '@playwright/test';

export class USwitchHelper {
  constructor(
    private readonly page: Page,
    private readonly root: Locator,
  ) {}

  async isEnabled(): Promise<boolean> {
    return USwitchHelper.isEnabled(this.root);
  }

  async enable(): Promise<void> {
    await USwitchHelper.enable(this.page, this.root);
  }

  async disable(): Promise<void> {
    await USwitchHelper.disable(this.page, this.root);
  }

  async toggle(): Promise<void> {
    await this.root.click();
  }

  // Static methods

  static async isEnabled(locator: Locator): Promise<boolean> {
    const state = await locator.getAttribute('data-state');

    return state === 'checked';
  }

  static async enable(page: Page, locator: Locator): Promise<void> {
    if (!(await USwitchHelper.isEnabled(locator))) {
      await locator.click();
    }
  }

  static async disable(page: Page, locator: Locator): Promise<void> {
    if (await USwitchHelper.isEnabled(locator)) {
      await locator.click();
    }
  }

  static async expectEnabled(locator: Locator): Promise<void> {
    await expect(locator).toHaveAttribute('data-state', 'checked');
  }

  static async expectDisabled(locator: Locator): Promise<void> {
    await expect(locator).toHaveAttribute('data-state', 'unchecked');
  }
}
