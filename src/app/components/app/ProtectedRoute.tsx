import { Navigate, Outlet } from "react-router";
import { useAuth } from "../../../contexts/AuthContext";

// ── Full-screen loading state — wordmark + animated green line ───────────────
function LoadingScreen() {
  return (
    <div className="bg-hero-bg min-h-screen flex flex-col items-center justify-center gap-4">
      <div className="text-foreground text-xl font-bold tracking-tight">
        RAKSHAK<span className="text-primary"> AI</span>
      </div>
      <div className="w-[120px] h-px bg-border overflow-hidden">
        <div
          className="h-full bg-primary"
          style={{
            animation: "loading-bar 1.5s cubic-bezier(0.4, 0, 0.2, 1) infinite",
          }}
        />
      </div>
      <style>{`
        @keyframes loading-bar {
          0%   { width: 0%;    transform: translateX(0); }
          50%  { width: 100%;  transform: translateX(0); }
          100% { width: 100%;  transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}

// ── Protected Route ───────────────────────────────────────────────────────────
// auth loading → full-screen skeleton
// no user     → redirect to /auth
// authenticated → render children via Outlet
export function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user)   return <Navigate to="/" replace />;
  return <Outlet />;
}
