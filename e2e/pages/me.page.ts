/**
 * Page Object Model for the Me (current user) page.
 *
 * Targets only the testids that exist today in MePage.vue:
 *   me-page, me-full-name, me-email, me-user-id, me-2fa-status
 */

import type { Page, Locator } from '@playwright/test';
import { expect } from '@playwright/test';
import { logger } from '@/tools/logger.js';

export class MePage {
  readonly page: Page;

  readonly pageContainer: Locator;
  readonly fullName: Locator;
  readonly email: Locator;
  readonly userId: Locator;
  readonly twoFactorStatus: Locator;

  constructor(page: Page) {
    this.page = page;

    this.pageContainer = page.getByTestId('me-page');
    this.fullName = page.getByTestId('me-full-name');
    this.email = page.getByTestId('me-email');
    this.userId = page.getByTestId('me-user-id');
    this.twoFactorStatus = page.getByTestId('me-2fa-status');
  }

  async navigate(): Promise<void> {
    logger.info('Navigate to Me page');
    await this.page.goto('/me');
    await this.pageContainer.waitFor({ state: 'visible' });
    logger.info('Me page loaded');
  }

  async getFullName(): Promise<string> {
    return (await this.fullName.textContent())?.trim() ?? '';
  }

  async getEmail(): Promise<string> {
    return (await this.email.textContent())?.trim() ?? '';
  }

  async getUserId(): Promise<string> {
    return (await this.userId.textContent())?.trim() ?? '';
  }

  async expectPageVisible(): Promise<void> {
    logger.info('Verify Me page is visible');
    await expect(this.pageContainer).toBeVisible();
  }

  async expectEmail(expected: string): Promise<void> {
    logger.info(`Verify email is "${expected}"`);
    await expect(this.email).toHaveText(expected);
  }

  async expectFullName(expected: string): Promise<void> {
    logger.info(`Verify full name is "${expected}"`);
    await expect(this.fullName).toHaveText(expected);
  }

  async expectUserId(expected: string): Promise<void> {
    logger.info(`Verify user ID is "${expected}"`);
    await expect(this.userId).toHaveText(expected);
  }
}
