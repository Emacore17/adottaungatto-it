export const AUTH_SECURITY_EVENT = {
  PASSWORD_RECOVERY_REQUESTED: 'password_recovery_requested',
  EMAIL_VERIFICATION_RESEND_REQUESTED: 'email_verification_resend_requested',
  PHONE_VERIFICATION_REQUESTED: 'phone_verification_requested',
  PHONE_VERIFICATION_CONFIRMED: 'phone_verification_confirmed',
  PHONE_VERIFICATION_FAILED: 'phone_verification_failed',
  IDENTITY_LINKED_BY_VERIFIED_EMAIL: 'identity_linked_by_verified_email',
} as const;

export type AuthSecurityEventType =
  (typeof AUTH_SECURITY_EVENT)[keyof typeof AUTH_SECURITY_EVENT];
