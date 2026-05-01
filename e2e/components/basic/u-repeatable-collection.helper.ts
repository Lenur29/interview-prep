/**
 * URepeatableCollectionHelper - Base helper for URepeatableCollection-based editors.
 *
 * Provides common functionality for repeatable collection components:
 * - Getting items by index
 * - Counting items
 * - Adding/removing items
 * - Filling form fields based on configuration
 *
 * Uses only data-testid selectors for stability.
 *
 * @example
 * // Define field configuration
 * const CONFIG: RepeatableCollectionFieldConfig = {
 *   testIdPrefix: 'emergency-contact',
 *   displayName: 'emergency',
 *   fields: [
 *     { key: 'relationship', testIdSuffix: 'relationship', inputType: 'select-menu' },
 *     { key: 'fullName', testIdSuffix: 'fullname', inputType: 'input' },
 *   ],
 * };
 *
 * // Use in helper
 * await URepeatableCollectionHelper.fillFields(page, container, 0, data, CONFIG);
 */

import type { Page, Locator } from '@playwright/test';
import { expect } from '@playwright/test';
import { logger } from '@/tools/logger.js';
import { USelectMenuHelper } from './u-select-menu.component.js';
import { UPhoneInputHelper } from './u-phone-input.component.js';

/**
 * Field definition for a repeatable collection field
 */
export interface FieldDefinition {
  /** Field key in the data object */
  key: string;

  /** data-testid suffix (e.g., 'relationship', 'fullname') */
  testIdSuffix: string;

  /** Type of input component */
  inputType: 'select-menu' | 'input' | 'phone-input';

  /** Whether the field is optional */
  optional?: boolean;
}

/**
 * Configuration for field mapping in a repeatable collection
 */
export interface RepeatableCollectionFieldConfig {
  /** data-testid prefix for fields (e.g., 'emergency-contact' or 'medical-contact') */
  testIdPrefix: string;

  /** Human-readable name for logging (e.g., 'emergency' or 'medical') */
  displayName: string;

  /** Field definitions with their input types */
  fields: FieldDefinition[];
}

/**
 * Base helper class for URepeatableCollection components
 */
export class URepeatableCollectionHelper {
  /**
   * Get all item containers within the collection
   */
  static getItems(container: Locator): Locator {
    return container.getByTestId('u-repeatable-collection-item');
  }

  /**
   * Get a specific item by index (0-based)
   */
  static getItem(container: Locator, index: number): Locator {
    return this.getItems(container).nth(index);
  }

  /**
   * Add a new item by clicking the add button
   *
   * @param page - Playwright page
   * @param container - The collection container locator
   * @param displayName - Human-readable name for logging (optional)
   */
  static async addItem(page: Page, container: Locator, displayName?: string): Promise<void> {
    logger.info(`Add new ${displayName ?? ''} item`.trim());
    await container.getByTestId('u-repeatable-collection-add-button').click();
    await page.waitForTimeout(100); // Allow animation
  }

  /**
   * Remove an item at the specified index
   *
   * @param page - Playwright page
   * @param container - The collection container locator
   * @param index - Zero-based index of the item to remove
   * @param displayName - Human-readable name for logging (optional)
   */
  static async removeItem(
    page: Page,
    container: Locator,
    index: number,
    displayName?: string,
  ): Promise<void> {
    logger.info(`Remove ${displayName ?? ''} item ${index + 1}`.trim());

    const item = this.getItem(container, index);
    await expect(item).toBeVisible();

    const removeButton = item.getByTestId('u-repeatable-collection-remove-button');
    await removeButton.click();
    await page.waitForTimeout(100); // Allow animation
  }

  /**
   * Get count of items in the collection
   *
   * @param container - The collection container locator
   * @returns Number of items
   */
  static async getItemsCount(container: Locator): Promise<number> {
    return this.getItems(container).count();
  }

  /**
   * Verify expected number of items
   *
   * @param container - The collection container locator
   * @param expectedCount - Expected number of items
   * @param displayName - Human-readable name for logging (optional)
   */
  static async expectItemsCount(
    container: Locator,
    expectedCount: number,
    displayName?: string,
  ): Promise<void> {
    logger.info(`Verify ${expectedCount} ${displayName ?? ''} items in collection`.trim());
    await expect(this.getItems(container)).toHaveCount(expectedCount);
  }

  /**
   * Fill fields at the specified index using the provided configuration
   *
   * @param page - Playwright page
   * @param container - The collection container locator
   * @param index - Zero-based index of the item
   * @param data - The data object with field values
   * @param config - Field configuration
   */
  static async fillFields<T extends object>(
    page: Page,
    container: Locator,
    index: number,
    data: T,
    config: RepeatableCollectionFieldConfig,
  ): Promise<void> {
    const dataRecord = data as Record<string, unknown>;
    const displayValue = (dataRecord['fullName'] as string) ?? (dataRecord['name'] as string) ?? '';
    const typeValue =
      (dataRecord['relationship'] as string) ?? (dataRecord['type'] as string) ?? '';

    logger.info(
      `Fill ${config.displayName} item ${index + 1}: "${displayValue}" (${typeValue})`.trim(),
    );

    const items = this.getItems(container);
    const itemCount = await items.count();
    expect(itemCount).toBeGreaterThan(index);

    const item = this.getItem(container, index);
    await expect(item).toBeVisible();

    // Fill each field based on configuration
    for (const field of config.fields) {
      const value = dataRecord[field.key];

      // Skip optional fields with no value
      if (field.optional && (value === undefined || value === null || value === '')) {
        continue;
      }

      const fieldLocator = item.getByTestId(`${config.testIdPrefix}-${field.testIdSuffix}`);

      switch (field.inputType) {
        case 'select-menu':
          await expect(fieldLocator).toBeVisible();
          await USelectMenuHelper.selectOption(page, fieldLocator, String(value));
          break;

        case 'phone-input':
          await UPhoneInputHelper.fill(page, fieldLocator, String(value));
          break;

        case 'input':
        default:
          await fieldLocator.fill(String(value));
          await fieldLocator.blur();
          break;
      }
    }
  }
}
