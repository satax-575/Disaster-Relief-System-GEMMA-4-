// ── LiveMap — Leaflet component, lazy-loaded so it's not in the main bundle ──
// v3: Added userLocation prop — re-centers map to user's coordinates when granted.
import { useEffect, useRef } from "react";
import type { Incident } from "../../lib/types";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// ── Fix Leaflet default icon paths (ESM-safe, no require()) ─────────────────
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon   from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

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
  userLat?: number | null;
  userLng?: number | null;
}

// ── Pure imperative Leaflet (no react-leaflet) — avoids React #300 completely
export default function LiveMap({ incidents, userLat, userLng }: LiveMapProps) {
  const containerRef   = useRef<HTMLDivElement>(null);
  const mapRef         = useRef<L.Map | null>(null);
  const markersRef     = useRef<L.CircleMarker[]>([]);
  const userMarkerRef  = useRef<L.CircleMarker | null>(null);

  // ── Initialize map once on mount ─────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el || mapRef.current) return;

    const map = L.map(el, {
      center: [20.5937, 78.9629],
      zoom:   5,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer(
      "https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png",
      {
        attribution:
          '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="https://openstreetmap.org">OpenStreetMap</a>',
        maxZoom: 18,
      },
    ).addTo(map);

    mapRef.current = map;

    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(el);

    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ── Re-center to user location when granted ───────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !userLat || !userLng) return;

    map.setView([userLat, userLng], 10, { animate: true });

    // Remove old user marker
    userMarkerRef.current?.remove();

    // Add pulsing user location indicator
    const userMarker = L.circleMarker([userLat, userLng], {
      radius:      10,
      fillColor:   "#22c55e",
      color:       "#16a34a",
      weight:      2,
      opacity:     1,
      fillOpacity: 0.7,
    });
    userMarker.bindPopup(
      `<div style="font-family:Sora,sans-serif;font-size:12px">
        <strong>📍 Your Location</strong><br/>
        ${userLat.toFixed(4)}, ${userLng.toFixed(4)}
      </div>`,
    );
    userMarker.addTo(map);
    userMarkerRef.current = userMarker;
  }, [userLat, userLng]);

  // ── Sync incident markers when data changes ───────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    incidents.forEach((inc) => {
      const lat = inc.lat ?? 20.5937;
      const lng = inc.lng ?? 78.9629;
      const color = severityColor[inc.severity] ?? "#4ade80";

      const marker = L.circleMarker([lat, lng], {
        radius:      8,
        fillColor:   color,
        color:       color,
        weight:      1.5,
        opacity:     0.9,
        fillOpacity: 0.4,
      });

      marker.bindPopup(`
        <div style="font-family:Sora,sans-serif;font-size:12px">
          <strong>${inc.title}</strong><br/>
          ${inc.severity} · ${inc.type}
        </div>
      `);

      marker.addTo(map);
      markersRef.current.push(marker);
    });
  }, [incidents]);

  return (
    <div className="relative h-full rounded-lg overflow-hidden">
      <div
        ref={containerRef}
        style={{ height: "100%", width: "100%", background: "hsl(0 0% 8%)" }}
      />

      {/* Legend */}
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
        <div className="flex items-center gap-2 mt-1 border-t border-white/10 pt-1">
          <span style={{ color: "#22c55e" }}>●</span>
          <span className="text-muted-foreground/70">Your Location</span>
        </div>
      </div>
    </div>
  );
}
