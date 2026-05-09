import { memo, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { cn } from "../ui/utils";
import { useAuth } from "../../../contexts/AuthContext";

function useInView(threshold = 0.1) {
  const ref    = useRef<HTMLDivElement>(null);
  const obsRef = useRef<IntersectionObserver | null>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    obsRef.current = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obsRef.current?.disconnect(); } },
      { threshold }
    );
    obsRef.current.observe(el);
    return () => obsRef.current?.disconnect();
  }, [threshold]);
  return { ref, visible };
}

function onDone(e: React.AnimationEvent<HTMLElement>) {
  (e.currentTarget as HTMLElement).style.willChange = "auto";
}

const STATS = [
  { value: "< 3 min",  label: "Avg. incident report time"       },
  { value: "Gemma 4",  label: "AI backbone — on-device ready"    },
  { value: "START",    label: "Triage protocol implemented"       },
  { value: "100%",     label: "Open-source, auditable logic"      },
];

export const ContactSection = memo(function ContactSection() {
  const { ref, visible } = useInView(0.08);
  const { user, signInWithGoogle } = useAuth();
  const navigate    = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const handleLogin = async () => {
    if (user) { navigate("/app/dashboard"); return; }
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
      // navigation is handled inside signInWithGoogle → navigate("/app/dashboard")
    } catch {
      setError("Sign-in failed. Please try again.");
      setLoading(false);
    }
  };

  return (
    <section
      id="contact"
      ref={ref}
      className="relative bg-background py-24 md:py-36 overflow-hidden"
      style={{ isolation: "isolate" }}
    >
      {/* Glow accent */}
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/5 rounded-full blur-[160px]" />

      <div className="relative max-w-5xl mx-auto px-6 md:px-10 lg:px-16 text-center">

        {/* ── Overline ── */}
        <div
          className={cn("opacity-0", visible && "animate-fade-up")}
          style={{ animationDelay: "0.05s", animationFillMode: "both", willChange: visible ? "transform, opacity" : "auto" }}
          onAnimationEnd={onDone}
        >
          <span className="text-primary text-xs uppercase tracking-[0.3em] font-semibold">
            Respond. Coordinate. Save lives.
          </span>
        </div>

        {/* ── Heading ── */}
        <div
          className={cn("opacity-0 mt-4", visible && "animate-fade-up")}
          style={{ animationDelay: "0.15s", animationFillMode: "both", willChange: visible ? "transform, opacity" : "auto" }}
          onAnimationEnd={onDone}
        >
          <h2
            className="text-foreground font-bold uppercase tracking-tight leading-[1.05]"
            style={{ fontSize: "clamp(2.2rem, 6vw, 4.5rem)" }}
          >
            Report an<br />
            <span className="text-primary">incident.</span>
          </h2>
        </div>

        {/* ── Sub copy ── */}
        <div
          className={cn("opacity-0 mt-6 max-w-xl mx-auto", visible && "animate-fade-up")}
          style={{ animationDelay: "0.25s", animationFillMode: "both", willChange: visible ? "transform, opacity" : "auto" }}
          onAnimationEnd={onDone}
        >
          <p className="text-muted-foreground font-light leading-relaxed" style={{ fontSize: "clamp(0.9rem, 1.5vw, 1.125rem)" }}>
            Sign in with Google to access the RAKSHAK AI command center — report disasters, coordinate responders, and run AI-powered triage in real time.
          </p>
        </div>

        {/* ── CTA Button ── */}
        <div
          className={cn("opacity-0 mt-10", visible && "animate-fade-up")}
          style={{ animationDelay: "0.35s", animationFillMode: "both", willChange: visible ? "transform, opacity" : "auto" }}
          onAnimationEnd={onDone}
        >
          <button
            onClick={handleLogin}
            disabled={loading}
            className="bg-primary text-primary-foreground font-bold text-sm uppercase tracking-widest px-10 py-4 rounded-sm hover:brightness-110 active:scale-[0.97] transition-all duration-150 disabled:opacity-60 disabled:pointer-events-none"
          >
            {loading
              ? "Signing in..."
              : user
              ? "Go to Dashboard →"
              : "Login to Report Incident"}
          </button>

          {error && (
            <p className="mt-3 text-destructive text-xs">{error}</p>
          )}

          <p className="mt-4 text-muted-foreground/40 text-xs font-light">
            Secure · Google authentication · Authorized responders only
          </p>
        </div>

        {/* ── Stats row ── */}
        <div
          className={cn("opacity-0 mt-20 grid grid-cols-2 md:grid-cols-4 gap-8", visible && "animate-fade-up")}
          style={{ animationDelay: "0.45s", animationFillMode: "both", willChange: visible ? "transform, opacity" : "auto" }}
          onAnimationEnd={onDone}
        >
          {STATS.map((s) => (
            <div key={s.label} className="flex flex-col items-center gap-2">
              <span className="text-primary font-bold text-2xl tracking-tight">{s.value}</span>
              <span className="text-muted-foreground/60 text-xs font-light text-center leading-relaxed">{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
});
