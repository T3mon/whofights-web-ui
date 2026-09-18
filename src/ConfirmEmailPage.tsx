import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { confirmEmail } from "./auth";
import StandalonePage from "./StandalonePage";

type Status = "confirming" | "success" | "error" | "missing-params";

// Whether the link has what it needs is knowable synchronously from the
// URL - no need for an effect just to derive that during render.
function getParams(): { userId: string; token: string } | null {
  const params = new URLSearchParams(window.location.search);
  const userId = params.get("userId");
  const token = params.get("token");
  return userId && token ? { userId, token } : null;
}

// The /confirm-email route the link in the confirmation email points to.
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
    <StandalonePage>
      {status === "confirming" && <p className="standalone-message">{t("confirmEmail.confirming")}</p>}
      {status === "success" && <p className="standalone-message">{t("confirmEmail.success")}</p>}
      {status === "error" && <p className="standalone-message standalone-error">{error ?? t("confirmEmail.error")}</p>}
      {status === "missing-params" && <p className="standalone-message standalone-error">{t("confirmEmail.invalidLink")}</p>}
    </StandalonePage>
  );
}
