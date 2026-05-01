/**
 * Helper for interacting with UTablePagination component.
 *
 * UTablePagination renders:
 * - Info text with data-testid="pagination-current-page", "pagination-total-pages", "pagination-total-items"
 * - Nuxt UI UPagination nav with page buttons (aria-label="Page N", data-selected="true" for active)
 *   and control buttons (aria-label="First Page", "Previous Page", "Next Page", "Last Page")
 *
 * @example
 * const pagination = new UPaginationHelper(page, page.getByTestId('pagination-info').locator('..'));
 * await pagination.goToPage(2);
 * await pagination.expectCurrentPage(2);
 */

import type { Page, Locator } from '@playwright/test';
import { expect } from '@playwright/test';
import { logger } from '@/tools/logger.js';

export class UPaginationHelper {
  readonly info: Locator;
  readonly currentPageLabel: Locator;
  readonly totalPagesLabel: Locator;
  readonly totalItemsLabel: Locator;
  readonly nav: Locator;

  constructor(
    private readonly _page: Page,
    private readonly root: Locator,
  ) {
    this.info = root.getByTestId('pagination-info');
    this.currentPageLabel = root.getByTestId('pagination-current-page');
    this.totalPagesLabel = root.getByTestId('pagination-total-pages');
    this.totalItemsLabel = root.getByTestId('pagination-total-items');
    this.nav = root.getByRole('navigation');
  }

  /**
   * Navigate to a specific page by clicking the page number button
   */
  async goToPage(pageNumber: number): Promise<void> {
    logger.info(`Navigate to page ${pageNumber}`);
    await this.nav.getByRole('button', { name: `Page ${pageNumber}` }).click();
  }

  /**
   * Navigate to the next page
   */
  async goToNextPage(): Promise<void> {
    logger.info('Navigate to next page');
    await this.nav.getByRole('button', { name: 'Next Page' }).click();
  }

  /**
   * Navigate to the previous page
   */
  async goToPreviousPage(): Promise<void> {
    logger.info('Navigate to previous page');
    await this.nav.getByRole('button', { name: 'Previous Page' }).click();
  }

  /**
   * Navigate to the first page
   */
  async goToFirstPage(): Promise<void> {
    logger.info('Navigate to first page');
    await this.nav.getByRole('button', { name: 'First Page' }).click();
  }

  /**
   * Navigate to the last page
   */
  async goToLastPage(): Promise<void> {
    logger.info('Navigate to last page');
    await this.nav.getByRole('button', { name: 'Last Page' }).click();
  }

  /**
   * Get the current page number from the info text
   */
  async getCurrentPage(): Promise<number> {
    const text = await this.currentPageLabel.textContent();

    return Number(text?.trim());
  }

  /**
   * Get the total number of pages from the info text
   */
  async getTotalPages(): Promise<number> {
    const text = await this.totalPagesLabel.textContent();

    return Number(text?.trim());
  }

  /**
   * Get the total number of items from the info text
   */
  async getTotalItems(): Promise<number> {
    const text = await this.totalItemsLabel.textContent();

    return Number(text?.trim());
  }

  /**
   * Assert that pagination is visible
   */
  async expectVisible(): Promise<void> {
    logger.info('Verify pagination is visible');
    await expect(this.info).toBeVisible();
  }

  /**
   * Assert that pagination is NOT visible
   */
  async expectNotVisible(): Promise<void> {
    logger.info('Verify pagination is not visible');
    await expect(this.info).not.toBeVisible();
  }

  /**
   * Assert the current page number
   */
  async expectCurrentPage(pageNumber: number): Promise<void> {
    logger.info(`Verify current page is ${pageNumber}`);
    await expect(this.currentPageLabel).toHaveText(String(pageNumber));
  }

  /**
   * Assert the total number of pages
   */
  async expectTotalPages(totalPages: number): Promise<void> {
    logger.info(`Verify total pages is ${totalPages}`);
    await expect(this.totalPagesLabel).toHaveText(String(totalPages));
  }

  /**
   * Assert the active page button has data-selected="true"
   */
  async expectPageSelected(pageNumber: number): Promise<void> {
    logger.info(`Verify page ${pageNumber} button is selected`);
    const pageButton = this.nav.getByRole('button', { name: `Page ${pageNumber}` });
    await expect(pageButton).toHaveAttribute('data-selected', 'true');
  }
}
