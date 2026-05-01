/**
 * Helper for interacting with Nuxt UI USelectMenu components
 *
 * USelectMenu uses as-child rendering, so data-testid lands directly
 * on the trigger button. The locator passed to this helper must point
 * to the USelectMenu component element (the trigger button itself).
 *
 * @example
 * // Static method usage
 * await USelectMenuHelper.selectOption(page, locator, 'Australia');
 *
 * // Instance usage
 * const selectMenu = new USelectMenuHelper(page, page.getByTestId('country-select'));
 * await selectMenu.selectOption('New Zealand');
 * await selectMenu.searchAndSelect('Singapore');
 */

import type { Page, Locator } from '@playwright/test';
import { expect } from '@playwright/test';

export class USelectMenuHelper {
  constructor(
    private readonly page: Page,
    private readonly root: Locator,
  ) {}

  /**
   * Select an option by visible text (without search)
   * @param optionText - Text to match
   * @param exact - Whether to match exactly (default: true)
   */
  async selectOption(optionText: string, exact = true): Promise<void> {
    await USelectMenuHelper.selectOption(this.page, this.root, optionText, exact);
  }

  /**
   * Search for an option and then select it
   */
  async searchAndSelect(searchQuery: string, optionText?: string): Promise<void> {
    await USelectMenuHelper.searchAndSelect(
      this.page,
      this.root,
      searchQuery,
      optionText ?? searchQuery,
    );
  }

  /**
   * Get the currently selected value text
   */
  async getSelectedText(): Promise<string> {
    const placeholderText = await this.root
      .locator('[data-slot="placeholder"]')
      .textContent();

    // If placeholder is visible, no selection has been made
    if (placeholderText && !placeholderText.includes('Not selected')) {
      return placeholderText;
    }

    // Otherwise get button text (excluding trailing icon)
    return (await this.root.textContent())?.replace(/\s*$/, '') ?? '';
  }

  /**
   * Expect the dropdown to have a specific selected value
   */
  async expectSelected(expectedText: string): Promise<void> {
    await USelectMenuHelper.expectSelected(this.root, expectedText);
  }

  /**
   * Check if the menu is open
   */
  async isOpen(): Promise<boolean> {
    const state = await this.root.getAttribute('data-state');
    return state === 'open';
  }

  /**
   * Static method to select an option without searching
   * @param page - Playwright page
   * @param locator - Locator for the USelectMenu trigger button
   * @param optionText - Text to match
   * @param exact - Whether to match exactly (default: true)
   */
  static async selectOption(
    page: Page,
    locator: Locator,
    optionText: string,
    exact = true,
  ): Promise<void> {
    // Click trigger to open menu — handle both cases:
    // 1. locator wraps a child combobox/button
    // 2. locator IS the trigger button itself (as-child rendering)
    const childTrigger = locator.getByRole('combobox').or(locator.locator('button'));
    const trigger = (await childTrigger.count()) > 0 ? childTrigger.first() : locator;
    await trigger.click();

    // Wait for popper content to be visible
    const popperContent = page.locator('[data-reka-popper-content-wrapper], [role="listbox"]').first();
    await popperContent.waitFor({ state: 'visible', timeout: 10000 });

    // Click the option
    const option = popperContent.getByRole('option', { name: optionText, exact }).first();
    await option.waitFor({ state: 'visible', timeout: 10000 });
    await option.click();

    // Wait for menu to close
    await popperContent.waitFor({ state: 'detached', timeout: 5000 }).catch(() => {});
  }

  /**
   * Static method to search and select an option
   */
  static async searchAndSelect(
    page: Page,
    locator: Locator,
    searchQuery: string,
    optionText: string,
  ): Promise<void> {
    // Click trigger to open menu — handle both cases:
    // 1. locator wraps a child combobox/button
    // 2. locator IS the trigger button itself (as-child rendering)
    const childTrigger = locator.getByRole('combobox').or(locator.locator('button'));
    const trigger = (await childTrigger.count()) > 0 ? childTrigger.first() : locator;
    await trigger.click();

    // Try to find search input - it might be in the popper or the trigger itself
    const searchInput = page.locator('[data-reka-popper-content-wrapper] input[type="text"], [role="listbox"] input[type="text"]')
      .or(locator.locator('input[type="text"]'))
      .or(locator.getByRole('combobox'))
      .first();

    await searchInput.waitFor({ state: 'visible', timeout: 10000 });
    await searchInput.fill(searchQuery);

    // Wait for filtering and popper content
    const popperContent = page.locator('[data-reka-popper-content-wrapper], [role="listbox"]').first();
    await popperContent.waitFor({ state: 'visible', timeout: 10000 });

    // Wait for the specific option to appear
    const option = popperContent.getByRole('option', { name: optionText, exact: true }).first();
    await option.waitFor({ state: 'visible', timeout: 10000 });
    await option.click();

    // Wait for menu to close
    await popperContent.waitFor({ state: 'detached', timeout: 5000 }).catch(() => {});
  }

  /**
   * Static method to verify selected value
   */
  static async expectSelected(locator: Locator, expectedText: string): Promise<void> {
    await expect(locator).toContainText(expectedText);
  }

  /**
   * Static method to get all visible options (requires menu to be open)
   */
  static async getVisibleOptions(page: Page): Promise<string[]> {
    const popperContent = page.locator('[data-reka-popper-content-wrapper]');
    const options = popperContent.getByRole('option');
    const count = await options.count();

    const optionTexts: string[] = [];
    for (let i = 0; i < count; i++) {
      const text = await options.nth(i).locator('[data-slot="itemLabel"]').textContent();
      if (text) {
        optionTexts.push(text);
      }
    }

    return optionTexts;
  }
}
