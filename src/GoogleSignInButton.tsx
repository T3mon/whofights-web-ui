import { useState } from "react";
import { useTranslation } from "react-i18next";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const GIS_SCRIPT_SRC = "https://accounts.google.com/gsi/client";

interface TokenResponse {
  access_token?: string;
  error?: string;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: TokenResponse) => void;
            error_callback?: (error: { type: string }) => void;
          }) => { requestAccessToken: () => void };
        };
      };
    };
  }
}

// Google's script self-registers as window.google once loaded - only fetch
// it once no matter how many times this component mounts.
function loadGoogleScript(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();

  const existing = document.querySelector<HTMLScriptElement>(`script[src="${GIS_SCRIPT_SRC}"]`);
  if (existing) {
    return new Promise((resolve) => existing.addEventListener("load", () => resolve()));
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = GIS_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Sign-In script"));
    document.head.appendChild(script);
  });
}

// Opens Google's account-chooser popup and resolves with an access token, or
// null if the person closed the popup without choosing.
function requestGoogleAccessToken(): Promise<string | null> {
  return new Promise((resolve, reject) => {
    if (!window.google) {
      reject(new Error("Google Sign-In is unavailable"));
      return;
    }
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: "openid email profile",
      callback: (response) => {
        if (response.access_token) resolve(response.access_token);
        else reject(new Error(response.error ?? "Google sign-in failed"));
      },
      error_callback: (error) => {
        if (error.type === "popup_closed") resolve(null);
        else reject(new Error(error.type));
      },
    });
    client.requestAccessToken();
  });
}

interface GoogleSignInButtonProps {
  // Receives the token; the caller owns the exchange with our auth service so
  // it can show progress and errors in the surrounding dialog.
  onToken: (accessToken: string) => Promise<void>;
  disabled?: boolean;
}

// A button we draw ourselves instead of Google's rendered one: Google's widget
// switches to a "Continue as <name>" personalized variant for anyone already
// signed into Google, and forces its own framing - neither fits the dialog.
// Custom buttons may only obtain access tokens (not ID tokens), which is why
// the auth service verifies both kinds.
export default function GoogleSignInButton({ onToken, disabled = false }: GoogleSignInButtonProps) {
  const { t } = useTranslation();
  const [opening, setOpening] = useState(false);

  if (!GOOGLE_CLIENT_ID) return null;

  async function handleClick() {
    setOpening(true);
    try {
      await loadGoogleScript();
      const token = await requestGoogleAccessToken();
      if (token) await onToken(token);
    } finally {
      setOpening(false);
    }
  }

  return (
    <button type="button" className="google-sign-in" onClick={handleClick} disabled={disabled || opening}>
      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.5 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.3l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
        <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4 7.1-10 7.1-17.5z" />
        <path fill="#FBBC05" d="M10.5 28.6A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.6l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.7l7.9-6.1z" />
        <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.9l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
      </svg>
      {t("auth.continueWithGoogle")}
    </button>
  );
}
