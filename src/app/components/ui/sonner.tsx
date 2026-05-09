import { Toaster as Sonner, type ToasterProps } from "sonner";

// ── Fixed sonner wrapper — removed next-themes dependency ───────────────────
// Always dark mode to match RAKSHAK AI design system.
// bg-white/5 border border-white/10 text-foreground, bottom-right.
const Toaster = ({ ...props }: ToasterProps) => (
  <Sonner
    theme="dark"
    className="toaster group"
    toastOptions={{
      style: {
        background:  "rgba(255,255,255,0.05)",
        border:      "1px solid rgba(255,255,255,0.10)",
        color:       "hsl(0 0% 96%)",
        fontFamily:  "'Sora', sans-serif",
        fontSize:    "13px",
      },
    }}
    {...props}
  />
);

export { Toaster };
