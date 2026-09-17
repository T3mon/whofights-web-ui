import { useState } from "react";
import { useTranslation } from "react-i18next";
import "./SignInButton.css";
import GoogleSignInButton from "./GoogleSignInButton";
import { login, register, resendConfirmation, signInWithGoogle, type Session } from "./auth";

type Mode = "signin" | "register";
type View = "form" | "check-email";

interface SignInButtonProps {
  onSignedIn: (session: Session) => void;
}

export default function SignInButton({ onSignedIn }: SignInButtonProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("signin");
  const [view, setView] = useState<View>("form");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent">("idle");

  function close() {
    setOpen(false);
    setMode("signin");
    setView("form");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setError(null);
    setSubmitting(false);
    setGoogleBusy(false);
    setResendState("idle");
  }

  // Google has already vouched for the person by the time this runs; the wait
  // is our own auth service, which can take several seconds to wake up.
  async function handleGoogleToken(accessToken: string) {
    setError(null);
    setGoogleBusy(true);
    try {
      const session = await signInWithGoogle(accessToken);
      onSignedIn(session);
      close();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setGoogleBusy(false);
    }
  }

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setPassword("");
    setConfirmPassword("");
    setResendState("idle");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (mode === "register" && password !== confirmPassword) {
      setError(t("auth.passwordMismatch"));
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "signin") {
        const session = await login(email, password);
        onSignedIn(session);
        close();
      } else {
        await register(email, password);
        setView("check-email");
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    setResendState("sending");
    try {
      await resendConfirmation(email);
      setResendState("sent");
    } catch {
      // resend-confirmation never reports failure to the caller by design
      // (it always looks identical whether the email exists or not) - if
      // the request itself failed (network, etc.) just let them retry.
      setResendState("idle");
    }
  }

  // Resending needs only an email address, never a password, so it must not be
  // gated behind a successful sign-in - someone who registered and never got
  // the email has no password path back in. Registering again just hits
  // "account already exists", which is why this shows on that error too.
  const canResend = email.trim().length > 0 && (mode === "signin" || error !== null);

  return (
    <div className="sign-in">
      <button type="button" className="sign-in-trigger" onClick={() => setOpen(true)}>
        {t("auth.signIn")}
      </button>

      {open && (
        <div className="sign-in-backdrop" onClick={close}>
          <div
            className="sign-in-modal"
            role="dialog"
            aria-label={t("auth.dialogTitle")}
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" className="sign-in-close" onClick={close} aria-label={t("auth.close")}>
              &times;
            </button>

            {view === "check-email" ? (
              <div className="sign-in-check">
                <h2 className="sign-in-title">{t("auth.checkEmailTitle")}</h2>
                <p className="sign-in-note">{t("auth.registerSuccess", { email })}</p>
                {resendState === "sent" ? (
                  <p className="sign-in-note">{t("auth.resendConfirmationSent")}</p>
                ) : (
                  <button type="button" className="sign-in-link" onClick={handleResend} disabled={resendState === "sending"}>
                    {t("auth.resendConfirmation")}
                  </button>
                )}
              </div>
            ) : (
              <>
                <h2 className="sign-in-title">{t("auth.dialogTitle")}</h2>

                <GoogleSignInButton onToken={handleGoogleToken} disabled={googleBusy || submitting} />
                {googleBusy && (
                  <p className="sign-in-status" role="status">
                    <span className="sign-in-spinner" aria-hidden="true" />
                    {t("auth.signingIn")}
                  </p>
                )}
                <div className="sign-in-divider" aria-hidden="true">
                  <span>{t("auth.or")}</span>
                </div>

                <div className="sign-in-tabs">
                  <button
                    type="button"
                    className={"sign-in-tab" + (mode === "signin" ? " active" : "")}
                    onClick={() => switchMode("signin")}
                    disabled={googleBusy}
                  >
                    {t("auth.signIn")}
                  </button>
                  <button
                    type="button"
                    className={"sign-in-tab" + (mode === "register" ? " active" : "")}
                    onClick={() => switchMode("register")}
                    disabled={googleBusy}
                  >
                    {t("auth.register")}
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="sign-in-form">
                  <label className="sign-in-field">
                    <span>{t("auth.email")}</span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setResendState("idle");
                      }}
                      required
                      autoComplete="email"
                      disabled={googleBusy}
                    />
                  </label>
                  <label className="sign-in-field">
                    <span>{t("auth.password")}</span>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={mode === "register" ? 10 : undefined}
                      autoComplete={mode === "signin" ? "current-password" : "new-password"}
                      disabled={googleBusy}
                    />
                  </label>
                  {mode === "register" && (
                    <label className="sign-in-field">
                      <span>{t("auth.confirmPassword")}</span>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        autoComplete="new-password"
                        disabled={googleBusy}
                      />
                    </label>
                  )}

                  {error && <p className="sign-in-error">{error}</p>}
                  {canResend && (
                    <button type="button" className="sign-in-link" onClick={handleResend} disabled={resendState !== "idle"}>
                      {resendState === "sent" ? t("auth.resendConfirmationSent") : t("auth.resendConfirmation")}
                    </button>
                  )}

                  <button type="submit" className="sign-in-submit" disabled={submitting || googleBusy}>
                    {submitting ? t("app.loading") : mode === "signin" ? t("auth.submitSignIn") : t("auth.submitRegister")}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
