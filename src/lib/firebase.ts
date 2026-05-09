import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// ── Firebase config from Vite env vars ──────────────────────────────────────
// All keys must be set in .env.local (never hardcoded)
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY     as string,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID  as string,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID      as string,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
};

// Prevent double-initialization in HMR
const app = getApps().length === 0
  ? initializeApp(firebaseConfig)
  : getApps()[0];

export const auth = getAuth(app);
export const db   = getFirestore(app);

// Google sign-in with account picker (prompt: select_account)
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

export default app;
