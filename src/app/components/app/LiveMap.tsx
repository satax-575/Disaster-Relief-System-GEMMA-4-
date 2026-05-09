// ── LiveMap — Leaflet component, lazy-loaded so it's not in the main bundle ──
// Import: `const LiveMap = lazy(() => import("../components/app/LiveMap"))`
// 
// KEY FIX: Uses a `mounted` guard so MapContainer only renders after the
// component has been committed to the DOM. This prevents React error #300
// which occurs when Leaflet's imperative DOM management conflicts with React's
// reconciler during auth-state transitions (e.g. post-OAuth redirect).

import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import type { Map as LeafletMap } from "leaflet";
import type { Incident } from "../../lib/types";
import "leaflet/dist/leaflet.css";

// ── Fix Leaflet default icon paths (ESM-safe, no require()) ─────────────────
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// Run once at module level — not inside a component effect
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl:       markerIcon,
  shadowUrl:     markerShadow,
});

const severityColor: Record<string, string> = {
  Critical: "#f87171",
  High:     "#fb923c",
  Moderate: "#60a5fa",
  Low:      "#4ade80",
};

interface LiveMapProps {
  incidents: Incident[];
}

export default function LiveMap({ incidents }: LiveMapProps) {
  const mapRef = useRef<LeafletMap | null>(null);
  // Mount guard: defer MapContainer render until after commit.
  // Prevents React Error #300 (Leaflet DOM ↔ React reconciler conflict)
  // that fires during auth-state transitions right after OAuth redirect.
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Invalidate map size when container is resized (e.g. sidebar toggle)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const ro = new ResizeObserver(() => map.invalidateSize());
    const container = map.getContainer();
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="relative h-full rounded-lg overflow-hidden">
      {!mounted ? (
        /* Pre-mount placeholder — shows while React commits the component */
        <div className="h-full bg-white/[0.02] rounded-lg flex items-center justify-center text-muted-foreground/30 text-sm gap-3">
          <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          Loading map…
        </div>
      ) : (
        <MapContainer
          ref={mapRef}
          center={[20.5937, 78.9629]}
          zoom={5}
          style={{ height: "100%", width: "100%", background: "hsl(0 0% 8%)" }}
          zoomControl={true}
          attributionControl={true}
        >
          <TileLayer
            url="https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
          />
          {incidents.map((inc) => (
            <CircleMarker
              key={inc.id}
              center={[inc.lat ?? 20.5937, inc.lng ?? 78.9629]}
              radius={8}
              fillColor={severityColor[inc.severity] ?? "#4ade80"}
              color={severityColor[inc.severity] ?? "#4ade80"}
              weight={1.5}
              opacity={0.9}
              fillOpacity={0.4}
            >
              <Popup>
                <div style={{ fontFamily: "Sora, sans-serif", fontSize: 12 }}>
                  <strong>{inc.title}</strong>
                  <br />{inc.severity} · {inc.type}
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      )}

      {/* Legend — only show when map is mounted */}
      {mounted && (
        <div
          className="absolute top-3 right-3 z-[1000] bg-hero-bg/90 border border-white/10 rounded-lg px-3 py-2 text-[11px] flex flex-col gap-1"
          style={{ pointerEvents: "none" }}
        >
          {Object.entries(severityColor).map(([k, c]) => (
            <div key={k} className="flex items-center gap-2">
              <span style={{ color: c }}>●</span>
              <span className="text-muted-foreground/70">{k}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
