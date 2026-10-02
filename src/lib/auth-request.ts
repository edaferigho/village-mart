/**
 * Request-scoped session resolution for API routes.
 *
 * Accepts the admin/customer session from EITHER:
 *   • the signed cookie (website), or
 *   • an `Authorization: Bearer <token>` header (mobile app).
 *
 * Both carry the same HS256 JWT issued at sign-in / device pairing, so a
 * customer has one identity across web and mobile.
 */
import { cookies, headers } from "next/headers";
import { SESSION_COOKIE, verifySessionToken } from "./auth";
import type { SessionUser } from "./types";

/** Resolve the signed-in user for an API request, or null. */
export async function resolveRequestUser(): Promise<SessionUser | null> {
  const bearer = headers().get("authorization");
  if (bearer?.toLowerCase().startsWith("bearer ")) {
    const user = await verifySessionToken(bearer.slice(7).trim());
    if (user) return user;
  }
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/** True when the caller presented a valid session (cookie or bearer). */
export async function hasRequestSession(): Promise<boolean> {
  return (await resolveRequestUser()) !== null;
}
