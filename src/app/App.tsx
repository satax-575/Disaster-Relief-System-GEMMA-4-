import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { Suspense, lazy, memo } from "react";
import { AuthProvider }    from "../contexts/AuthContext";
import { LocationProvider } from "../contexts/LocationContext";
import { LandingPage }    from "./pages/LandingPage";
import { AuthPage }       from "./pages/AuthPage";
import { ProtectedRoute } from "./components/app/ProtectedRoute";
import { AppLayout }      from "./components/app/AppLayout";
import { ErrorBoundary }  from "./components/app/ErrorBoundary";
import { Toaster }        from "./components/ui/sonner";

// ── Lazy-load all protected pages — none ship in the main bundle ─────────────
const Dashboard      = lazy(() => import("./pages/Dashboard").then(m      => ({ default: m.Dashboard })));
const IncidentsPage  = lazy(() => import("./pages/IncidentsPage").then(m  => ({ default: m.IncidentsPage })));
const AssessPage     = lazy(() => import("./pages/AssessPage").then(m     => ({ default: m.AssessPage })));
const TriagePage     = lazy(() => import("./pages/TriagePage").then(m     => ({ default: m.TriagePage })));
const AssistantPage  = lazy(() => import("./pages/AssistantPage").then(m  => ({ default: m.AssistantPage })));
const RespondersPage = lazy(() => import("./pages/RespondersPage").then(m => ({ default: m.RespondersPage })));
const AlertsPage     = lazy(() => import("./pages/AlertsPage").then(m     => ({ default: m.AlertsPage })));

// ── Page skeleton — pulsing placeholder that matches app chrome ──────────────
const PageSkeleton = memo(function PageSkeleton() {
  return (
    <div className="space-y-4 animate-pulse" aria-hidden="true">
      <div className="h-8 w-48 bg-white/[0.05] rounded-lg" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 bg-white/[0.04] border border-white/[0.06] rounded-xl" />
        ))}
      </div>
      <div className="h-64 bg-white/[0.03] border border-white/[0.06] rounded-xl" />
    </div>
  );
});

// ── Wrapped lazy page: boundary + suspense together ──────────────────────────
function Page({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageSkeleton />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <LocationProvider>
        <AuthProvider>
          <Routes>
            {/* ── PUBLIC ──────────────────────────────────────────────── */}
            <Route path="/"     element={<LandingPage />} />
            <Route path="/auth" element={<AuthPage />} />

            {/* ── PROTECTED — wrapped in AppLayout ────────────────────── */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/app/dashboard"  element={<Page><Dashboard /></Page>} />
                <Route path="/app/incidents"  element={<Page><IncidentsPage /></Page>} />
                <Route path="/app/assess"     element={<Page><AssessPage /></Page>} />
                <Route path="/app/triage"     element={<Page><TriagePage /></Page>} />
                <Route path="/app/assistant"  element={<Page><AssistantPage /></Page>} />
                <Route path="/app/responders" element={<Page><RespondersPage /></Page>} />
                <Route path="/app/alerts"     element={<Page><AlertsPage /></Page>} />
                <Route path="/app"            element={<Navigate to="/app/dashboard" replace />} />
              </Route>
            </Route>

            {/* ── Fallback ─────────────────────────────────────────────── */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>

          {/* Sonner toast — bottom-right, matches dark theme */}
          <Toaster position="bottom-right" richColors />
        </AuthProvider>
      </LocationProvider>
    </BrowserRouter>
  );
}