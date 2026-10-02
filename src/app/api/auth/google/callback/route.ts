/**
 * GET /api/auth/google/callback — finish the Google sign-in flow.
 *
 * 1. Verify the `state` cookie matches the query param (CSRF protection).
 * 2. Exchange the authorization code for tokens.
 * 3. Fetch the Google profile (sub, email, name, picture).
 * 4. Upsert the customer row in Supabase.
 * 5. Issue our signed session cookie and redirect to the original page.
 */
import { NextRequest, NextResponse } from "next/server";
import {
  exchangeCodeForTokens,
  fetchGoogleProfile,
  OAUTH_STATE_COOKIE,
  OAUTH_NEXT_COOKIE,
  SESSION_COOKIE,
  createSessionToken,
} from "@/lib/auth";
import { createSupabaseClient } from "@/lib/supabase";
import { mergeDeviceCartIntoUserCart, DEVICE_COOKIE } from "@/lib/cart-owner";

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");

  /** Helper: bounce back to the login page with a friendly error code. */
  const fail = (reason: string) =>
    NextResponse.redirect(new URL(`/login?error=${reason}`, origin));

  // -- 1. CSRF check: the state we issued must echo back verbatim. ---------
  const expectedState = request.cookies.get(OAUTH_STATE_COOKIE)?.value;
  if (!code || !state || !expectedState || state !== expectedState) {
    return fail("oauth_state");
  }

  try {
    // -- 2. Swap the one-time code for tokens. -----------------------------
    const redirectUri =
      process.env.GOOGLE_REDIRECT_URI ??
      `${origin}/api/auth/google/callback`;
    const { accessToken } = await exchangeCodeForTokens(code, redirectUri);

    // -- 3. Read the user's Google profile. --------------------------------
    const profile = await fetchGoogleProfile(accessToken);

    // -- 4. Upsert the customer in Supabase. --------------------------------
    const supabase = createSupabaseClient();
    const now = new Date().toISOString();

    // Match on the stable Google `sub` first, then fall back to email.
    const { data: existing } = await supabase
      .from("customers")
      .select("id")
      .or(`google_sub.eq.${profile.sub},email.eq.${profile.email}`)
      .maybeSingle();

    let customerId: string;
    if (existing?.id) {
      // Returning customer — refresh profile fields + last-login timestamp.
      customerId = existing.id;
      await supabase
        .from("customers")
        .update({
          google_sub: profile.sub,
          email: profile.email,
          full_name: profile.name,
          avatar_url: profile.picture,
          last_login_at: now,
        })
        .eq("id", customerId);
    } else {
      // First sign-in — create the customer row.
      const { data: created, error } = await supabase
        .from("customers")
        .insert({
          google_sub: profile.sub,
          email: profile.email,
          full_name: profile.name,
          avatar_url: profile.picture,
          last_login_at: now,
        })
        .select("id")
        .single();
      if (error || !created) {
        console.error("customer upsert failed:", error?.message);
        return fail("oauth_exchange");
      }
      customerId = created.id;
    }

    // -- 5. Issue the signed session cookie. --------------------------------
    // Bring the guest (device) cart along so nothing added before signing in
    // is lost — the same cart then follows the account to the mobile app.
    const deviceId = request.cookies.get(DEVICE_COOKIE)?.value;
    if (deviceId && /^[\w-]{8,64}$/.test(deviceId)) {
      try {
        await mergeDeviceCartIntoUserCart(deviceId, customerId);
      } catch (mergeErr) {
        console.error("device cart merge failed:", mergeErr);
      }
    }

    const sessionToken = await createSessionToken({
      id: customerId,
      email: profile.email,
      name: profile.name ?? "Customer",
      picture: profile.picture,
    });

    const next = request.cookies.get(OAUTH_NEXT_COOKIE)?.value ?? "/account";
    const response = NextResponse.redirect(new URL(next, origin));
    response.cookies.set(SESSION_COOKIE, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
    // Clean up the one-time OAuth cookies.
    response.cookies.delete(OAUTH_STATE_COOKIE);
    response.cookies.delete(OAUTH_NEXT_COOKIE);

    return response;
  } catch (err) {
    console.error("Google OAuth callback failed:", err);
    return fail("oauth_exchange");
  }
}
