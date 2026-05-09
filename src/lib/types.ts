// ── Firestore Document Types ────────────────────────────────────────────────
// All collection types are strict. `any` is only used for raw Firestore data.

import type { Timestamp } from "firebase/firestore";

export interface Incident {
  id:                string;
  title:             string;
  type:              string;
  severity:          "Critical" | "High" | "Moderate" | "Low";
  description:       string;
  lat:               number;
  lng:               number;
  estimatedAffected: number;
  reportedBy:        string; // uid
  status:            "active" | "resolved";
  createdAt:         Timestamp;
}

export interface TriageEntry {
  id:                    string;
  symptoms:              string[];
  age:                   string;
  gender:                string;
  category:              "Immediate" | "Delayed" | "Minimal" | "Expectant";
  color:                 "Red" | "Yellow" | "Green" | "Black";
  priorityScore:         number;
  immediateActions:      string[];
  treatmentNotes:        string;
  estimatedTimeToTreat:  string;
  assessedBy:            string; // uid
  timestamp:             Timestamp;
}

export interface Responder {
  id:              string;
  name:            string;
  unit:            string;
  role:            "Medical" | "Firefighter" | "Rescue" | "Police" | "Logistics";
  status:          "available" | "dispatched" | "on_scene";
  equipment:       string[];
  specializations: string[];
  lat:             number;
  lng:             number;
  gpsOnline:       boolean;
  contactNumber:   string;
  createdAt:       Timestamp;
}

export interface Alert {
  id:           string;
  message:      string;
  severity:     "Critical" | "High" | "Moderate" | "Low";
  affectedArea: string;
  broadcastBy:  string; // uid
  status:       "active" | "resolved";
  createdAt:    Timestamp;
}

export interface AppUser {
  name:      string;
  email:     string;
  photoURL:  string;
  role:      "responder" | "admin";
  lastLogin: Timestamp;
  createdAt?: Timestamp;
}

// ── AI Response Types ───────────────────────────────────────────────────────

export interface DamageAssessmentResult {
  damageSeverity:          "Critical" | "High" | "Moderate" | "Low";
  structuralAssessment:    string;
  identifiedHazards:       string[];
  estimatedTrappedPersons: number;
  recommendedActions:      string[];
  confidenceScore:         number;
}

export interface TriageAssessmentResult {
  triageCategory:       "Immediate" | "Delayed" | "Minimal" | "Expectant";
  color:                "Red" | "Yellow" | "Green" | "Black";
  priorityScore:        number;
  immediateActions:     string[];
  treatmentNotes:       string;
  estimatedTimeToTreat: string;
}

export interface ChatMessage {
  id:         string;
  role:       "user" | "assistant";
  content:    string;
  imageUrl?:  string; // base64 data URL if image attached
  timestamp:  Date;
}
