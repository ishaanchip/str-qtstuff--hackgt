import { useState } from "react";
import { checkAccount, createAccount, getSignupValues, isSignupValid, saveUserEmail } from "../homeHelper";

export default function SignupPanel({ image, onRetake, onAccount, onLogin, onClose }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState("male");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [existsWarning, setExistsWarning] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const account = getSignupValues({
    firstName,
    lastName,
    gender,
    email,
    password,
    image,
  });
  const formValid = isSignupValid(account);

  const showExistsWarning = () => {
    setExistsWarning(true);
    setError("Account was not created. An account with this email already exists. Please log in.");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setExistsWarning(false);

    if (!formValid) {
      setError("Fill in every field with a valid value before creating an account.");
      return;
    }

    setSubmitting(true);
    try {
      const { exists } = await checkAccount(account.email);
      if (exists) {
        showExistsWarning();
        return;
      }

      const data = await createAccount(account);
      saveUserEmail(account.email);
      onAccount?.(data.account);
      onClose?.();
    } catch (err) {
      if (err.response?.status === 409 || err.response?.data?.exists) {
        showExistsWarning();
        return;
      }

      setError(
        err.response?.data?.error ||
          err.message ||
          "Could not reach the server. Is it running on port 4000?"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="signup-panel" role="dialog" aria-labelledby="signup-title">
      <h2 id="signup-title" className="signup-panel__title">Sign up</h2>
      <p className="signup-panel__lead">This photo is saved as your reference image.</p>

      <img src={image} alt="The photo you just took" className="signup-panel__photo" />

      <form className="signup-panel__form" onSubmit={handleSubmit}>
          <label className="signup-panel__label">
            First name
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              autoComplete="given-name"
              className="signup-panel__input"
            />
          </label>

          <label className="signup-panel__label">
            Last name
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              autoComplete="family-name"
              className="signup-panel__input"
            />
          </label>

          <label className="signup-panel__label">
            Gender
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              required
              className="signup-panel__input"
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </label>

          <label className="signup-panel__label">
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setExistsWarning(false);
              }}
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
              autoComplete="new-password"
              className="signup-panel__input"
            />
          </label>

          {error && (
            <p className={`signup-panel__error${existsWarning ? " signup-panel__error--warning" : ""}`}>
              {error}
              {existsWarning && (
                <>
                  {" "}
                  <button
                    type="button"
                    className="signup-panel__login-link"
                    onClick={() => onLogin?.(account.email)}
                  >
                    Go to log in
                  </button>
                </>
              )}
            </p>
          )}

          <div className="signup-panel__actions">
            <button
              type="button"
              onClick={onRetake}
              className="webcam-recorder__button signup-panel__retake"
            >
              Retake
            </button>
            <button
              type="submit"
              disabled={submitting || !formValid}
              className="webcam-recorder__button webcam-recorder__button--photo"
            >
              {submitting ? "Creating…" : "Create account"}
            </button>
            <p className="signup-panel__login">
              Already Have an Account?{" "}
              <button
                type="button"
                className="signup-panel__login-link"
                onClick={() => onLogin?.(account.email)}
              >
                Log in
              </button>
            </p>
          </div>
      </form>
    </section>
  );
}
