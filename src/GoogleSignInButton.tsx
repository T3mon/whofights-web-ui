import { useEffect, useRef } from "react";
import { signInWithGoogle, type Session } from "./auth";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const GIS_SCRIPT_SRC = "https://accounts.google.com/gsi/client";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (response: { credential: string }) => void }) => void;
          renderButton: (
            parent: HTMLElement,
            options: { theme: string; size: string; shape?: string; text?: string; width?: number },
          ) => void;
        };
      };
    };
  }
}

// Google's script self-registers as window.google once loaded - only fetch
// it once no matter how many times this component mounts.
function loadGoogleScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();

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

interface GoogleSignInButtonProps {
  onSignedIn: (session: Session) => void;
}

// Google only permits its own rendered button for "Sign in with Google", so
// the look is chosen from its options rather than styled by us: the dark
// filled theme sits on our surfaces without the white-slab effect, and the
// pill shape matches the dialog's controls.
export default function GoogleSignInButton({ onSignedIn }: GoogleSignInButtonProps) {
  const buttonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      console.warn("VITE_GOOGLE_CLIENT_ID is not set - Google sign-in is hidden.");
      return;
    }
    let cancelled = false;

    loadGoogleScript()
      .then(() => {
        const container = buttonRef.current;
        if (cancelled || !window.google || !container) return;

        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => {
            signInWithGoogle(response.credential).then(onSignedIn).catch(console.error);
          },
        });
        // Google clamps width to 200-400px; fill the dialog within that.
        const width = Math.min(400, Math.max(200, Math.round(container.clientWidth)));
        window.google.accounts.id.renderButton(container, {
          theme: "filled_black",
          size: "large",
          shape: "pill",
          text: "continue_with",
          width,
        });
      })
      .catch(console.error);

    return () => {
      cancelled = true;
    };
  }, [onSignedIn]);

  if (!GOOGLE_CLIENT_ID) return null;

  return <div ref={buttonRef} className="google-sign-in" />;
}
