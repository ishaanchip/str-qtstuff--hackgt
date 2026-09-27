import { useState } from "react";
import { isValidEmail, loginAccount, saveUserEmail } from "../homeHelper";

export default function LoginPanel({ onClose, email: initialEmail = "" }) {
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const normalizedEmail = email.trim().toLowerCase();
  const formValid = isValidEmail(normalizedEmail) && Boolean(password);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!formValid) {
      setError("Enter a valid email and password.");
      return;
    }

    setSubmitting(true);
    try {
      await loginAccount({ email: normalizedEmail, password });
      saveUserEmail(normalizedEmail);
      onClose?.();
    } catch (err) {
      setError(
        err.response?.data?.error ||
          "Could not reach the server. Is it running on port 4000?"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="signup-panel" role="dialog" aria-labelledby="login-title">
      <button type="button" className="signup-panel__close" onClick={onClose} aria-label="Close">
        ×
      </button>
      <h2 id="login-title" className="signup-panel__title">Log in</h2>
      <p className="signup-panel__lead">Enter your email and password to continue.</p>
      <form className="signup-panel__form" onSubmit={handleSubmit}>
        <label className="signup-panel__label">
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="signup-panel__input"
          />
        </label>

        <label className="signup-panel__label">
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="signup-panel__input"
          />
        </label>

        {error && <p className="signup-panel__error">{error}</p>}

        <div className="signup-panel__actions">
          <button
            type="submit"
            disabled={submitting || !formValid}
            className="webcam-recorder__button webcam-recorder__button--photo"
          >
            {submitting ? "Logging in…" : "Log in"}
          </button>
        </div>
      </form>
    </section>
  );
}
