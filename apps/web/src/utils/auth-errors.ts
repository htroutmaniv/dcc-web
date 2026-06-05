const AUTH_ERROR_MESSAGES: Record<string, string> = {
  invalid_token: 'This verification link is invalid or has expired. Request a new one below.',
  email_not_verified: 'Verify your email before signing in.',
};


export function authErrorMessage(code: string | null): string | null {

  if (!code) return null;

  return AUTH_ERROR_MESSAGES[code] ?? 'Sign-in failed. Please try again.';

}

