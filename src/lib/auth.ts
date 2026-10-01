/**
 * Google Sign-In + session management.
 *
 * ── How authentication works in this app ─────────────────────────────────
 * 1. "Sign in with Google" sends the browser to /api/auth/google, which
 *    redirects to Google's OAuth 2.0 consent screen (Authorization Code flow)
 *    using the client credentials from Google Cloud Console.
 * 2. Google calls back /api/auth/google/callback with a one-time `code`.
 * 3. The callback exchanges the code for tokens, reads the user's profile
 *    from the Google UserInfo endpoint, upserts the customer in Supabase and
 *    issues our own signed session cookie (a JWT, HS256-signed with
 *    AUTH_SECRET).
 * 4. Server components / routes read that cookie via `getSessionUser()`.
 *
 * The credentials live in the OAuth client JSON downloaded from Google Cloud
 * Console (API keys/google auth keys.json) and are wired in via .env.local.
 */
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { SessionUser } from "./types";

// ---------------------------------------------------------------------------
// Environment / constants
// ---------------------------------------------------------------------------

/** Cookie that holds the signed session JWT (7 days). */
export const SESSION_COOKIE = "vm_session";
/** Cookie that holds the OAuth CSRF `state` while the round-trip is in flight. */
export const OAUTH_STATE_COOKIE = "vm_oauth_state";
/** Cookie that remembers which page to return to after sign-in. */
export const OAUTH_NEXT_COOKIE = "vm_oauth_next";

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

/** Hex-encoded secret used to sign session JWTs (generated once per install). */
function authSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "AUTH_SECRET is missing or too short. Generate one with: openssl rand -hex 32"
    );
  }
  return new TextEncoder().encode(secret);
}

/** Google OAuth client credentials (Google Cloud Console → Credentials). */
export function googleOAuthConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET missing. " +
        "Copy the values from 'API keys/google auth keys.json' into .env.local."
    );
  }
  return { clientId, clientSecret };
}

// ---------------------------------------------------------------------------
// Session cookie (signed JWT)
// ---------------------------------------------------------------------------

/** Create a signed session JWT for a user (valid for 7 days). */
export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(authSecret());
}

/** Verify + decode the session JWT, or return null when invalid/expired. */
export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, authSecret());
    if (!payload.sub || typeof payload.email !== "string") return null;
    return {
      id: payload.sub,
      email: payload.email,
      name: typeof payload.name === "string" ? payload.name : "Customer",
      picture: typeof payload.picture === "string" ? payload.picture : null,
    };
  } catch {
    return null; // bad signature / expired token
  }
}

/**
 * Read the current signed-in user from the request cookies.
 * Safe to call from server components and route handlers.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

// ---------------------------------------------------------------------------
// Google OAuth 2.0 helpers
// ---------------------------------------------------------------------------

/** Build the Google consent-screen URL (Authorization Code flow). */
export function buildGoogleAuthUrl(redirectUri: string, state: string): string {
  const { clientId } = googleOAuthConfig();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    // We only need identity — no Gmail/Drive scopes.
    scope: "openid email profile",
    state,
    // Let the user pick an account even when already signed in to Google.
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/** Exchange the one-time authorization code for tokens at Google's token endpoint. */
export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string
): Promise<{ accessToken: string }> {
  const { clientId, clientSecret } = googleOAuthConfig();
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) {
    throw new Error(`Google token exchange failed: ${await res.text()}`);
  }
  const tokens = (await res.json()) as { access_token?: string };
  if (!tokens.access_token) {
    throw new Error("Google token exchange returned no access_token");
  }
  return { accessToken: tokens.access_token };
}

/** Fetch the signed-in Google user's profile from the UserInfo endpoint. */
export async function fetchGoogleProfile(accessToken: string): Promise<{
  sub: string;
  email: string;
  name: string | null;
  picture: string | null;
}> {
  const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Google userinfo failed: ${await res.text()}`);
  }
  const profile = (await res.json()) as {
    sub: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
    picture?: string;
  };
  if (!profile.email) {
    throw new Error("Google account did not share an email address");
  }
  return {
    sub: profile.sub,
    email: profile.email,
    name: profile.name ?? null,
    picture: profile.picture ?? null,
  };
}

/** Cryptographically-random state value for the OAuth CSRF check. */
export function randomState(): string {
  return crypto.randomUUID().replace(/-/g, "");
}
