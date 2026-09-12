export const POLICY_VERSION = '2026-09-12'
export const policiesApproved = () => process.env.LEGAL_POLICIES_APPROVED === 'true' && Boolean(process.env.SUPPORT_EMAIL)
