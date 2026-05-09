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

const PROJECTS = [
  {
    id: "01",
    title: "Disaster Response Command",
    category: "Multi-Agency Coordination",
    description:
      "Real-time incident management hub integrating Gemma 4 triage AI with WebSocket-driven multi-agency dashboards. Deployed for large-scale disaster coordination across multiple districts.",
    tech: ["Gemma 4 31B", "FastAPI", "WebSocket", "SQLite"],
    status: "Live",
  },
  {
    id: "02",
    title: "Medical Triage Intelligence",
    category: "Healthcare Emergency",
    description:
      "Gemma 4–powered patient prioritization engine using embedded Medical RAG. Retrieves treatment protocols in under 2 seconds — works offline at disaster sites with no connectivity.",
    tech: ["Medical RAG", "Gemma 4", "Offline-first", "BLIP Vision"],
    status: "Deployed",
  },
  {
    id: "03",
    title: "Multimodal Surveillance Grid",
    category: "Visual Intelligence",
    description:
      "BLIP image captioning + Groq vision analysis pipeline for threat detection from live field cameras. Processes frames in parallel with automatic severity escalation.",
    tech: ["BLIP", "Groq Vision", "Mistral", "pixtral-large"],
    status: "Active",
  },
];

export const ProjectsSection = memo(function ProjectsSection() {
  const { ref, visible } = useInView();

  return (
    <section
      id="projects"
      ref={ref}
      className="relative bg-background py-24 md:py-36 overflow-hidden"
      style={{ isolation: "isolate" }}
    >
      <div className="pointer-events-none absolute top-1/2 left-0 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[120px] -translate-y-1/2" />

      <div className="relative max-w-7xl mx-auto px-6 md:px-10 lg:px-16">
        {/* Header */}
        <div
          className={cn("mb-16 md:mb-24 opacity-0", visible && "animate-fade-up")}
          style={{ animationDelay: "0.1s", animationFillMode: "both", ...(visible ? { willChange: "transform, opacity" } : {}) }}
          onAnimationEnd={onDone}
        >
          <span className="text-primary text-xs uppercase tracking-[0.3em] font-semibold mb-4 block">Deployments</span>
          <h2
            className="text-foreground font-bold uppercase tracking-tight leading-[1.05]"
            style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)" }}
          >
            Systems<br /><span className="text-primary">In the Field.</span>
          </h2>
        </div>

        {/* Projects list */}
        <div className="space-y-px bg-border">
          {PROJECTS.map((project, i) => (
            <div
              key={project.id}
              className={cn(
                "group relative bg-background p-8 md:p-10 lg:p-12 flex flex-col lg:flex-row lg:items-start gap-8 opacity-0",
                "hover:bg-secondary/20 transition-colors duration-500 cursor-default",
                visible && "animate-fade-up"
              )}
              style={{
                animationDelay:    `${0.15 + i * 0.12}s`,
                animationFillMode: "both",
                ...(visible ? { willChange: "transform, opacity" } : {}),
              }}
              onAnimationEnd={onDone}
            >
              <div className="lg:w-24 flex-shrink-0">
                <span className="text-primary/40 text-xs font-mono tracking-widest block mb-2">{project.id}</span>
                <span className={cn(
                  "inline-block text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-sm border font-semibold",
                  project.status === "Live"
                    ? "text-primary border-primary/30 bg-primary/5"
                    : "text-muted-foreground border-border"
                )}>
                  {project.status}
                </span>
              </div>

              <div className="flex-1">
                <span className="text-muted-foreground text-xs uppercase tracking-widest mb-2 block">{project.category}</span>
                <h3 className="text-foreground text-xl md:text-2xl font-semibold mb-3 leading-snug group-hover:text-primary transition-colors duration-300">
                  {project.title}
                </h3>
                <p className="text-muted-foreground text-sm font-light leading-relaxed mb-5 max-w-xl">
                  {project.description}
                </p>
                <div className="flex flex-wrap gap-2">
                  {project.tech.map((t) => (
                    <span key={t} className="text-muted-foreground/70 text-[10px] uppercase tracking-widest border border-border px-3 py-1 rounded-sm">
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              <div className="hidden lg:flex items-center self-center text-muted-foreground/30 group-hover:text-primary transition-colors duration-300 group-hover:translate-x-1 transform">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
});
