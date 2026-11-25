import { useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import {
  describeAuthError,
  safeNext,
  validateSignIn,
} from "../auth/validation.js";
import { AuthCard, AuthField } from "../components/AuthCard.jsx";

export default function SignInPage() {
  const { status, signIn } = useAuth();
  const [params] = useSearchParams();
  const next = safeNext(params.get("next"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);

  // Also covers a successful submit: signIn flips status to "signedIn".
  if (status === "signedIn") return <Navigate to={next} replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    const errors = validateSignIn({ email, password });
    setFieldErrors(errors);
    setFormError("");
    const first = ["email", "password"].find((f) => errors[f]);
    if (first) {
      document.getElementById(`signin-${first}`)?.focus();
      return;
    }

    setLoading(true);
    try {
      await signIn(email.trim(), password);
    } catch (err) {
      const { fields, form } = describeAuthError(err);
      setFieldErrors(fields ?? {});
      setFormError(form ?? "");
      setLoading(false);
    }
  }

  const signUpLink =
    next === "/" ? "/signup" : `/signup?next=${encodeURIComponent(next)}`;

  return (
    <AuthCard
      title="Sign in"
      subtitle="Welcome back to Campus Motion."
      footer={
        <>
          New here? <Link to={signUpLink}>Create an account</Link>
        </>
      }
    >
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <AuthField
          id="signin-email"
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
          autoFocus
        />
        <AuthField
          id="signin-password"
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fieldErrors.password}
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
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </AuthCard>
  );
}
