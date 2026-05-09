import { lazy, Suspense, memo } from "react";
import { Navbar }      from "../components/layout/Navbar";
import { Footer }      from "../components/layout/Footer";
import { HeroSection } from "../components/sections/HeroSection";

// ── Lazy-load all below-fold sections ────────────────────────────────────────
const ServicesSection  = lazy(() => import("../components/sections/ServicesSection").then(m => ({ default: m.ServicesSection })));
const AboutSection     = lazy(() => import("../components/sections/AboutSection").then(m => ({ default: m.AboutSection })));
const ProjectsSection  = lazy(() => import("../components/sections/ProjectsSection").then(m => ({ default: m.ProjectsSection })));
const TeamSection      = lazy(() => import("../components/sections/TeamSection").then(m => ({ default: m.TeamSection })));
const ContactSection   = lazy(() => import("../components/sections/ContactSection").then(m => ({ default: m.ContactSection })));

const SectionSkeleton = memo(function SectionSkeleton() {
  return (
    <div
      className="w-full py-24 md:py-36 bg-background"
      aria-hidden="true"
      style={{ minHeight: "30vh" }}
    />
  );
});

export function LandingPage() {
  return (
    <div className="bg-hero-bg min-h-screen">
      <Navbar />
      <HeroSection />
      <Suspense fallback={<SectionSkeleton />}><ServicesSection /></Suspense>
      <Suspense fallback={<SectionSkeleton />}><AboutSection /></Suspense>
      <Suspense fallback={<SectionSkeleton />}><ProjectsSection /></Suspense>
      <Suspense fallback={<SectionSkeleton />}><TeamSection /></Suspense>
      <Suspense fallback={<SectionSkeleton />}><ContactSection /></Suspense>
      <Footer />
    </div>
  );
}
