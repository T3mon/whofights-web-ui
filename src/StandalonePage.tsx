import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import "./StandalonePage.css";
import Wordmark from "./Wordmark";

interface StandalonePageProps {
  children: ReactNode;
}

// The centred card every link-target page uses (confirm email, unsubscribe):
// wordmark on top, whatever the page has to say, a way back to the calendar.
// Not part of the main calendar tree - main.tsx renders these standalone.
export default function StandalonePage({ children }: StandalonePageProps) {
  const { t } = useTranslation();
  return (
    <div className="standalone-page">
      <div className="standalone-card">
        <h1 className="standalone-title">
          <Wordmark />
        </h1>
        {children}
        <a className="standalone-back" href="/">
          {t("page.backToApp")}
        </a>
      </div>
    </div>
  );
}
