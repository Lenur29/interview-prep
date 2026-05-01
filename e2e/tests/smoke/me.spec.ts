import { test } from '@/fixtures/auth.fixture.js';
import { MePage } from '@/pages/me.page.js';

test.describe('Smoke — me page per role', () => {
  test('superadmin sees their own email on /me', async ({ authenticatedPageAs }) => {
    const { user, page } = await authenticatedPageAs({ roleId: 'SUPERADMIN' });
    const me = new MePage(page);
    await me.navigate();
    await me.expectEmail(user.email);
  });
});
