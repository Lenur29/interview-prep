/**
 * Helper for interacting with Nuxt UI UInputDate component
 *
 * UInputDate uses Reka UI DateField with segment-based input (day, month, year).
 * We fill each segment by clicking on it and typing the value.
 *
 * @example
 * await UInputDateHelper.fillDate(locator, '1990-05-15');
 */

import type { Locator } from '@playwright/test';

export class UInputDateHelper {
  constructor(private readonly root: Locator) {}

  /**
   * Fill date using YYYY-MM-DD format
   */
  async fillDate(value: string): Promise<void> {
    await UInputDateHelper.fillDate(this.root, value);
  }

  /**
   * Fill date by typing into Reka UI DateField segments
   *
   * @param locator - Locator to the UInputDate/UDatePicker wrapper
   * @param value - Date in YYYY-MM-DD format (e.g., '1990-05-15')
   */
  static async fillDate(locator: Locator, value: string): Promise<void> {
    // Parse date value (YYYY-MM-DD)
    const [year, month, day] = value.split('-');

    if (!year || !month || !day) {
      throw new Error(`Invalid date format: ${value}. Expected YYYY-MM-DD`);
    }

    // Fill day segment
    const daySegment = locator.locator('[data-reka-date-field-segment="day"]');
    await daySegment.click();
    await daySegment.pressSequentially(day);

    // Fill month segment
    const monthSegment = locator.locator('[data-reka-date-field-segment="month"]');
    await monthSegment.click();
    await monthSegment.pressSequentially(month);

    // Fill year segment
    const yearSegment = locator.locator('[data-reka-date-field-segment="year"]');
    await yearSegment.click();
    await yearSegment.pressSequentially(year);

    // Blur to trigger validation
    await yearSegment.blur();
  }
}
