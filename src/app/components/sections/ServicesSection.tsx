import { memo, useEffect, useRef, useState } from "react";
import { cn } from "../ui/utils";

// ── Shared IntersectionObserver hook ───────────────────────────────────────
function useInView(threshold = 0.15) {
  const ref     = useRef<HTMLDivElement>(null);
  const obsRef  = useRef<IntersectionObserver | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    obsRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obsRef.current?.disconnect(); // fire-once — no continuous polling
        }
      },
      { threshold }
    );
    obsRef.current.observe(el);
    return () => obsRef.current?.disconnect();
  }, [threshold]);

  return { ref, visible };
}

// ── GPU-safe animated div helper ───────────────────────────────────────────
function onDone(e: React.AnimationEvent<HTMLElement>) {
  (e.currentTarget as HTMLElement).style.willChange = "auto";
}

interface ServiceCard {
  index: string;
  title: string;
  description: string;
  tags: string[];
}

const SERVICES: ServiceCard[] = [
  {
    index: "01",
    title: "AI Emergency Triage",
    description:
      "Real-time incident classification and severity scoring powered by Gemma 4 31B. Multi-agency dispatch coordination with zero-latency decision routing across your entire emergency network.",
    tags: ["Gemma 4", "Real-time", "Classification"],
  },
  {
    index: "02",
    title: "Multimodal Surveillance",
    description:
      "BLIP-powered image analysis combined with AI threat detection across live feeds. Instant visual triage from disaster zones — no human-in-the-loop bottleneck.",
    tags: ["BLIP Vision", "Threat Detection", "Live Feeds"],
  },
  {
    index: "03",
    title: "Medical RAG Intelligence",
    description:
      "Instant medical protocol retrieval at disaster sites using our embedded knowledge base. Gemma 4 answers critical treatment questions in under two seconds — even offline.",
    tags: ["Medical RAG", "Protocol Engine", "Offline-ready"],
  },
  {
    index: "04",
    title: "Multi-Provider Cascade",
    description:
      "Groq + Mistral + Gemma 4 failover architecture. If one provider fails, the next activates automatically — zero downtime, zero blind spots, zero compromise on response quality.",
    tags: ["Groq", "Mistral", "Zero Downtime"],
  },
];

export const ServicesSection = memo(function ServicesSection() {
  const { ref, visible } = useInView();

  return (
    <section
      id="services"
      ref={ref}
      className="relative bg-background py-24 md:py-36 overflow-hidden"
      style={{ isolation: "isolate" }}
    >
      {/* Ambient glow — static, no animation */}
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary/5 rounded-full blur-[120px]" />

      <div className="relative max-w-7xl mx-auto px-6 md:px-10 lg:px-16">
        {/* Section header */}
        <div
          className={cn("mb-16 md:mb-24 opacity-0", visible && "animate-fade-up")}
          style={{
            animationDelay:    "0.1s",
            animationFillMode: "both",
            ...(visible ? { willChange: "transform, opacity" } : {}),
          }}
          onAnimationEnd={onDone}
        >
          <span className="text-primary text-xs uppercase tracking-[0.3em] font-semibold mb-4 block">
            Capabilities
          </span>
          <h2
            className="text-foreground font-bold uppercase tracking-tight leading-[1.05]"
            style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)" }}
          >
            What RAKSHAK
            <br />
            <span className="text-primary">Deploys.</span>
          </h2>
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-border">
          {SERVICES.map((svc, i) => (
            <div
              key={svc.index}
              className={cn(
                "group relative bg-background p-8 md:p-10 lg:p-12 opacity-0",
                "hover:bg-secondary/30 transition-colors duration-500",
                visible && "animate-fade-up"
              )}
              style={{
                animationDelay:    `${0.15 + i * 0.1}s`,
                animationFillMode: "both",
                ...(visible ? { willChange: "transform, opacity" } : {}),
              }}
              onAnimationEnd={onDone}
            >
              {/* Green accent line on hover — width transition uses transform scale for GPU */}
              <div className="absolute top-0 left-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-500" />

              <span className="text-primary/40 text-xs font-mono tracking-widest block mb-6">
                {svc.index}
              </span>
              <h3 className="text-foreground text-xl md:text-2xl font-semibold mb-4 leading-snug">
                {svc.title}
              </h3>
              <p className="text-muted-foreground text-sm md:text-base font-light leading-relaxed mb-6">
                {svc.description}
              </p>
              <div className="flex flex-wrap gap-2">
                {svc.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-primary/70 text-[10px] uppercase tracking-widest border border-primary/20 px-3 py-1 rounded-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
});
