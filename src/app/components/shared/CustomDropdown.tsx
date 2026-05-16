// ── CustomDropdown — Dark-themed div-based dropdown (Fix: Dropdown Theme) ──────
// Replaces native <select> on AssessPage to work cross-browser in dark mode.
import { useState, useRef, useEffect } from "react";

interface CustomDropdownProps {
  options: string[];
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  id?: string;
}

export function CustomDropdown({ options, value, onChange, placeholder, id }: CustomDropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const displayValue = value && value !== placeholder ? value : null;

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%" }} id={id}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          width: "100%",
          padding: "10px 14px",
          background: "rgba(255,255,255,0.04)",
          color: displayValue ? "#e5e5e5" : "#6b7280",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "8px",
          textAlign: "left",
          cursor: "pointer",
          fontSize: "14px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          transition: "border-color 0.15s",
        }}
        onFocus={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(34,197,94,0.4)"; }}
        onBlur={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.08)"; }}
      >
        <span>{displayValue ?? placeholder}</span>
        <span style={{ opacity: 0.45, fontSize: "11px", marginLeft: "8px" }}>{open ? "▲" : "▼"}</span>
      </button>

      {/* Dropdown list */}
      {open && (
        <ul
          role="listbox"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            background: "#1a1a1a",
            border: "1px solid #2d2d2d",
            borderRadius: "8px",
            listStyle: "none",
            margin: 0,
            padding: "4px 0",
            zIndex: 1000,
            boxShadow: "0 8px 32px rgba(0,0,0,0.7)",
            maxHeight: "240px",
            overflowY: "auto",
          }}
        >
          {options.map((opt) => {
            const isPlaceholder = opt === placeholder;
            const isSelected = opt === value;
            return (
              <li
                key={opt}
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  if (!isPlaceholder) {
                    onChange(opt);
                    setOpen(false);
                  }
                }}
                style={{
                  padding: "9px 14px",
                  color: isPlaceholder ? "#6b7280" : "#e5e5e5",
                  cursor: isPlaceholder ? "default" : "pointer",
                  fontSize: "14px",
                  background: isSelected ? "#2a2a2a" : "transparent",
                  transition: "background 0.12s",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
                onMouseEnter={(e) => {
                  if (!isPlaceholder) e.currentTarget.style.background = "#2a2a2a";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = isSelected ? "#2a2a2a" : "transparent";
                }}
              >
                {isSelected && !isPlaceholder && (
                  <span style={{ color: "#22c55e", fontSize: "12px", flexShrink: 0 }}>✓</span>
                )}
                <span>{opt}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ── Predefined option sets ────────────────────────────────────────────────────

export const DISASTER_TYPES = [
  "Earthquake",
  "Flood",
  "Fire / Wildfire",
  "Cyclone / Hurricane",
  "Landslide",
  "Building Collapse",
  "Tsunami",
  "Industrial Accident",
  "Chemical / Gas Leak",
  "Bridge Failure",
  "Dam Break",
  "Drought / Heatwave",
  "Avalanche",
  "Volcanic Eruption",
  "Explosion / Blast",
];

export const BUILDING_TYPES = [
  "Residential",
  "Commercial",
  "Industrial",
  "Hospital / Medical",
  "School / University",
  "Bridge / Infrastructure",
  "Factory / Warehouse",
  "Government / Public",
  "High-Rise / Skyscraper",
];
