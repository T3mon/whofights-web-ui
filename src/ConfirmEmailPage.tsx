import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import "./ConfirmEmailPage.css";
import { confirmEmail } from "./auth";
import Wordmark from "./Wordmark";

type Status = "confirming" | "success" | "error" | "missing-params";

// Whether the link has what it needs is knowable synchronously from the
// URL - no need for an effect just to derive that during render.
function getParams(): { userId: string; token: string } | null {
  const params = new URLSearchParams(window.location.search);
  const userId = params.get("userId");
  const token = params.get("token");
  return userId && token ? { userId, token } : null;
}

// Not part of the main calendar tree - main.tsx renders this standalone for
// the /confirm-email route the link in the confirmation email points to.
export default function ConfirmEmailPage() {
  const { t } = useTranslation();
  const [params] = useState(getParams);
  const [status, setStatus] = useState<Status>(params ? "confirming" : "missing-params");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params) return;
    confirmEmail(params.userId, params.token)
      .then(() => {
        setStatus("success");
        // The session is saved by now, so send them into the calendar already
        // signed in. replace() keeps the token-bearing URL out of history.
        window.location.replace("/");
      })
      .catch((err: Error) => {
        setError(err.message);
        setStatus("error");
      });
  }, [params]);

  return (
    <div className="confirm-email-page">
      <div className="confirm-email-card">
        <h1 className="confirm-email-title">
          <Wordmark />
        </h1>

        {status === "confirming" && <p className="confirm-email-message">{t("confirmEmail.confirming")}</p>}
        {status === "success" && <p className="confirm-email-message">{t("confirmEmail.success")}</p>}
        {status === "error" && <p className="confirm-email-message confirm-email-error">{error ?? t("confirmEmail.error")}</p>}
        {status === "missing-params" && <p className="confirm-email-message confirm-email-error">{t("confirmEmail.invalidLink")}</p>}

        <a className="confirm-email-back" href="/">
          {t("confirmEmail.backToApp")}
        </a>
      </div>
    </div>
  );
}
