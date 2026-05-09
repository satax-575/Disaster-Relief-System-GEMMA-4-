export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative bg-hero-bg border-t border-border">
      {/* Top glow */}
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[1px] bg-primary/20" />

      <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-16 py-12 md:py-16">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          {/* Logo + tagline */}
          <div>
            <div className="text-foreground text-xl font-semibold tracking-tight mb-2">
              RAKSHAK
              <span className="text-primary"> AI</span>
            </div>
            <p className="text-muted-foreground text-xs font-light">
              Emergency Response Intelligence. Powered by Gemma 4.
            </p>
          </div>

          {/* Nav links */}
          <nav className="flex flex-wrap gap-x-8 gap-y-3">
            {["Services", "About Us", "Projects", "Team", "Contacts"].map((link) => (
              <a
                key={link}
                href={`#${link.toLowerCase().replace(/\s+/, "")}`}
                className="text-muted-foreground text-xs uppercase tracking-widest hover:text-foreground transition-colors"
                onClick={(e) => {
                  e.preventDefault();
                  const id = link === "About Us" ? "about" : link === "Contacts" ? "contact" : link.toLowerCase();
                  document.querySelector(`#${id}`)?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                {link}
              </a>
            ))}
          </nav>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-muted-foreground/50 text-xs font-light">
            © {year} RAKSHAK AI. Built for the Gemma 4 Hackathon.
          </p>
          <div className="flex items-center gap-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-muted-foreground/50 text-xs font-light">
              Gemma 4 31B — Active
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
