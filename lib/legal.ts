export const POLICY_VERSION = '2026-09-12'
export const policiesApproved = () => process.env.LEGAL_POLICIES_APPROVED === 'true' && Boolean(process.env.SUPPORT_EMAIL)

// Explicitly limited to our test deployment and development identity provider.
export const stagingSubmissionsEnabled = () =>
  process.env.STAGING_SUBMISSIONS_ENABLED === 'true' &&
  process.env.RENDER_EXTERNAL_URL === 'https://cyndy-edu-staging.onrender.com' &&
  process.env.CLERK_SECRET_KEY?.startsWith('sk_test_') === true &&
  process.env.EMAIL_NOTIFICATIONS_ENABLED === 'false'
