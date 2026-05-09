import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../../contexts/AuthContext";

export function AuthPage() {
  const { user, loading, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect authenticated users to dashboard in an effect — never during render.
  // Rendering <Navigate> synchronously causes React Error #300 when the auth state
  // update happens inside a microtask (queueMicrotask in AuthContext), because
  // React sees a render-phase navigation triggered by a post-render state change.
  useEffect(() => {
    if (!loading && user) {
      navigate("/app/dashboard", { replace: true });
    }
  }, [user, loading, navigate]);

  // While loading or navigating away — show loading indicator, not the form
  if (loading || (!loading && user)) {
    return (
      <div className="bg-hero-bg min-h-screen flex items-center justify-center">
        <span
          className="w-6 h-6 rounded-full border-2 border-primary/40 border-t-primary inline-block"
          style={{ animation: "spin 0.75s linear infinite" }}
        />
      </div>
    );
  }

  const handleGoogleSignIn = useCallback(async () => {
    setIsAuthenticating(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch {
      setError("Authentication failed. Please try again.");
      setIsAuthenticating(false);
    }
  }, [signInWithGoogle]);

  return (
    <div
      className="bg-hero-bg min-h-screen flex items-center justify-center overflow-hidden"
      style={{ isolation: "isolate" }}
    >
      {/* Radial glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 60% at 50% 50%, hsl(119 99% 46% / 0.06) 0%, transparent 70%)",
        }}
      />

      {/* Content column */}
      <div
        className="relative z-10 flex flex-col items-center max-w-sm w-full px-6"
        style={{
          animation:  "fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) both",
          willChange: "transform, opacity",
        }}
        onAnimationEnd={(e) => {
          (e.currentTarget as HTMLDivElement).style.willChange = "auto";
        }}
      >
        {/* Wordmark */}
        <div className="text-foreground text-2xl font-bold tracking-tight text-center">
          RAKSHAK<span className="text-primary">AI</span>
        </div>

        <div className="mt-12" />

        {/* Heading */}
        <h1
          className="text-foreground font-bold tracking-[-0.04em] leading-none text-center"
          style={{ fontSize: "clamp(2.5rem, 6vw, 4rem)" }}
        >
          Enter the field.
        </h1>

        {/* Subtext */}
        <p className="mt-4 text-muted-foreground text-base font-light text-center">
          Authenticate to access mission-critical systems.
        </p>

        <div className="mt-10" />

        {/* Google sign-in button */}
        <button
          id="auth-google-signin"
          onClick={handleGoogleSignIn}
          disabled={isAuthenticating || loading}
          className="w-full max-w-xs mx-auto h-[52px] bg-primary text-primary-foreground rounded-sm font-bold text-sm tracking-wide hover:brightness-110 active:scale-[0.97] transition-all duration-150 disabled:opacity-70 disabled:pointer-events-none flex items-center justify-center gap-3"
          aria-busy={isAuthenticating}
        >
          {isAuthenticating ? (
            <>
              {/* Spinner */}
              <span
                className="w-4 h-4 rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground inline-block flex-shrink-0"
                style={{ animation: "spin 0.75s linear infinite" }}
              />
              Authenticating…
            </>
          ) : loading ? (
            <>
              <span
                className="w-4 h-4 rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground inline-block flex-shrink-0"
                style={{ animation: "spin 0.75s linear infinite" }}
              />
              Loading…
            </>
          ) : (
            <>
              {/* Google logo icon */}
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </>
          )}
        </button>

        {/* Error state */}
        {error && (
          <p className="mt-3 text-destructive text-xs text-center" role="alert">
            {error}
          </p>
        )}

        {/* Fine print */}
        <p className="mt-6 text-muted-foreground/40 text-xs text-center font-light">
          Restricted access. Authorized responders only.
        </p>
      </div>
    </div>
  );
}
