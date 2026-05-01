/**
 * Helper for interacting with UPhoneNumberInput component.
 *
 * The component uses UFieldGroup with USelectMenu (country selector) and UInput (phone input).
 * Default country is Ukraine (UA). Country list is Ukraine + diaspora-relevant countries.
 *
 * @example
 * const helper = new UPhoneInputHelper(page, page.getByTestId('phone-empty'));
 * await helper.fill('+380501234567');
 * await helper.expectValue('+380 50 123 4567');
 * await helper.expectValidIndicator();
 *
 * @example
 * // Select country by code or Ukrainian label
 * await helper.selectCountry('PL');
 * await helper.fill('512345678');
 */

import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { USelectMenuHelper } from './u-select-menu.component.js';

// Country code → Ukrainian label as rendered in the dropdown.
const COUNTRY_LABELS: Record<string, string> = {
  UA: 'Україна',
  PL: 'Польща',
  DE: 'Німеччина',
  CZ: 'Чехія',
  SK: 'Словаччина',
  HU: 'Угорщина',
  RO: 'Румунія',
  MD: 'Молдова',
  GB: 'Велика Британія',
  IE: 'Ірландія',
  IT: 'Італія',
  ES: 'Іспанія',
  PT: 'Португалія',
  FR: 'Франція',
  NL: 'Нідерланди',
  BE: 'Бельгія',
  AT: 'Австрія',
  CH: 'Швейцарія',
  SE: 'Швеція',
  NO: 'Норвегія',
  DK: 'Данія',
  FI: 'Фінляндія',
  EE: 'Естонія',
  LV: 'Латвія',
  LT: 'Литва',
  BG: 'Болгарія',
  GR: 'Греція',
  TR: 'Туреччина',
  IL: 'Ізраїль',
  AE: 'ОАЕ',
  GE: 'Грузія',
  US: 'США',
  CA: 'Канада',
};

export class UPhoneInputHelper {
  private readonly selectMenuHelper: USelectMenuHelper;

  constructor(
    private readonly page: Page,
    private readonly root: Locator,
  ) {
    // USelectMenu is inside UFieldGroup, find it by looking for the button
    this.selectMenuHelper = new USelectMenuHelper(page, root);
  }

  /**
   * Get the phone input element
   */
  private getInput(): Locator {
    return this.root.locator('input[type="tel"]');
  }

  /**
   * Get the country selector button (USelectMenu trigger)
   */
  private getCountrySelector(): Locator {
    // USelectMenu renders a button as trigger - it's the first button in the component
    return this.root.locator('button').first();
  }

  /**
   * Fill the phone input field (instant)
   */
  async fill(value: string): Promise<void> {
    const input = this.getInput();
    await input.fill(value);
    await input.blur();
  }

  /**
   * Type into the phone input field character by character (simulates real user typing)
   * @param value - The phone number to type
   * @param delay - Delay between keystrokes in milliseconds (default: 50)
   */
  async type(value: string, delay = 50): Promise<void> {
    const input = this.getInput();
    await input.click();
    await input.pressSequentially(value, { delay });
    await input.blur();
  }

  /**
   * Clear the phone input field
   */
  async clear(): Promise<void> {
    const input = this.getInput();
    await input.clear();
    await input.blur();
  }

  /**
   * Get the current input value
   */
  async getValue(): Promise<string> {
    return this.getInput().inputValue();
  }

  /**
   * Select a country from the dropdown
   * @param countryCodeOrLabel - Country code (AU, NZ, SG, UA) or label (Australia, New Zealand, etc.)
   */
  async selectCountry(countryCodeOrLabel: string): Promise<void> {
    // Convert code to label if needed
    const label = COUNTRY_LABELS[countryCodeOrLabel] || countryCodeOrLabel;
    // Use exact: false because dropdown shows "🇳🇿 New Zealand +64" format
    await this.selectMenuHelper.selectOption(label, false);
  }

  /**
   * Get the currently displayed flag emoji
   */
  async getSelectedFlag(): Promise<string> {
    const button = this.getCountrySelector();
    return button.innerText();
  }

  /**
   * Expect the input to have a specific value
   */
  async expectValue(expectedValue: string): Promise<void> {
    await expect(this.getInput()).toHaveValue(expectedValue);
  }

  /**
   * Expect the input to be empty
   */
  async expectEmpty(): Promise<void> {
    await expect(this.getInput()).toHaveValue('');
  }

  /**
   * Expect the valid indicator (green check icon) to be visible
   */
  async expectValidIndicator(): Promise<void> {
    // The valid icon is an svg[data-slot="trailingIcon"] inside the UInput wrapper (data-slot="root" containing input[type="tel"])
    const inputWrapper = this.root.locator('[data-slot="root"]:has(input[type="tel"])');
    const validIcon = inputWrapper.locator('[data-slot="trailingIcon"]');
    await expect(validIcon).toBeVisible();
  }

  /**
   * Expect the valid indicator to NOT be visible
   */
  async expectNoValidIndicator(): Promise<void> {
    const inputWrapper = this.root.locator('[data-slot="root"]:has(input[type="tel"])');
    const validIcon = inputWrapper.locator('[data-slot="trailingIcon"]');
    await expect(validIcon).not.toBeVisible();
  }

  /**
   * Expect the input to be disabled
   */
  async expectDisabled(): Promise<void> {
    await expect(this.getInput()).toBeDisabled();
  }

  /**
   * Expect a specific placeholder text
   */
  async expectPlaceholder(placeholder: string): Promise<void> {
    await expect(this.getInput()).toHaveAttribute('placeholder', placeholder);
  }

  // ============================================================================
  // STATIC METHODS (for one-off usage without creating instance)
  // ============================================================================

  /**
   * Fill the phone input field (static)
   */
  static async fill(page: Page, locator: Locator, value: string): Promise<void> {
    const helper = new UPhoneInputHelper(page, locator);
    await helper.fill(value);
  }

  /**
   * Clear the phone input field (static)
   */
  static async clear(page: Page, locator: Locator): Promise<void> {
    const helper = new UPhoneInputHelper(page, locator);
    await helper.clear();
  }
}
