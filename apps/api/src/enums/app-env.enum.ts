/**
 * Application environment enum
 */
export enum AppEnv {
  /**
   * Local environment.
   * Used for local development on your machine.
   */
  LOCAL = 'local',

  /**
   * Test environment.
   * Used when running tests.
   */
  TEST = 'test',

  /**
   * Development environment.
   * Used when deploying to a development server.
   * Development server provide early access to new features.
   */
  DEVELOPMENT = 'development',

  /**
   * Stage environment.
   * Used when deploying to a stage server.
   * Stage is a pre-production environment.
   */
  STAGE = 'stage',

  /**
   * Production environment.
   * Used when deploying to a production server.
   */
  PRODUCTION = 'production',
}
