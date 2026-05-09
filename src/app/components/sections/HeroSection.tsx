import { memo, useRef } from "react";
import { useNavigate } from "react-router";

// ── Static CSS hero background — zero JS, zero CDN, GPU-composited ──────────
// Replaces the Spline 3D scene (2GB WebGL asset) with a matching color-scheme
// radial gradient that runs on the GPU compositor thread, not the main thread.
function HeroBg() {
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* Base dark background */}
      <div className="absolute inset-0" style={{ background: "hsl(0 0% 8%)" }} />

      {/* Primary neon-green glow — bottom-left focal point */}
      <div
        className="absolute"
        style={{
          bottom: "-10%",
          left:   "-5%",
          width:  "70vw",
          height: "70vw",
          maxWidth:  "900px",
          maxHeight: "900px",
          borderRadius: "50%",
          background: "radial-gradient(circle, hsl(119 99% 46% / 0.18) 0%, hsl(119 99% 46% / 0.06) 45%, transparent 70%)",
          filter: "blur(40px)",
          transform: "translateZ(0)",
          willChange: "auto",
        }}
      />

      {/* Secondary accent — top-right counter-balance */}
      <div
        className="absolute"
        style={{
          top:   "-15%",
          right: "5%",
          width:  "45vw",
          height: "45vw",
          maxWidth:  "600px",
          maxHeight: "600px",
          borderRadius: "50%",
          background: "radial-gradient(circle, hsl(119 99% 46% / 0.08) 0%, transparent 65%)",
          filter: "blur(60px)",
          transform: "translateZ(0)",
          willChange: "auto",
        }}
      />

      {/* Subtle grid overlay — gives depth without any animation cost */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(hsl(119 99% 46% / 0.03) 1px, transparent 1px),
            linear-gradient(90deg, hsl(119 99% 46% / 0.03) 1px, transparent 1px)
          `,
          backgroundSize: "80px 80px",
          maskImage: "radial-gradient(ellipse 80% 60% at 20% 80%, transparent 30%, black 100%)",
        }}
      />

      {/* Bottom vignette — fades hero into next section */}
      <div
        className="absolute bottom-0 left-0 right-0 h-48"
        style={{
          background: "linear-gradient(to bottom, transparent, hsl(0 0% 8%))",
        }}
      />
    </div>
  );
}

// ── Animated content element — pure CSS, no JS animation library ────────────
interface AnimatedProps {
  delay: string;
  className?: string;
  style?: React.CSSProperties;
  as?: keyof React.JSX.IntrinsicElements;
  children: React.ReactNode;
}

function FadeUp({ delay, className = "", style, as: Tag = "div", children }: AnimatedProps) {
  const elRef = useRef<HTMLElement>(null);
  const handleAnimationEnd = () => {
    if (elRef.current) elRef.current.style.willChange = "auto";
  };
  return (
    // @ts-expect-error polymorphic ref
    <Tag
      ref={elRef}
      className={`opacity-0 animate-fade-up ${className}`}
      style={{ animationDelay: delay, animationFillMode: "both", willChange: "transform, opacity", ...style }}
      onAnimationEnd={handleAnimationEnd}
    >
      {children}
    </Tag>
  );
}

// ── Hero CTA Buttons ─────────────────────────────────────────────────────────
function HeroCTAs() {
  const navigate = useNavigate();
  return (
    <FadeUp delay="0.6s" className="flex flex-wrap gap-3 font-bold">
      <button
        className="pointer-events-auto bg-primary text-primary-foreground px-6 py-3 md:px-8 md:py-4 text-sm rounded-sm cursor-pointer hover:brightness-110 transition-all active:scale-[0.97] font-bold uppercase tracking-wide"
        onClick={() => navigate("/auth")}
      >
        Login to Report Incident
      </button>
      <button
        className="pointer-events-auto border border-foreground/20 text-foreground px-6 py-3 md:px-8 md:py-4 text-sm rounded-sm cursor-pointer hover:border-primary/60 hover:text-primary transition-all active:scale-[0.97] font-bold uppercase tracking-wide"
        onClick={() => document.querySelector("#projects")?.scrollIntoView({ behavior: "smooth" })}
      >
        Explore System
      </button>
    </FadeUp>
  );
}

// ── Hero Section ─────────────────────────────────────────────────────────────
export const HeroSection = memo(function HeroSection() {
  return (
    <section
      id="home"
      className="relative min-h-screen flex items-end bg-hero-bg overflow-hidden"
      style={{ isolation: "isolate" }}
    >
      <HeroBg />

      {/* ── Content ─────────────────────────────────────────────────── */}
      <div className="relative z-10 pointer-events-none w-full max-w-[90%] sm:max-w-md lg:max-w-2xl px-6 md:px-10 pb-14 md:pb-20 pt-32">

        {/* Badge */}
        <FadeUp delay="0.05s" className="mb-6">
          <span
            className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] font-semibold px-3 py-1.5 rounded-sm border"
            style={{
              color:            "hsl(119 99% 46%)",
              borderColor:      "hsl(119 99% 46% / 0.3)",
              background:       "hsl(119 99% 46% / 0.06)",
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse inline-block" />
            Gemma 4 · Live System
          </span>
        </FadeUp>

        {/* 1. Heading */}
        <FadeUp
          as="h1"
          delay="0.15s"
          className="text-foreground mb-3 md:mb-5 uppercase font-bold leading-[1.05] tracking-[-0.05em]"
          style={{ fontSize: "clamp(3rem, 8vw, 6rem)" }}
        >
          RAKSHAK<span className="text-primary">AI</span>
        </FadeUp>

        {/* 2. Subheading */}
        <FadeUp
          as="p"
          delay="0.3s"
          className="text-foreground/70 font-light mb-3 md:mb-5"
          style={{ fontSize: "clamp(1.125rem, 2.5vw, 1.75rem)" }}
        >
          We implement emergency response correctly.
        </FadeUp>

        {/* 3. Description */}
        <FadeUp
          as="p"
          delay="0.42s"
          className="text-muted-foreground font-light mb-6 md:mb-10 max-w-lg"
          style={{ fontSize: "clamp(0.875rem, 1.5vw, 1.125rem)", lineHeight: "1.7" }}
        >
          Disaster intelligence deployed in minutes. Gemma 4–powered threat
          assessment with zero-trust multi-provider architecture. Smart
          incident coordination across your entire operation.
        </FadeUp>

        {/* 4. CTA Buttons */}
        <HeroCTAs />

        {/* 5. Trust line */}
        <FadeUp
          as="p"
          delay="0.75s"
          className="text-muted-foreground/40 text-xs font-light mt-6 md:mt-8"
        >
          Trusted emergency intelligence · India Operations · Gemma 4 powered
        </FadeUp>
      </div>
    </section>
  );
});
