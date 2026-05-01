/**
 * Helper for interacting with Nuxt UI USelect/USelectMenu components
 *
 * USelect renders a button-based dropdown with options in a popper content wrapper.
 *
 * @example
 * // Static method usage
 * await USelectHelper.selectOption(page, locator, 'Australia');
 *
 * // Instance usage
 * const select = new USelectHelper(page, page.getByTestId('country-select'));
 * await select.selectOption('Australia');
 */

import type { Page, Locator } from '@playwright/test';
import { expect } from '@playwright/test';

export class USelectHelper {
  constructor(
    private readonly page: Page,
    private readonly root: Locator,
  ) {}

  /**
   * Select an option by visible text
   */
  async selectOption(optionText: string): Promise<void> {
    await USelectHelper.selectOption(this.page, this.root, optionText);
  }

  /**
   * Get the currently selected value text
   */
  async getSelectedText(): Promise<string> {
    return (await this.root.locator('[data-slot="value"]').textContent()) ?? '';
  }

  /**
   * Expect the dropdown to have a specific selected value
   */
  async expectSelected(expectedText: string): Promise<void> {
    await USelectHelper.expectSelected(this.root, expectedText);
  }

  /**
   * Static method for one-off interactions
   */
  static async selectOption(page: Page, locator: Locator, optionText: string): Promise<void> {
    await locator.click();
    const popperContent = page.locator('[data-reka-popper-content-wrapper], [role="listbox"]').first();
    await popperContent.waitFor({ state: 'visible', timeout: 5000 });

    const option = popperContent.getByRole('option', { name: optionText, exact: true }).first();
    await option.waitFor({ state: 'visible', timeout: 5000 });
    await option.click();

    // Wait for popper to be detached from DOM (clicking option should close it)
    await popperContent.waitFor({ state: 'detached', timeout: 2000 }).catch(() => {
      // Popper may already be closed
    });
  }

  /**
   * Expect an option to be visible in the dropdown
   */
  async expectOptionVisible(optionText: string): Promise<void> {
    await USelectHelper.expectOptionVisible(this.page, this.root, optionText);
  }

  /**
   * Expect an option to NOT be visible in the dropdown
   */
  async expectOptionNotVisible(optionText: string): Promise<void> {
    await USelectHelper.expectOptionNotVisible(this.page, this.root, optionText);
  }

  /**
   * Static method to verify selected value
   */
  static async expectSelected(locator: Locator, expectedText: string): Promise<void> {
    await expect(locator.locator('[data-slot="value"]')).toContainText(expectedText);
  }

  /**
   * Static method to verify an option is visible in the dropdown
   */
  static async expectOptionVisible(page: Page, locator: Locator, optionText: string): Promise<void> {
    const popperContent = page.locator('[data-reka-popper-content-wrapper]');
    await expect(popperContent.getByRole('option', { name: optionText, exact: true })).toBeVisible();
  }

  /**
   * Static method to verify an option is NOT visible in the dropdown
   */
  static async expectOptionNotVisible(page: Page, locator: Locator, optionText: string): Promise<void> {
    const popperContent = page.locator('[data-reka-popper-content-wrapper]');
    await expect(popperContent.getByRole('option', { name: optionText, exact: true })).not.toBeVisible();
  }
}
