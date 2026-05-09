import { type ReactNode, useEffect, useRef } from "react";
import { cn } from "../ui/utils";

interface ModalProps {
  open:      boolean;
  onClose:   () => void;
  title:     string;
  subtitle?: string;
  children:  ReactNode;
  className?: string;
}

export function Modal({ open, onClose, title, subtitle, children, className }: ModalProps) {
  const panelRef  = useRef<HTMLDivElement>(null);
  const firstFocusRef = useRef<HTMLButtonElement>(null);

  // Escape key closes modal
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Body scroll lock
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Focus the close button when modal opens (accessibility)
  useEffect(() => {
    if (open) {
      // Small delay to let animation start
      const id = setTimeout(() => firstFocusRef.current?.focus(), 50);
      return () => clearTimeout(id);
    }
  }, [open]);

  if (!open) return null;

  return (
    // Overlay
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center px-4"
      style={{
        background:  "rgba(0,0,0,0.70)",
        backdropFilter: "blur(4px)",
        animation:   "fade-in 0.15s ease-out both",
        willChange:  "opacity",
        isolation:   "isolate",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Panel */}
      <div
        ref={panelRef}
        className={cn(
          "border rounded-2xl p-8 max-w-md w-full relative",
          className,
        )}
        style={{
          background:   "hsl(0 0% 9%)",
          borderColor:  "rgba(255,255,255,0.09)",
          animation:    "fade-up 0.2s cubic-bezier(0.16, 1, 0.3, 1) both",
          willChange:   "transform, opacity",
          maxHeight:    "90dvh",
          overflowY:    "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          ref={firstFocusRef}
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors text-lg leading-none w-8 h-8 flex items-center justify-center rounded-md hover:bg-white/[0.06]"
          aria-label="Close dialog"
        >
          ✕
        </button>

        <h2 id="modal-title" className="text-foreground text-lg font-semibold mb-1 pr-8">{title}</h2>
        {subtitle && <p className="text-muted-foreground text-sm mb-6">{subtitle}</p>}

        {children}
      </div>
    </div>
  );
}
