/**
 * Login page — offers Google Sign-In (Authorization Code flow via
 * /api/auth/google). Signed-in visitors are bounced to their account page.
 */
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import LoginButton from "@/components/LoginButton";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string; error?: string };
}) {
  // Already signed in? Skip the form.
  const user = await getSessionUser();
  if (user) redirect("/account");

  const friendlyError: Record<string, string> = {
    oauth_state: "Your sign-in session expired. Please try again.",
    oauth_exchange: "Google sign-in failed during token exchange. Please try again.",
    oauth_profile: "We couldn't read your Google profile. Please try again.",
    oauth_config: "Google sign-in isn't configured yet — add the credentials to .env.local.",
  };

  return (
    <div className="container-page flex justify-center py-16">
      <div className="card w-full max-w-md p-8">
        <div className="text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-white">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
              <path d="M3 9h18l-1.5 10.5A2 2 0 0 1 17.5 21h-11a2 2 0 0 1-2-1.5L3 9Z" strokeLinejoin="round" />
              <path d="M8 9 12 3l4 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <h1 className="mt-4 text-2xl font-extrabold text-navy">Welcome to Village Mart</h1>
          <p className="mt-2 text-sm text-slate-500">
            Sign in to track orders, check out faster and save your delivery details.
          </p>
        </div>

        {searchParams.error && (
          <p role="alert" className="mt-6 rounded-lg bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            {friendlyError[searchParams.error] ?? "Sign-in failed. Please try again."}
          </p>
        )}

        <div className="mt-8">
          {/* The `next` query param is carried through the OAuth round-trip
              so users land back where they started. */}
          <LoginButton next={searchParams.next ?? "/account"} />
        </div>

        <ul className="mt-8 space-y-2.5 text-sm text-slate-500">
          <li className="flex items-center gap-2.5"><span className="text-brand-600">✓</span> Track every order in one place</li>
          <li className="flex items-center gap-2.5"><span className="text-brand-600">✓</span> Faster checkout with saved details</li>
          <li className="flex items-center gap-2.5"><span className="text-brand-600">✓</span> Exclusive deals for members</li>
        </ul>

        <p className="mt-8 text-center text-xs leading-5 text-slate-400">
          We only request your name, email and profile photo.
          <br />
          No password needed — authentication is handled by Google.
        </p>
      </div>
    </div>
  );
}
