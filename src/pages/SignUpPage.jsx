import { useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import {
  PASSWORD_MIN_LENGTH,
  describeAuthError,
  safeNext,
  validateSignUp,
} from "../auth/validation.js";
import { AuthCard, AuthField } from "../components/AuthCard.jsx";

export default function SignUpPage() {
  const { status, signUp } = useAuth();
  const [params] = useSearchParams();
  const next = safeNext(params.get("next"));

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [accountCreated, setAccountCreated] = useState(false);
  const [loading, setLoading] = useState(false);

  // Also covers a successful submit: signUp signs in, which flips status.
  if (status === "signedIn") return <Navigate to={next} replace />;

  // Show the errors and put the cursor in the first field that has one.
  function showFieldErrors(errors) {
    setFieldErrors(errors);
    const first = ["username", "email", "password"].find((f) => errors[f]);
    if (first) document.getElementById(`signup-${first}`)?.focus();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errors = validateSignUp({ username, email, password });
    showFieldErrors(errors);
    setFormError("");
    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    try {
      await signUp(username.trim(), email.trim(), password);
    } catch (err) {
      setLoading(false);
      // Submitting again would now fail with "email already exists".
      if (err.accountCreated) {
        setAccountCreated(true);
        return;
      }
      const { fields, form } = describeAuthError(err);
      showFieldErrors(fields ?? {});
      setFormError(form ?? "");
    }
  }

  const signInLink =
    next === "/" ? "/signin" : `/signin?next=${encodeURIComponent(next)}`;

  if (accountCreated) {
    return (
      <AuthCard
        title="Account created"
        subtitle="We couldn't sign you in automatically."
      >
        <Link
          className="btn btn--primary btn--full auth-form__submit"
          to={signInLink}
        >
          Sign in
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Create an account"
      subtitle="Join the Campus Motion community."
      footer={
        <>
          Already have an account? <Link to={signInLink}>Sign in</Link>
        </>
      }
    >
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <AuthField
          id="signup-username"
          label="Username"
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="e.g. alice"
          maxLength={50}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          error={fieldErrors.username}
          hint="Shown to other members."
          autoFocus
        />
        <AuthField
          id="signup-email"
          label="Email"
          type="email"
          autoComplete="email"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="name@epfl.ch"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={fieldErrors.email}
        />
        <AuthField
          id="signup-password"
          label="Password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fieldErrors.password}
          hint={`At least ${PASSWORD_MIN_LENGTH} characters.`}
        />
        {formError && (
          <p className="auth-form__error" role="alert">
            {formError}
          </p>
        )}
        <button
          className={`btn btn--primary btn--full auth-form__submit${loading ? " btn--loading" : ""}`}
          type="submit"
          disabled={loading}
        >
          {loading ? "Creating your account…" : "Create account"}
        </button>
      </form>
    </AuthCard>
  );
}
