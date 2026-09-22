export function workerCreationError(error: unknown) {
  const errors = (error as { errors?: Array<{ code?: string; meta?: { paramName?: string } }> })?.errors ?? []
  const code = errors[0]?.code
  if (code === 'form_identifier_exists') return { status: 409, error: 'An account already uses this email or username. Use a different account; existing clients are not automatically converted to workers.' }
  if (code === 'form_password_pwned') return { status: 400, error: 'This temporary password appears in a known data breach. Choose a new, unique password.' }
  if (code?.startsWith('form_password')) return { status: 400, error: 'The temporary password does not meet the sign-in security requirements. Use a longer, unique password.' }
  if (code === 'form_param_missing' && errors[0]?.meta?.paramName === 'username') return { status: 400, error: 'Your sign-in settings require a username. Enter a unique worker username.' }
  if (code?.startsWith('form_username')) return { status: 400, error: 'Choose a valid, unique username using letters, numbers and underscores.' }
  return { status: 500, error: 'Worker creation could not be completed. Please retry; contact support if it continues.' }
}
