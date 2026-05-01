import { AppEnv } from '@/enums/app-env.enum.js';

/**
 * Returns a string with a dash prefix based on the current environment.
 * If the environment is development or local, returns '-dev'.
 * If the environment is stage, returns '-stage'.
 * Otherwise, returns an empty string.
 *
 * @returns a string with a dash prefix based on the current environment
 * @example
 * ```typescript
 * const name = `my-app${withDashEnv()}`;
 * ```
 */
export const withDashEnv = () => {
  if (process.env.APP_ENV === AppEnv.DEVELOPMENT || process.env.APP_ENV === AppEnv.LOCAL || process.env.APP_ENV === AppEnv.TEST) {
    return '-dev';
  }

  if (process.env.APP_ENV === AppEnv.STAGE) {
    return '-stage';
  }

  return '';
};

/**
 * Returns a string with a dash prefix based on the current environment.
 * If the environment is development or local, returns '.dev'.
 * If the environment is stage, returns '.stage'.
 * Otherwise, returns an empty string.
 *
 * @returns a string with a dot prefix based on the current environment
 * @example
 * ```typescript
 * const name = `config${withDotEnv()}`;
 * ```
 */
export const withDotEnv = () => {
  if (process.env.APP_ENV === AppEnv.DEVELOPMENT || process.env.APP_ENV === AppEnv.LOCAL || process.env.APP_ENV === AppEnv.TEST) {
    return '.dev';
  }

  if (process.env.APP_ENV === AppEnv.STAGE) {
    return '.stage';
  }

  return '';
};

/**
 * Returns a string with a colon prefix based on the current environment.
 * If the environment is development or local, returns ':dev'.
 * If the environment is stage, returns ':stage'.
 * Otherwise, returns an empty string.
 *
 * @returns a string with a colon prefix based on the current environment
 * @example
 * ```typescript
 * const name = `my:app${withColonEnv()}`;
 * ```
 */
export const withColonEnv = () => {
  if (process.env.APP_ENV === AppEnv.DEVELOPMENT || process.env.APP_ENV === AppEnv.LOCAL || process.env.APP_ENV === AppEnv.TEST) {
    return ':dev';
  }

  if (process.env.APP_ENV === AppEnv.STAGE) {
    return ':stage';
  }

  return '';
};

/**
 * Returns a string with an underscore prefix based on the current environment.
 * If the environment is development or local, returns '_dev'.
 * If the environment is stage, returns '_stage'.
 * Otherwise, returns an empty string.
 *
 * @returns a string with an underscore prefix based on the current environment
 * @example
 * ```typescript
 * const name = `my_app${withUnderscoreEnv()}`;
 * ```
 */
export const withUnderscoreEnv = () => {
  if (process.env.APP_ENV === AppEnv.DEVELOPMENT || process.env.APP_ENV === AppEnv.LOCAL || process.env.APP_ENV === AppEnv.TEST) {
    return '_dev';
  }

  if (process.env.APP_ENV === AppEnv.STAGE) {
    return '_stage';
  }

  return '';
};
