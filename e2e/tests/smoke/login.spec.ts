import { test, expect } from '@/fixtures/auth.fixture.js';
import { LoginPage } from '@/pages/login.page.js';
import { MePage } from '@/pages/me.page.js';
import { TEST_PASSWORD } from '@/fixtures/seed-data.js';

test.describe('Smoke — login', () => {
  test('guest can log in via the admin form and lands on /me', async ({ guestPage, testUser }) => {
    const user = await testUser({ roleId: 'SUPERADMIN', password: TEST_PASSWORD });

    const loginPage = new LoginPage(guestPage);
    await loginPage.navigate('/me');
    await loginPage.expectFormVisible();

    await loginPage.login(user.email, TEST_PASSWORD);

    await guestPage.waitForURL('**/me');
    const mePage = new MePage(guestPage);
    await mePage.expectPageVisible();
    await mePage.expectEmail(user.email);
  });

  test('invalid credentials surface an error alert', async ({ guestPage, testUser }) => {
    const user = await testUser({ roleId: 'SUPERADMIN', password: TEST_PASSWORD });

    const loginPage = new LoginPage(guestPage);
    await loginPage.navigate();
    await loginPage.expectFormVisible();

    await loginPage.login(user.email, 'wrong-password');

    await loginPage.expectErrorVisible();
    expect(guestPage.url()).toContain('/login');
  });
});
