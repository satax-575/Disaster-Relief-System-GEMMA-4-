// ── LocationContext — App-wide geolocation state ──────────────────────────────
// Requests location once on AppLayout mount. Provides coords + country to any child.
import {
  createContext, useContext, useState, useEffect, type ReactNode,
} from "react";
import { reverseGeocodeCountry } from "../lib/emergencyNumbers";

interface LocationState {
  granted:     boolean;           // true = user allowed geolocation
  denied:      boolean;           // true = user denied (or error)
  loading:     boolean;           // requesting now
  lat:         number | null;
  lng:         number | null;
  countryCode: string;            // ISO-3166 alpha-2, "XX" = unknown
}

const DEFAULT: LocationState = {
  granted: false, denied: false, loading: true,
  lat: null, lng: null, countryCode: "XX",
};

const LocationContext = createContext<LocationState>(DEFAULT);
export function useLocation() { return useContext(LocationContext); }

export function LocationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LocationState>(DEFAULT);

  useEffect(() => {
    if (!navigator.geolocation) {
      setState({ ...DEFAULT, loading: false, denied: true });
      return;
    }

    // Check if previously denied (cached in sessionStorage)
    const cached = sessionStorage.getItem("rakshak_geo");
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as Partial<LocationState>;
        setState({ ...DEFAULT, loading: false, ...parsed });
        return;
      } catch { /* ignore */ }
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const countryCode = await reverseGeocodeCountry(lat, lng);
        const next: LocationState = {
          granted: true, denied: false, loading: false,
          lat, lng, countryCode,
        };
        setState(next);
        // Cache for this browser session so we don't re-ask
        sessionStorage.setItem("rakshak_geo", JSON.stringify(next));
      },
      (_err) => {
        const next: LocationState = { ...DEFAULT, loading: false, denied: true };
        setState(next);
        sessionStorage.setItem("rakshak_geo", JSON.stringify(next));
      },
      { timeout: 10_000, maximumAge: 300_000, enableHighAccuracy: false },
    );
  }, []);

  return (
    <LocationContext.Provider value={state}>
      {children}
    </LocationContext.Provider>
  );
}
