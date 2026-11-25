/** Same minimum as RegisterDto in the backend. */
export const PASSWORD_MIN_LENGTH = 8;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Where to go after signing in: the `next` query parameter if it is a path
 * on this site, else the feed. Rejects "//host" and full URLs so the link
 * can't send people to another site. Backslashes and control characters are
 * rejected too: browsers read "/\host" and "/<tab>/host" as "//host".
 */
export function safeNext(next) {
  return next &&
    next.startsWith("/") &&
    !next.startsWith("//") &&
    !/[\\\u0000-\u001f]/.test(next)
    ? next
    : "/";
}

/** Field errors for the sign-in form; empty object when it can be sent. */
export function validateSignIn({ email, password }) {
  const errors = {};
  if (!email.trim()) errors.email = "Enter your email.";
  if (!password) errors.password = "Enter your password.";
  return errors;
}

/** Field errors for the sign-up form; empty object when it can be sent. */
export function validateSignUp({ username, email, password }) {
  const errors = {};
  if (!username.trim()) errors.username = "Choose a username.";
  if (!EMAIL_PATTERN.test(email.trim()))
    errors.email = "Enter a valid email, like name@epfl.ch.";
  if (password.length < PASSWORD_MIN_LENGTH) {
    errors.password = `Use at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  return errors;
}

/**
 * Turns an error from signIn / signUp into what the form shows:
 * { fields } for errors tied to one input, else { form } for the banner.
 */
export function describeAuthError(e) {
  if (e?.status === undefined) {
    return {
      form: "Couldn't reach the server. Check your connection and try again.",
    };
  }
  if (e.status === 401) return { form: "Wrong email or password." };
  if (e.status === 409) {
    if (/email/i.test(e.message)) {
      return {
        fields: { email: "An account with this email already exists." },
      };
    }
    if (/username/i.test(e.message)) {
      return {
        fields: {
          username: "This username is already taken, please pick another one.",
        },
      };
    }
  }
  return { form: e.message || "Something went wrong. Try again." };
}
