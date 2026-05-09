import { memo, useEffect, useRef, useState } from "react";
import { cn } from "../ui/utils";

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

const TEAM = [
  {
    initials: "SA",
    name: "RAKSHAK Architect",
    role: "AI Systems Lead",
    focus: "Gemma 4 integration, multi-provider cascade architecture",
  },
  {
    initials: "BR",
    name: "Backend Runtime",
    role: "Infrastructure Engineer",
    focus: "FastAPI, WebSocket real-time systems, aiosqlite",
  },
  {
    initials: "VX",
    name: "Vision Expert",
    role: "Multimodal ML Engineer",
    focus: "BLIP vision pipeline, Groq & Mistral vision connectors",
  },
  {
    initials: "UX",
    name: "Interface Designer",
    role: "Frontend Engineer",
    focus: "React, TypeScript, RAKSHAK design system",
  },
];

export const TeamSection = memo(function TeamSection() {
  const { ref, visible } = useInView();

  return (
    <section
      id="team"
      ref={ref}
      className="relative bg-hero-bg py-24 md:py-36 overflow-hidden"
      style={{ isolation: "isolate" }}
    >
      <div className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] bg-primary/5 rounded-full blur-[140px]" />

      <div className="relative max-w-7xl mx-auto px-6 md:px-10 lg:px-16">
        {/* Header */}
        <div
          className={cn("mb-16 md:mb-24 opacity-0", visible && "animate-fade-up")}
          style={{ animationDelay: "0.1s", animationFillMode: "both", ...(visible ? { willChange: "transform, opacity" } : {}) }}
          onAnimationEnd={onDone}
        >
          <span className="text-primary text-xs uppercase tracking-[0.3em] font-semibold mb-4 block">The Team</span>
          <h2
            className="text-foreground font-bold uppercase tracking-tight leading-[1.05]"
            style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)" }}
          >
            Built by<br /><span className="text-primary">Specialists.</span>
          </h2>
        </div>

        {/* Team grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-border">
          {TEAM.map((member, i) => (
            <div
              key={member.name}
              className={cn(
                "group bg-hero-bg p-8 md:p-10 opacity-0",
                "hover:bg-secondary/20 transition-colors duration-500",
                visible && "animate-fade-up"
              )}
              style={{
                animationDelay:    `${0.15 + i * 0.1}s`,
                animationFillMode: "both",
                ...(visible ? { willChange: "transform, opacity" } : {}),
              }}
              onAnimationEnd={onDone}
            >
              <div className="w-14 h-14 rounded-sm bg-secondary border border-border flex items-center justify-center text-primary text-lg font-bold mb-6 group-hover:border-primary/40 transition-colors duration-500">
                {member.initials}
              </div>
              <h3 className="text-foreground text-base font-semibold mb-1">{member.name}</h3>
              <span className="text-primary text-xs uppercase tracking-widest font-medium block mb-4">{member.role}</span>
              <p className="text-muted-foreground text-sm font-light leading-relaxed">{member.focus}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
});
