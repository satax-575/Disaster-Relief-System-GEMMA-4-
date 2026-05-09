import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as fbSignOut,
  type User,
} from "firebase/auth";
import {
  doc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { useNavigate } from "react-router";
import { auth, db, googleProvider } from "../lib/firebase";

// ── Context shape ────────────────────────────────────────────────────────────
interface AuthContextValue {
  user:             User | null;
  loading:          boolean;
  signInWithGoogle: () => Promise<void>;
  signOut:          () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Provider ─────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,    setUser]    = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Track whether this is the initial auth check or a new sign-in.
  // On initial page load, onAuthStateChanged fires once to hydrate state.
  // On sign-in, it fires again — that second fire should trigger navigation.
  const isInitialCheckRef = useRef(true);
  // Track if sign-in is in progress so we keep loading=true until
  // onAuthStateChanged confirms the user, preventing ProtectedRoute from
  // seeing user=null,loading=false and redirecting to /auth.
  const signingInRef = useRef(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);

      // On sign-in (not initial load): navigate to dashboard.
      // This runs AFTER Firebase confirms the auth state, so ProtectedRoute
      // will see user != null and render the dashboard correctly.
      if (!isInitialCheckRef.current && firebaseUser && signingInRef.current) {
        signingInRef.current = false;
        navigate("/app/dashboard", { replace: true });
      }
      if (!isInitialCheckRef.current && !firebaseUser) {
        signingInRef.current = false;
      }

      isInitialCheckRef.current = false;
    });
    return unsubscribe; // cleanup on unmount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signInWithGoogle = async () => {
    try {
      // Keep loading=true while the popup + onAuthStateChanged flow completes.
      // This prevents ProtectedRoute from briefly seeing user=null,loading=false
      // and redirecting to /auth before Firebase auth state is settled.
      setLoading(true);
      signingInRef.current = true;

      const result = await signInWithPopup(auth, googleProvider);
      const { uid, displayName, email, photoURL } = result.user;

      // Upsert user doc — merge: true preserves existing fields (e.g. createdAt)
      await setDoc(
        doc(db, "users", uid),
        {
          name:      displayName  ?? "Responder",
          email:     email        ?? "",
          photoURL:  photoURL     ?? "",
          lastLogin: serverTimestamp(),
          role:      "responder",
        },
        { merge: true }
      );

      // Do NOT navigate here — let onAuthStateChanged do it above.
      // That ensures user state is fully settled in React before navigation.
    } catch (err) {
      console.error("[RAKSHAK] Google sign-in failed:", err);
      signingInRef.current = false;
      setLoading(false);
      throw err; // let AuthPage handle display
    }
  };

  const signOut = async () => {
    await fbSignOut(auth);
    navigate("/");
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────────────────────
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
