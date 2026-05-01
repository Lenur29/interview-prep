import type { Page, Locator } from '@playwright/test';
import { expect } from '@playwright/test';
import { logger } from '@/tools/logger.js';

export class LoginPage {
  readonly page: Page;

  readonly pageContainer: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorAlert: Locator;

  constructor(page: Page) {
    this.page = page;

    this.pageContainer = page.getByTestId('login-page');
    this.emailInput = this.pageContainer.getByTestId('login-email');
    this.passwordInput = this.pageContainer.getByTestId('login-password');
    this.submitButton = this.pageContainer.getByTestId('login-submit');
    this.errorAlert = this.pageContainer.getByTestId('login-error');
  }

  async navigate(redirectUri?: string): Promise<void> {
    const url = redirectUri
      ? `/login?redirect_uri=${encodeURIComponent(redirectUri)}`
      : '/login';
    logger.info(`Navigate to ${url}`);
    await this.page.goto(url);
    await this.waitForPage();
  }

  async waitForPage(): Promise<void> {
    logger.info('Wait for login page to be visible');
    await this.pageContainer.waitFor({ state: 'visible', timeout: 10_000 });
  }

  async fillEmail(email: string): Promise<void> {
    logger.info(`Fill email: ${email}`);
    await this.emailInput.fill(email);
  }

  async fillPassword(password: string): Promise<void> {
    logger.info('Fill password');
    await this.passwordInput.fill(password);
  }

  async submit(): Promise<void> {
    logger.info('Click submit button');
    await this.submitButton.click();
  }

  async login(email: string, password: string): Promise<void> {
    logger.info(`Log in as ${email}`);
    await this.waitForPage();
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.submit();
  }

  async expectFormVisible(): Promise<void> {
    logger.info('Verify login form is visible');
    await expect(this.pageContainer).toBeVisible();
    await expect(this.emailInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.submitButton).toBeVisible();
  }

  async expectErrorVisible(message?: string): Promise<void> {
    logger.info(message ? `Verify error alert contains "${message}"` : 'Verify error alert is visible');
    await expect(this.errorAlert).toBeVisible();
    if (message) {
      await expect(this.errorAlert).toContainText(message);
    }
  }

  async expectNoError(): Promise<void> {
    logger.info('Verify no error alert is displayed');
    await expect(this.errorAlert).not.toBeVisible();
  }
}
