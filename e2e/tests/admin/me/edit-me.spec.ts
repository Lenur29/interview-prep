/**
 * /me/edit — current user edits their own first name + last name
 * and sees their assigned role.
 *
 * Each test creates its own user via API factories (see e2e/CLAUDE.md).
 */

import { test } from '@/fixtures/auth.fixture.js';
import { EditMePage } from '@/pages/edit-me.page.js';
import { MePage } from '@/pages/me.page.js';

test.describe('/me/edit — own profile editor', () => {
  test('prefills inputs with current first and last name', async ({ authenticatedPageAs }) => {
    const { user, page } = await authenticatedPageAs({ roleId: 'SUPERADMIN' });
    const editMe = new EditMePage(page);

    await editMe.navigate();

    const [firstName, ...lastNameParts] = user.fullName.split(' ');
    const lastName = lastNameParts.join(' ');

    await editMe.expectFirstName(firstName);
    await editMe.expectLastName(lastName);
  });

  test('saves new first and last name and reflects them on /me', async ({ authenticatedPageAs }) => {
    const { page } = await authenticatedPageAs({ roleId: 'SUPERADMIN' });
    const editMe = new EditMePage(page);
    const me = new MePage(page);

    const newFirstName = `First${Date.now()}`;
    const newLastName = `Last${Date.now()}`;

    await editMe.navigate();
    await editMe.fillFirstName(newFirstName);
    await editMe.fillLastName(newLastName);
    await editMe.submit();

    await me.navigate();
    await me.expectFullName(`${newFirstName} ${newLastName}`);
  });

  test('blocks submit when first name is cleared', async ({ authenticatedPageAs }) => {
    const { user, page } = await authenticatedPageAs({ roleId: 'SUPERADMIN' });
    const editMe = new EditMePage(page);

    await editMe.navigate();
    await editMe.fillFirstName('');
    await editMe.submitWithoutWait();

    const me = new MePage(page);
    await me.navigate();
    await me.expectFullName(user.fullName);
  });

  test('shows the assigned role badge for a superadmin', async ({ authenticatedPageAs }) => {
    const { page } = await authenticatedPageAs({ roleId: 'SUPERADMIN' });
    const editMe = new EditMePage(page);

    await editMe.navigate();
    await editMe.expectRoleVisible('Super Admin');
  });
});
