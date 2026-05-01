export interface SendInvitationEmailOptions {
  userId: string;
  fullName: string;
  email: string;
  password: string;
  roleTitle: string;
  organizationTitle?: string;
  organizationLogoUrl?: string;
}
