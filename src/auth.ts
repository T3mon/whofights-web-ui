const AUTH_BASE_URL = import.meta.env.VITE_AUTH_BASE_URL ?? "http://localhost:5090";
const STORAGE_KEY = "whofights.session";

export interface Session {
  token: string;
  expiresAt: string;
  email: string;
}

export function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as Session;
    if (new Date(session.expiresAt).getTime() <= Date.now()) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Private browsing, storage disabled, etc. - nothing was persisted anyway.
  }
}

function saveSession(session: Session): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Session still works for this page load, it just won't survive a reload.
  }
}

// The API answers errors two ways depending on which endpoint hit them: a
// plain string body for Conflict/Unauthorized/BadRequest("some message"),
// or a ProblemDetails JSON object for Problem(...) validation failures.
// Try JSON first and fall back to the raw text either way.
async function extractErrorMessage(response: Response, fallback: string): Promise<string> {
  const text = await response.text();
  try {
    const problem = JSON.parse(text) as { detail?: string; title?: string };
    return problem.detail ?? problem.title ?? text;
  } catch {
    return text || fallback;
  }
}

// Exchanges the access token from Google's popup (see GoogleSignInButton) for our own session.
export async function signInWithGoogle(accessToken: string): Promise<Session> {
  const response = await fetch(`${AUTH_BASE_URL}/auth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accessToken }),
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, "Google sign-in failed."));
  }

  const data = (await response.json()) as { token: string; expiresAt: string; email: string };
  const session: Session = { token: data.token, expiresAt: data.expiresAt, email: data.email };
  saveSession(session);
  return session;
}

export async function register(email: string, password: string): Promise<void> {
  const response = await fetch(`${AUTH_BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, "Registration failed."));
  }
}

export async function login(email: string, password: string): Promise<Session> {
  const response = await fetch(`${AUTH_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, "Sign in failed."));
  }

  const data = (await response.json()) as { token: string; expiresAt: string; email: string };
  const session: Session = { token: data.token, expiresAt: data.expiresAt, email: data.email };
  saveSession(session);
  return session;
}

// Confirming returns a session too - the link proves control of the inbox, so
// the user is signed in rather than being sent back to the form.
export async function confirmEmail(userId: string, token: string): Promise<Session> {
  const response = await fetch(`${AUTH_BASE_URL}/auth/confirm-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, token }),
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, "Email confirmation failed."));
  }

  const data = (await response.json()) as { token: string; expiresAt: string; email: string };
  const session: Session = { token: data.token, expiresAt: data.expiresAt, email: data.email };
  saveSession(session);
  return session;
}

export async function resendConfirmation(email: string): Promise<void> {
  const response = await fetch(`${AUTH_BASE_URL}/auth/resend-confirmation`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, "Could not resend the confirmation email."));
  }
}
