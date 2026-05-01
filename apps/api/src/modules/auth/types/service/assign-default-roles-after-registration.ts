export class AssignDefaultRolesAfterRegistrationOptions {
  /**
   * User id who was registered and needs to be assigned default roles
   */
  userId!: string;

  /**
   * Organization id where the user was registered
   */
  organizationId!: string;
}
