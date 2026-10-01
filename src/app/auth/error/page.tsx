import Link from "next/link";

/**
 * Friendly landing spot for Auth.js failures.
 *
 * The most common cause by far is a mismatch between AUTH_URL (the callback
 * Google redirects to) and the port the app is actually served on, which
 * otherwise shows up as a bare 404 with no explanation.
 */
const EXPLANATIONS: Record<string, string> = {
  Configuration:
    "The server is missing configuration — most often AUTH_URL, AUTH_GOOGLE_ID or AUTH_SECRET.",
  AccessDenied: "You declined the permission request in Google's consent screen.",
  OAuthAccountNotLinked:
    "That Google account uses the same email as a different sign-in method.",
  OAuthCallback: "Google sent the sign-in request back to the wrong address.",
  SessionRequired: "You need to sign in to view that page.",
};

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; errorCode?: string }>;
}) {
  const { error } = await searchParams;
  const key = error ?? "";
  const detail = EXPLANATIONS[key];

  return (
    <div className="max-w-lg mx-auto mt-8">
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="text-4xl mb-2">🔐</div>
          <h1 className="card-title text-2xl">Sign-in failed</h1>

          {detail ? (
            <p className="text-base-content/70">{detail}</p>
          ) : (
            <p className="text-base-content/70">
              Google could not complete the sign-in.
            </p>
          )}

          {key && (
            <div className="alert alert-warning mt-2">
              <span className="font-mono text-sm">{key}</span>
            </div>
          )}

          <div className="alert alert-info mt-2">
            <span className="text-sm">
              If this happens on localhost, check that{" "}
              <code>AUTH_URL</code> in <code>.env.local</code> matches the port
              you are running on, and that the same URL is listed as an
              authorized redirect URI in Google Cloud Console.
            </span>
          </div>

          <div className="card-actions mt-4">
            <Link href="/login" className="btn btn-primary">
              Try again
            </Link>
            <Link href="/" className="btn btn-ghost">
              Back to shop
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}