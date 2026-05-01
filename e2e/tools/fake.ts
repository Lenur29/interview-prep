import { faker } from '@faker-js/faker';

/**
 * Fake data generators for E2E tests.
 */
export const fake = {
  user() {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();

    return {
      firstName,
      lastName,
      email: faker.internet.email({ firstName, lastName }).toLowerCase(),
    };
  },

  /**
   * Generate unique email with timestamp to avoid conflicts
   */
  uniqueEmail(prefix = 'test') {
    const timestamp = Date.now();

    return `${prefix}+${timestamp}@test.lemurjs.local`;
  },

  /**
   * Generate unique identifier with timestamp
   */
  uniqueId(prefix = '') {
    const timestamp = Date.now();
    const random = faker.string.alphanumeric(4);

    return `${prefix}${timestamp}-${random}`;
  },
};

export { faker };
