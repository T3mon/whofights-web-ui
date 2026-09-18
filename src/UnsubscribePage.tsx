import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { unsubscribeFromDigest } from "./api";
import StandalonePage from "./StandalonePage";

type Status = "working" | "success" | "error" | "missing-params";

// The /unsubscribe route the footer of the weekly digest points to. No
// sign-in needed - the token in the link identifies the account, and it
// only ever switches the digest off, so a leaked link can't do harm.
export default function UnsubscribePage() {
  const { t } = useTranslation();
  const [token] = useState(() => new URLSearchParams(window.location.search).get("token"));
  const [status, setStatus] = useState<Status>(token ? "working" : "missing-params");

  useEffect(() => {
    if (!token) return;
    unsubscribeFromDigest(token)
      .then(() => setStatus("success"))
      .catch(() => setStatus("error"));
  }, [token]);

  return (
    <StandalonePage>
      {status === "working" && <p className="standalone-message">{t("unsubscribe.working")}</p>}
      {status === "success" && <p className="standalone-message">{t("unsubscribe.success")}</p>}
      {status === "error" && <p className="standalone-message standalone-error">{t("unsubscribe.error")}</p>}
      {status === "missing-params" && <p className="standalone-message standalone-error">{t("unsubscribe.invalidLink")}</p>}
    </StandalonePage>
  );
}
