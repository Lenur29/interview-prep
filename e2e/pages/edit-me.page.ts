/**
 * Page Object Model for the Edit Me (current user edit) page at /me/edit.
 *
 * Targets the testids defined in EditMePage.vue and the existing roles widget:
 *   edit-me-page, edit-me-first-name, edit-me-last-name, edit-me-submit,
 *   me-roles-list, me-role-item.
 */

import type { Page, Locator } from '@playwright/test';
import { expect } from '@playwright/test';
import { logger } from '@/tools/logger.js';

export class EditMePage {
  readonly page: Page;

  readonly pageContainer: Locator;
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly submitButton: Locator;
  readonly rolesList: Locator;
  readonly rolesEmpty: Locator;
  readonly roleItems: Locator;

  constructor(page: Page) {
    this.page = page;

    this.pageContainer = page.getByTestId('edit-me-page');
    this.firstNameInput = this.pageContainer.getByTestId('edit-me-first-name');
    this.lastNameInput = this.pageContainer.getByTestId('edit-me-last-name');
    this.submitButton = this.pageContainer.getByTestId('edit-me-submit');
    this.rolesList = this.pageContainer.getByTestId('me-roles-list');
    this.rolesEmpty = this.pageContainer.getByTestId('me-roles-empty');
    this.roleItems = this.pageContainer.getByTestId('me-role-item');
  }

  async navigate(): Promise<void> {
    logger.info('Navigate to Edit Me page');
    await this.page.goto('/me/edit');
    await this.pageContainer.waitFor({ state: 'visible' });
    logger.info('Edit Me page loaded');
  }

  async fillFirstName(value: string): Promise<void> {
    logger.info(`Fill first name: ${value}`);
    await this.firstNameInput.fill(value);
  }

  async fillLastName(value: string): Promise<void> {
    logger.info(`Fill last name: ${value}`);
    await this.lastNameInput.fill(value);
  }

  async submit(): Promise<void> {
    logger.info('Click submit and wait for UpdateUser + Me responses');
    const updatePromise = this.page.waitForResponse(
      (resp) =>
        resp.url().includes('/graphql')
        && resp.request().method() === 'POST'
        && resp.request().postDataJSON()?.operationName === 'UpdateUser',
      { timeout: 10_000 },
    );
    const refetchPromise = this.page.waitForResponse(
      (resp) =>
        resp.url().includes('/graphql')
        && resp.request().method() === 'POST'
        && resp.request().postDataJSON()?.operationName === 'Me',
      { timeout: 10_000 },
    );
    await this.submitButton.click();
    await Promise.all([updatePromise, refetchPromise]);
  }

  /**
   * Click submit without waiting for a network response — used by negative
   * tests where the form schema blocks the mutation client-side.
   */
  async submitWithoutWait(): Promise<void> {
    logger.info('Click submit (no network wait)');
    await this.submitButton.click();
  }

  async expectFirstName(expected: string): Promise<void> {
    logger.info(`Verify first name input value is "${expected}"`);
    await expect(this.firstNameInput).toHaveValue(expected);
  }

  async expectLastName(expected: string): Promise<void> {
    logger.info(`Verify last name input value is "${expected}"`);
    await expect(this.lastNameInput).toHaveValue(expected);
  }

  async expectRoleVisible(title: string): Promise<void> {
    logger.info(`Verify role badge "${title}" is visible`);
    await expect(this.roleItems.filter({ hasText: title })).toBeVisible();
  }

  async expectMyRolesSectionRendered(): Promise<void> {
    logger.info('Verify "My Roles" section is rendered (list or empty state)');
    await expect(this.rolesList.or(this.rolesEmpty)).toBeVisible();
  }
}
