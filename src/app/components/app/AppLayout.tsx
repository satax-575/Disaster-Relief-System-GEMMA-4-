import {
  Outlet, NavLink, useNavigate, useLocation,
} from "react-router";
import {
  useAuth,
} from "../../../contexts/AuthContext";
import { cn } from "../ui/utils";
import { useIncidents, useAlerts } from "../../../lib/hooks";
import {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
} from "react";

// ── Topbar context ────────────────────────────────────────────────────────────
interface TopbarCtx { title: string; right?: ReactNode; }

const TopbarContext = createContext<{
  set: (v: TopbarCtx) => void;
}>({ set: () => {} });

export function useTopbar() { return useContext(TopbarContext); }

// ── Nav items ─────────────────────────────────────────────────────────────────
const NAV = [
  { label: "Dashboard",  to: "/app/dashboard",  badge: "incidents" as const },
  { label: "Incidents",  to: "/app/incidents",  badge: "incidents" as const },
  { label: "AI Assess",  to: "/app/assess" },
  { label: "Triage",     to: "/app/triage" },
  { label: "Assistant",  to: "/app/assistant" },
  { label: "Responders", to: "/app/responders" },
  { label: "Alerts",     to: "/app/alerts",     badge: "alerts" as const },
];

const AI_MODEL = (import.meta.env.VITE_AI_MODEL_NAME as string | undefined) ?? "Gemma 4 31B";

// ── AppLayout ─────────────────────────────────────────────────────────────────
export function AppLayout() {
  const { user, signOut }       = useAuth();
  const { data: incidents }     = useIncidents();
  const { data: alerts }        = useAlerts();
  const activeIncidentCount     = incidents.filter((i) => i.status === "active").length;
  const activeAlertCount        = alerts.filter((a) => a.status === "active").length;
  const [topbar, setTopbar]     = useState<TopbarCtx>({ title: "RAKSHAK AI" });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate    = useNavigate();
  const location    = useLocation();
  const mainRef     = useRef<HTMLDivElement>(null);

  // Stable context value — avoids re-rendering every consumer on every render
  const setTopbarStable = useCallback((v: TopbarCtx) => setTopbar(v), []);
  const ctxValue = useMemo(() => ({ set: setTopbarStable }), [setTopbarStable]);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Close sidebar on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSidebarOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // Lock body scroll when mobile sidebar is open
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [sidebarOpen]);

  const getBadgeCount = (badge?: "incidents" | "alerts") => {
    if (badge === "incidents") return activeIncidentCount;
    if (badge === "alerts")    return activeAlertCount;
    return 0;
  };

  const SidebarContent = () => (
    <>
      {/* Wordmark + model status */}
      <div className="px-6 pt-6 pb-8">
        <button
          className="text-foreground text-base font-semibold tracking-tight text-left hover:text-primary transition-colors"
          onClick={() => navigate("/app/dashboard")}
        >
          RAKSHAK<span className="text-primary">AI</span>
        </button>
        <div className="mt-2 flex items-center gap-1.5">
          <span
            className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 animate-pulse"
          />
          <span className="text-muted-foreground/60 text-[11px] font-light truncate">
            {AI_MODEL}
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="px-3 flex-1 overflow-y-auto">
        {NAV.map((item) => {
          const badgeCount = getBadgeCount(item.badge);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-all mb-0.5",
                  isActive
                    ? "text-foreground bg-white/[0.07]"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]",
                )
              }
            >
              {item.label}
              {badgeCount > 0 && (
                <span className="text-[10px] bg-destructive/80 text-white rounded-sm px-1.5 py-0.5 font-bold tabular-nums">
                  {badgeCount}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom user row */}
      <div
        className="px-4 py-4 flex items-center gap-3"
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
      >
        {user?.photoURL ? (
          <img
            src={user.photoURL}
            alt={user.displayName ?? "User"}
            className="w-7 h-7 rounded-full object-cover flex-shrink-0"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-secondary flex-shrink-0 flex items-center justify-center text-xs font-bold text-foreground/60">
            {user?.displayName?.[0]?.toUpperCase() ?? "?"}
          </div>
        )}
        <span className="text-foreground text-sm truncate max-w-[110px] flex-1">
          {user?.displayName ?? "Responder"}
        </span>
        <button
          onClick={signOut}
          className="text-muted-foreground/50 text-xs hover:text-destructive transition-colors flex-shrink-0"
        >
          Sign out
        </button>
      </div>
    </>
  );

  return (
    <TopbarContext.Provider value={ctxValue}>
      <div className="flex min-h-screen bg-hero-bg">

        {/* ── Desktop Sidebar ───────────────────────────────────────── */}
        <aside
          className="hidden md:flex fixed left-0 top-0 h-full w-60 flex-col z-30"
          style={{
            background:    "rgba(0,0,0,0.6)",
            borderRight:   "1px solid rgba(255,255,255,0.06)",
            backdropFilter: "blur(8px)",
          }}
        >
          <SidebarContent />
        </aside>

        {/* ── Mobile Sidebar Overlay ────────────────────────────────── */}
        {sidebarOpen && (
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/60"
            style={{ backdropFilter: "blur(2px)" }}
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}
        <aside
          className={cn(
            "md:hidden fixed left-0 top-0 h-full w-72 flex flex-col z-50 transition-transform duration-300",
            sidebarOpen ? "translate-x-0" : "-translate-x-full",
          )}
          style={{
            background:    "rgba(10,10,10,0.97)",
            borderRight:   "1px solid rgba(255,255,255,0.06)",
            backdropFilter: "blur(12px)",
          }}
          aria-label="Navigation menu"
        >
          <SidebarContent />
        </aside>

        {/* ── Main area ─────────────────────────────────────────────── */}
        <div className="md:ml-60 flex-1 flex flex-col min-h-screen w-full">

          {/* Topbar */}
          <header
            className="fixed top-0 left-0 md:left-60 right-0 h-14 flex items-center justify-between px-4 md:px-8 z-40"
            style={{
              background:   "hsl(0 0% 8% / 0.8)",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              backdropFilter: "blur(8px)",
            }}
          >
            {/* Mobile hamburger */}
            <div className="flex items-center gap-3">
              <button
                className="md:hidden text-muted-foreground hover:text-foreground transition-colors p-1"
                onClick={() => setSidebarOpen((v) => !v)}
                aria-label="Toggle navigation"
                aria-expanded={sidebarOpen}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  {sidebarOpen
                    ? <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    : <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                  }
                </svg>
              </button>
              <span className="text-foreground text-base font-semibold">
                {topbar.title}
              </span>
            </div>
            {topbar.right && <div className="flex items-center">{topbar.right}</div>}
          </header>

          {/* Page content */}
          <main ref={mainRef} className="pt-14 flex-1 p-4 md:p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </TopbarContext.Provider>
  );
}
