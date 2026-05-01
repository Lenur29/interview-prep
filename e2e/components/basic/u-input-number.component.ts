/**
 * Helper for interacting with Nuxt UI UInputNumber component
 *
 * UInputNumber renders two input elements:
 * - A visible spinbutton (role="spinbutton", type="text") for user interaction
 * - A hidden input (data-hidden, type="text") for form submission
 *
 * We target the visible input using role="spinbutton" which is the most reliable selector.
 *
 * @example
 * const helper = new UInputNumberHelper(page, page.getByTestId('age-input'));
 * await helper.fill(25);
 * await helper.expectValue(25);
 */

import type { Page, Locator } from '@playwright/test';
import { expect } from '@playwright/test';

export class UInputNumberHelper {
  private readonly input: Locator;

  constructor(
    private readonly page: Page,
    private readonly root: Locator,
  ) {
    // Select visible input by role="spinbutton" (most reliable for UInputNumber)
    this.input = root.locator('input[role="spinbutton"]');
  }

  async fill(value: number): Promise<void> {
    await this.input.fill(String(value));
  }

  async clear(): Promise<void> {
    await this.input.clear();
  }

  async blur(): Promise<void> {
    await this.input.blur();
  }

  async focus(): Promise<void> {
    await this.input.focus();
  }

  async getValue(): Promise<number | null> {
    const value = await this.input.inputValue();

    return value ? Number(value) : null;
  }

  async expectValue(expected: number): Promise<void> {
    await expect(this.input).toHaveValue(String(expected));
  }

  async expectEmpty(): Promise<void> {
    await expect(this.input).toHaveValue('');
  }

  // Static methods

  static getInput(root: Locator): Locator {
    // Select visible input by role="spinbutton" (most reliable for UInputNumber)
    return root.locator('input[role="spinbutton"]');
  }

  static async fill(root: Locator, value: number): Promise<void> {
    await UInputNumberHelper.getInput(root).fill(String(value));
  }

  static async clear(root: Locator): Promise<void> {
    await UInputNumberHelper.getInput(root).clear();
  }

  static async blur(root: Locator): Promise<void> {
    await UInputNumberHelper.getInput(root).blur();
  }

  static async getValue(root: Locator): Promise<number | null> {
    const value = await UInputNumberHelper.getInput(root).inputValue();

    return value ? Number(value) : null;
  }

  static async expectValue(root: Locator, expected: number): Promise<void> {
    await expect(UInputNumberHelper.getInput(root)).toHaveValue(String(expected));
  }

  static async expectEmpty(root: Locator): Promise<void> {
    await expect(UInputNumberHelper.getInput(root)).toHaveValue('');
  }
}
