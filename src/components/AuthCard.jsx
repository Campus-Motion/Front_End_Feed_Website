import "./EventCard.css"; // shared .btn styles
import "./AuthCard.css";

/** Centered card holding a sign-in or sign-up form. */
export function AuthCard({ title, subtitle, children, footer }) {
  return (
    <div className="auth-page">
      <section className="auth-card" aria-labelledby="auth-title">
        <h1 id="auth-title" className="auth-card__title">
          {title}
        </h1>
        {subtitle && <p className="auth-card__subtitle">{subtitle}</p>}
        {children}
        {footer && <p className="auth-card__footer">{footer}</p>}
      </section>
    </div>
  );
}

/** Labelled input with an optional hint and a field error below it. */
export function AuthField({ id, label, error, hint, ...inputProps }) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className="auth-form__field">
      <label className="auth-form__label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className={`auth-form__input${error ? " auth-form__input--invalid" : ""}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...inputProps}
      />
      {error ? (
        <span id={`${id}-error`} className="auth-form__field-error">
          {error}
        </span>
      ) : (
        hint && (
          <span id={`${id}-hint`} className="auth-form__hint">
            {hint}
          </span>
        )
      )}
    </div>
  );
}
