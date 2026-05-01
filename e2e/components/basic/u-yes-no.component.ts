/**
 * Helper for interacting with UYesNo component
 *
 * UYesNo wraps URadioGroup with "Yes" (value="yes") and "No" (value="no") options.
 *
 * @example
 * // Static usage
 * await UYesNoHelper.selectYes(page, container);
 * await UYesNoHelper.expectYesSelected(container);
 *
 * // Instance usage
 * const yesNo = new UYesNoHelper(page, container);
 * await yesNo.selectYes();
 */

import type { Page, Locator } from '@playwright/test';
import { logger } from '@/tools/logger.js';
import { URadioGroupHelper } from './u-radio-group.component.js';

export class UYesNoHelper {
  private readonly radioGroup: URadioGroupHelper;

  constructor(
    private readonly page: Page,
    private readonly root: Locator,
  ) {
    this.radioGroup = new URadioGroupHelper(page, root);
  }

  /**
   * Select "Yes"
   */
  async selectYes(): Promise<void> {
    await UYesNoHelper.selectYes(this.page, this.root);
  }

  /**
   * Select "No"
   */
  async selectNo(): Promise<void> {
    await UYesNoHelper.selectNo(this.page, this.root);
  }

  /**
   * Get the current value
   */
  async getValue(): Promise<boolean | null> {
    return UYesNoHelper.getValue(this.root);
  }

  /**
   * Expect "Yes" to be selected
   */
  async expectYesSelected(): Promise<void> {
    await UYesNoHelper.expectYesSelected(this.root);
  }

  /**
   * Expect "No" to be selected
   */
  async expectNoSelected(): Promise<void> {
    await UYesNoHelper.expectNoSelected(this.root);
  }

  /**
   * Expect neither to be selected (N/A state)
   */
  async expectNeitherSelected(): Promise<void> {
    await UYesNoHelper.expectNeitherSelected(this.root);
  }

  // ============ Static Methods ============

  /**
   * Select "Yes" option
   */
  static async selectYes(page: Page, container: Locator): Promise<void> {
    logger.info('Select Yes');
    await URadioGroupHelper.selectByValue(page, container, 'yes');
  }

  /**
   * Select "No" option
   */
  static async selectNo(page: Page, container: Locator): Promise<void> {
    logger.info('Select No');
    await URadioGroupHelper.selectByValue(page, container, 'no');
  }

  /**
   * Get the current value as boolean
   */
  static async getValue(container: Locator): Promise<boolean | null> {
    const value = await URadioGroupHelper.getSelectedValue(container);
    if (value === 'yes') return true;
    if (value === 'no') return false;

    return null;
  }

  /**
   * Expect "Yes" to be selected
   */
  static async expectYesSelected(container: Locator): Promise<void> {
    logger.info('Expect Yes to be selected');
    await URadioGroupHelper.expectSelected(container, 'yes');
  }

  /**
   * Expect "No" to be selected
   */
  static async expectNoSelected(container: Locator): Promise<void> {
    logger.info('Expect No to be selected');
    await URadioGroupHelper.expectSelected(container, 'no');
  }

  /**
   * Expect neither Yes nor No to be selected
   */
  static async expectNeitherSelected(container: Locator): Promise<void> {
    logger.info('Expect neither Yes nor No to be selected');
    await URadioGroupHelper.expectNoneSelected(container);
  }
}
