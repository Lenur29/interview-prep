/**
 * Helper for interacting with Nuxt UI URadioGroup component
 *
 * URadioGroup renders button[role="radio"] elements with aria-checked state.
 *
 * @example
 * // Static usage
 * await URadioGroupHelper.selectByValue(page, container, 'yes');
 * await URadioGroupHelper.expectSelected(container, 'yes');
 *
 * // Instance usage
 * const radioGroup = new URadioGroupHelper(page, container);
 * await radioGroup.selectByValue('yes');
 */

import type { Page, Locator } from '@playwright/test';
import { expect } from '@playwright/test';
import { logger } from '@/tools/logger.js';

export class URadioGroupHelper {
  constructor(
    private readonly page: Page,
    private readonly root: Locator,
  ) {}

  /**
   * Get a radio button by its value attribute
   */
  getRadioByValue(value: string): Locator {
    return this.root.locator(`button[role="radio"][value="${value}"]`);
  }

  /**
   * Get a radio button by its aria-label
   */
  getRadioByLabel(label: string): Locator {
    return this.root.getByRole('radio', { name: label });
  }

  /**
   * Select a radio option by value
   */
  async selectByValue(value: string): Promise<void> {
    await URadioGroupHelper.selectByValue(this.page, this.root, value);
  }

  /**
   * Select a radio option by label
   */
  async selectByLabel(label: string): Promise<void> {
    await URadioGroupHelper.selectByLabel(this.page, this.root, label);
  }

  /**
   * Get the currently selected value
   */
  async getSelectedValue(): Promise<string | null> {
    return URadioGroupHelper.getSelectedValue(this.root);
  }

  /**
   * Expect a specific value to be selected
   */
  async expectSelected(value: string): Promise<void> {
    await URadioGroupHelper.expectSelected(this.root, value);
  }

  /**
   * Expect no value to be selected
   */
  async expectNoneSelected(): Promise<void> {
    await URadioGroupHelper.expectNoneSelected(this.root);
  }

  // ============ Static Methods ============

  /**
   * Select a radio option by value attribute
   */
  static async selectByValue(page: Page, container: Locator, value: string): Promise<void> {
    logger.info(`Select radio option by value: ${value}`);

    // Wait for container to be visible first
    await container.waitFor({ state: 'visible' });

    // Find radio directly within container (UYesNo has radiogroup as direct child)
    const radio = container.locator(`button[role="radio"][value="${value}"]`);
    await radio.waitFor({ state: 'visible' });
    await radio.click();
  }

  /**
   * Select a radio option by aria-label
   */
  static async selectByLabel(page: Page, container: Locator, label: string): Promise<void> {
    logger.info(`Select radio option by label: ${label}`);

    // Wait for container to be visible first
    await container.waitFor({ state: 'visible' });

    const radio = container.getByRole('radio', { name: label });
    await radio.waitFor({ state: 'visible' });
    await radio.click();
  }

  /**
   * Get the currently selected value
   */
  static async getSelectedValue(container: Locator): Promise<string | null> {
    // Find checked radio directly within container
    const checkedRadio = container.locator('button[role="radio"][aria-checked="true"]');
    const count = await checkedRadio.count();
    if (count === 0) return null;

    return await checkedRadio.getAttribute('value');
  }

  /**
   * Expect a specific value to be selected
   */
  static async expectSelected(container: Locator, value: string): Promise<void> {
    logger.info(`Expect radio value "${value}" to be selected`);
    // Find radio directly within container
    const radio = container.locator(`button[role="radio"][value="${value}"]`);
    await expect(radio).toHaveAttribute('aria-checked', 'true');
  }

  /**
   * Expect no value to be selected
   */
  static async expectNoneSelected(container: Locator): Promise<void> {
    logger.info('Expect no radio option to be selected');
    // Find checked radios directly within container
    const checkedRadio = container.locator('button[role="radio"][aria-checked="true"]');
    await expect(checkedRadio).toHaveCount(0);
  }
}
