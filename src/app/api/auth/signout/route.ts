/**
 * GET /api/auth/signout — clear the session cookie and go home.
 */
import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";

export async function GET(request: Request) {
  const response = NextResponse.redirect(new URL("/", request.url));
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
