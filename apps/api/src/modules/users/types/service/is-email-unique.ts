export class IsUniqueEmailOptions {
  /**
   * The email to check.
   */
  email!: string;

  /**
   * The id of the user to exclude from the check.
   */
  exceptId?: string;
}
