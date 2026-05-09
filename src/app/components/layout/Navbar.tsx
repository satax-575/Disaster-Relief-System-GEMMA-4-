"use client";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { Button } from "../ui/button";
import { cn } from "../ui/utils";

const NAV_LINKS = [
  { label: "Services",  href: "#services"  },
  { label: "About Us",  href: "#about"     },
  { label: "Projects",  href: "#projects"  },
  { label: "Team",      href: "#team"      },
  { label: "Contacts",  href: "#contact"   },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  /* Lock body scroll when drawer is open */
  useEffect(() => {
    document.documentElement.classList.toggle("overflow-hidden", open);
    return () => { document.documentElement.classList.remove("overflow-hidden"); };
  }, [open]);

  /* Close on Escape */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", handler, { passive: true });
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const navigate = useNavigate();

  const handleNavClick = (href: string) => {
    setOpen(false);
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      {/* ── Main Navbar ─────────────────────────────────────────────── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 lg:px-16 py-5"
        style={{ isolation: "isolate" }}
      >
        {/* Logo */}
        <a
          href="#"
          className="text-foreground text-xl font-semibold tracking-tight select-none"
          onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}
        >
          RAKSHAK
        </a>

        {/* Desktop nav links */}
        <ul className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                onClick={(e) => { e.preventDefault(); handleNavClick(link.href); }}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors uppercase tracking-widest"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        {/* Desktop CTA */}
        <Button
          variant="navCta"
          size="lg"
          className="hidden md:inline-flex px-6"
          onClick={() => navigate("/auth")}
        >
          Login
        </Button>

        {/* Mobile hamburger */}
        <button
          className="md:hidden relative z-50 flex flex-col items-center justify-center w-10 h-10 text-foreground hover:text-primary transition-colors"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          <span
            className={cn(
              "block w-6 h-0.5 bg-current transition-all duration-300 origin-center",
              open ? "rotate-45 translate-y-[0.3rem]" : ""
            )}
          />
          <span
            className={cn(
              "block w-6 h-0.5 bg-current transition-all duration-300 mt-1.5",
              open ? "opacity-0 scale-x-0" : ""
            )}
          />
          <span
            className={cn(
              "block w-6 h-0.5 bg-current transition-all duration-300 origin-center mt-1.5",
              open ? "-rotate-45 -translate-y-[0.8rem]" : ""
            )}
          />
        </button>
      </nav>

      {/* ── Mobile Drawer ───────────────────────────────────────────── */}
      {/* bg-hero-bg/95 solid replaces backdrop-blur-xl — saves ~16ms/frame on mobile */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className={cn(
          "fixed inset-0 z-40 flex flex-col items-center justify-center gap-10 md:hidden",
          "bg-hero-bg/95",   // solid, no backdrop-filter
          "transition-all duration-300",
          open
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        )}
        style={{
          transform:         open ? "translateY(0)" : "translateY(-10px)",
          transition:        "opacity 0.3s ease-out, transform 0.3s ease-out",
          isolation:         "isolate",
          willChange:        open ? "transform, opacity" : "auto",
          backfaceVisibility: "hidden",
        }}
      >
        <ul className="flex flex-col items-center gap-8">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                onClick={(e) => { e.preventDefault(); handleNavClick(link.href); }}
                className="text-2xl font-semibold uppercase tracking-widest text-foreground hover:text-primary transition-colors"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <Button
          variant="navCta"
          size="xl"
          className="w-64 justify-center"
          onClick={() => { setOpen(false); navigate("/auth"); }}
        >
          Login
        </Button>
      </div>
    </>
  );
}
