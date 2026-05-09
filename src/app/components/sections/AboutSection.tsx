import { memo, useEffect, useRef, useState } from "react";
import { cn } from "../ui/utils";

function useInView(threshold = 0.15) {
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
  { value: "4",     label: "AI Providers"       },
  { value: "<2s",   label: "Response Time"       },
  { value: "31B",   label: "Gemma 4 Parameters"  },
  { value: "99.9%", label: "Cascade Uptime"      },
];

export const AboutSection = memo(function AboutSection() {
  const { ref, visible } = useInView();

  return (
    <section
      id="about"
      ref={ref}
      className="relative bg-hero-bg py-24 md:py-36 overflow-hidden"
      style={{ isolation: "isolate" }}
    >
      <div className="pointer-events-none absolute bottom-0 right-0 w-[500px] h-[400px] bg-primary/5 rounded-full blur-[140px]" />

      <div className="relative max-w-7xl mx-auto px-6 md:px-10 lg:px-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">

          {/* Left — text */}
          <div>
            <div
              className={cn("opacity-0", visible && "animate-fade-up")}
              style={{ animationDelay: "0.1s", animationFillMode: "both", ...(visible ? { willChange: "transform, opacity" } : {}) }}
              onAnimationEnd={onDone}
            >
              <span className="text-primary text-xs uppercase tracking-[0.3em] font-semibold mb-4 block">About</span>
              <h2
                className="text-foreground font-bold uppercase tracking-tight leading-[1.05] mb-6"
                style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)" }}
              >
                Built for the<br />
                <span className="text-primary">Moments</span><br />
                That Count.
              </h2>
            </div>

            <div
              className={cn("opacity-0", visible && "animate-fade-up")}
              style={{ animationDelay: "0.25s", animationFillMode: "both", ...(visible ? { willChange: "transform, opacity" } : {}) }}
              onAnimationEnd={onDone}
            >
              <p className="text-muted-foreground font-light leading-relaxed mb-6"
                style={{ fontSize: "clamp(0.9rem, 1.5vw, 1.125rem)" }}
              >
                RAKSHAK AI is a production-grade emergency response intelligence
                platform built on Google's Gemma 4 31B. Every second in a
                disaster scenario is a decision — and RAKSHAK ensures that
                decision is informed, fast, and backed by the most capable AI
                infrastructure available.
              </p>
              <p className="text-muted-foreground font-light leading-relaxed"
                style={{ fontSize: "clamp(0.9rem, 1.5vw, 1.125rem)" }}
              >
                Our architecture runs Gemma 4 cloud inference as the primary
                engine, cascading through Groq and Mistral fallbacks with
                HuggingFace BLIP vision analysis — all behind a FastAPI backend
                with real-time WebSocket coordination. Zero single points of
                failure. Zero compromises.
              </p>
            </div>
          </div>

          {/* Right — stats */}
          <div className="grid grid-cols-2 gap-px bg-border">
            {STATS.map((stat, i) => (
              <div
                key={stat.label}
                className={cn("bg-hero-bg p-8 md:p-10 opacity-0", visible && "animate-fade-up")}
                style={{
                  animationDelay:    `${0.2 + i * 0.1}s`,
                  animationFillMode: "both",
                  ...(visible ? { willChange: "transform, opacity" } : {}),
                }}
                onAnimationEnd={onDone}
              >
                <div className="text-primary font-bold leading-none mb-2" style={{ fontSize: "clamp(2rem, 4vw, 3rem)" }}>
                  {stat.value}
                </div>
                <div className="text-muted-foreground text-sm uppercase tracking-widest font-light">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
});
