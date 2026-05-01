/**
 * Enum for email transport type
 */
export enum EmailTransport {
  /**
   * Mailpit transport (local development)
   */
  MAILPIT = 'mailpit',

  /**
   * Postmark transport
   */
  POSTMARK = 'postmark',
}
