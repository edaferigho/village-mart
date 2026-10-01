/**
 * GET /api/auth/google — start the Google sign-in flow.
 *
 * Generates a CSRF `state`, stashes it (plus the post-login redirect target)
 * in short-lived httpOnly cookies, then redirects the browser to Google's
 * consent screen.
 */
import { NextRequest, NextResponse } from "next/server";
import { buildGoogleAuthUrl, OAUTH_STATE_COOKIE, OAUTH_NEXT_COOKIE, randomState } from "@/lib/auth";

export async function GET(request: NextRequest) {
  // Where Google should land the user back in our app. Defaults to the
  // callback route on the current origin; override with GOOGLE_REDIRECT_URI
  // if the app runs behind a proxy or non-standard port.
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ??
    `${request.nextUrl.origin}/api/auth/google/callback`;

  const state = randomState();
  const next = request.nextUrl.searchParams.get("next") ?? "/account";

  const response = NextResponse.redirect(
    buildGoogleAuthUrl(redirectUri, state)
  );

  const isProduction = process.env.NODE_ENV === "production";
  const baseCookie = {
    httpOnly: true, // invisible to client-side JS
    secure: isProduction,
    sameSite: "lax" as const,
    path: "/",
  };

  // 10 minutes is plenty for the Google round-trip.
  response.cookies.set(OAUTH_STATE_COOKIE, state, { ...baseCookie, maxAge: 600 });
  // Remember where to send the user after sign-in completes.
  response.cookies.set(OAUTH_NEXT_COOKIE, next.startsWith("/") ? next : "/account", {
    ...baseCookie,
    maxAge: 600,
  });

  return response;
}
