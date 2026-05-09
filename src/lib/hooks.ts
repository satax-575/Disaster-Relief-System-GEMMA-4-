import { useEffect, useRef, useState, useCallback } from "react";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  limit,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  writeBatch,
  getDocs,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Incident, Responder, Alert, TriageEntry } from "./types";

// ── Shared Listener Cache — prevents duplicate onSnapshot subscriptions ────────
// When multiple components call the same hook (e.g. useIncidents),
// they share a single Firestore listener instead of creating N separate ones.

interface CacheEntry<T> {
  data:   T[];
  subs:   Set<(d: T[]) => void>; // subscriber callbacks
  unsub:  () => void;             // Firestore unsubscribe fn
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const listenerCache = new Map<string, CacheEntry<any>>();

function useLiveCollection<T>(
  cacheKey: string,
  buildQuery: () => ReturnType<typeof query>,
  transform: (data: Record<string, unknown>, id: string) => T,
) {
  const [data, setData]       = useState<T[]>(() => listenerCache.get(cacheKey)?.data ?? []);
  const [loading, setLoading] = useState(!listenerCache.has(cacheKey));

  useEffect(() => {
    // If cache already has an active listener, attach to it
    let entry = listenerCache.get(cacheKey) as CacheEntry<T> | undefined;

    if (!entry) {
      // First subscriber — create the Firestore listener
      const q = buildQuery();
      const initialSubs = new Set<(d: T[]) => void>();

      const unsub = onSnapshot(q, (snap) => {
        const result = snap.docs.map((d) => transform(d.data() as Record<string, unknown>, d.id));
        const cached = listenerCache.get(cacheKey) as CacheEntry<T> | undefined;
        if (cached) {
          cached.data = result;
          cached.subs.forEach((cb) => cb(result));
        }
      }, (err) => {
        console.error(`[RAKSHAK] Firestore error on ${cacheKey}:`, err);
      });

      entry = { data: [], subs: initialSubs, unsub };
      listenerCache.set(cacheKey, entry);
    }

    // Register this component as a subscriber
    const cb = (d: T[]) => {
      setData(d);
      setLoading(false);
    };
    entry.subs.add(cb);

    // If we already have data (another component fetched it), use it immediately
    if (entry.data.length > 0) {
      setData(entry.data);
      setLoading(false);
    }

    return () => {
      const cached = listenerCache.get(cacheKey) as CacheEntry<T> | undefined;
      if (!cached) return;
      cached.subs.delete(cb);
      // Only unsub from Firestore when all subscribers leave
      if (cached.subs.size === 0) {
        cached.unsub();
        listenerCache.delete(cacheKey);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey]);

  return { data, loading };
}

// ── Incidents ─────────────────────────────────────────────────────────────────
export function useIncidents() {
  return useLiveCollection<Incident>(
    "incidents:all",
    () => query(collection(db, "incidents"), orderBy("createdAt", "desc")),
    (d, id) => ({ ...d, id } as Incident),
  );
}

export function useRecentIncidents(n = 5) {
  return useLiveCollection<Incident>(
    `incidents:recent:${n}`,
    () => query(collection(db, "incidents"), orderBy("createdAt", "desc"), limit(n)),
    (d, id) => ({ ...d, id } as Incident),
  );
}

// ── Responders ────────────────────────────────────────────────────────────────

// Module-level seeding promise — prevents race-condition duplicates
let seedingPromise: Promise<void> | null = null;

const SEED_RESPONDERS = [
  {
    name: "Dr. Priya Sharma", unit: "Medical Unit 1", role: "Medical",
    status: "available",
    equipment: ["defibrillator", "trauma_kit", "oxygen"],
    specializations: ["emergency medicine", "triage", "trauma"],
    contactNumber: "+91-9876543211", lat: 28.6139, lng: 77.2090,
    gpsOnline: true,
  },
  {
    name: "Fire Brigade Unit 3", unit: "Fire Unit 3", role: "Firefighter",
    status: "available",
    equipment: ["fire_truck", "hazmat_suit", "thermal_scanner"],
    specializations: ["fire suppression", "hazmat", "rescue"],
    contactNumber: "+91-9876543212", lat: 19.0760, lng: 72.8777,
    gpsOnline: true,
  },
  {
    name: "Rescue Team Alpha", unit: "Rescue Unit 2", role: "Rescue",
    status: "dispatched",
    equipment: ["rope_kit", "cutting_tools", "stretcher"],
    specializations: ["urban search", "rubble extraction"],
    contactNumber: "+91-9876543213", lat: 13.0827, lng: 80.2707,
    gpsOnline: false,
  },
  {
    name: "Field Medic Arjun", unit: "Medical Unit 2", role: "Medical",
    status: "available",
    equipment: ["first_aid_kit", "morphine", "splints"],
    specializations: ["triage", "wound care", "trauma"],
    contactNumber: "+91-9876543214", lat: 22.5726, lng: 88.3639,
    gpsOnline: true,
  },
];

function ensureRespondersSeed() {
  if (seedingPromise) return seedingPromise;
  seedingPromise = getDocs(collection(db, "responders")).then((snap) => {
    if (!snap.empty) return;
    const batch = writeBatch(db);
    SEED_RESPONDERS.forEach((r) => {
      const ref = doc(collection(db, "responders"));
      batch.set(ref, { ...r, createdAt: serverTimestamp() });
    });
    return batch.commit();
  }).catch(console.error).finally(() => {
    // Reset after completion so it can re-run if Firestore was empty due to timing
    seedingPromise = null;
  }) as Promise<void>;
  return seedingPromise;
}

export function useResponders() {
  useEffect(() => { ensureRespondersSeed(); }, []);

  return useLiveCollection<Responder>(
    "responders:all",
    () => query(collection(db, "responders")),
    (d, id) => ({ ...d, id } as Responder),
  );
}

// ── Alerts ────────────────────────────────────────────────────────────────────
export function useAlerts() {
  return useLiveCollection<Alert>(
    "alerts:all",
    () => query(collection(db, "alerts"), orderBy("createdAt", "desc")),
    (d, id) => ({ ...d, id } as Alert),
  );
}

// Alias — active-only filter is done client-side (avoids Firestore composite index)
export function useActiveAlerts() {
  return useAlerts();
}

// ── Triage Log — real-time via onSnapshot ────────────────────────────────────
export function useTriageLog() {
  const [entries, setEntries] = useState<TriageEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Expose a stable reload function for manual refresh after writes
  const reload = useCallback(() => {
    setLoading(true);
  }, []);

  useEffect(() => {
    const q = query(collection(db, "triage"), orderBy("timestamp", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setEntries(snap.docs.map((d) => ({ ...d.data(), id: d.id } as TriageEntry)));
      setLoading(false);
    }, (err) => {
      console.error("[RAKSHAK] Triage snapshot error:", err);
      setLoading(false);
    });
    return unsub;
  }, []);

  return { entries, loading, reload };
}

// ── Dashboard stats — derived from shared listeners, no extra subscriptions ──
export function useDashboardStats() {
  const { data: incidents }  = useIncidents();
  const { data: responders } = useResponders();
  const { data: alerts }     = useAlerts();
  const { entries }          = useTriageLog();

  return {
    activeIncidents:     incidents.filter((i) => i.status === "active").length,
    availableResponders: responders.filter((r) => r.status === "available").length,
    triageCount:         entries.length,
    activeAlerts:        alerts.filter((a) => a.status === "active").length,
  };
}

// ── Write helpers ─────────────────────────────────────────────────────────────
export async function addIncident(data: Omit<Incident, "id" | "createdAt">) {
  return addDoc(collection(db, "incidents"), { ...data, createdAt: serverTimestamp() });
}

export async function addAlert(data: Omit<Alert, "id" | "createdAt">) {
  return addDoc(collection(db, "alerts"), { ...data, createdAt: serverTimestamp() });
}

export async function resolveAlert(id: string) {
  return updateDoc(doc(db, "alerts", id), { status: "resolved" });
}

export async function addTriageEntry(data: Omit<TriageEntry, "id" | "timestamp">) {
  return addDoc(collection(db, "triage"), { ...data, timestamp: serverTimestamp() });
}

export async function addResponder(data: Omit<Responder, "id" | "createdAt">) {
  return addDoc(collection(db, "responders"), { ...data, createdAt: serverTimestamp() });
}

// ── Time ago helper ───────────────────────────────────────────────────────────
export function timeAgo(ts: { seconds: number } | null | undefined): string {
  if (!ts) return "—";
  const diff = Math.floor(Date.now() / 1000 - ts.seconds);
  if (diff < 60)    return `${diff}s ago`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
