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

  // Track whether this is the FIRST auth state notification (page load hydration)
  // or a subsequent one triggered by signing in.
  const isInitialCheckRef = useRef(true);
  // Track if the user explicitly clicked "Sign in with Google"
  const signingInRef = useRef(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      // React Error #300 guard: defer state updates out of the render cycle.
      // onAuthStateChanged can fire synchronously in some Firebase SDK versions
      // (e.g., when the token is already in cache). Deferring with queueMicrotask
      // ensures we are not updating state while another component is rendering.
      const isInitial = isInitialCheckRef.current;
      const wasSigningIn = signingInRef.current;
      isInitialCheckRef.current = false;

      queueMicrotask(() => {
        setUser(firebaseUser);
        setLoading(false);

        // Only navigate to dashboard when the user explicitly signed in
        // (not on the initial page-load hydration). This prevents a navigation
        // conflict when AuthPage is rendering and onAuthStateChanged fires for
        // a persisted session.
        if (!isInitial && firebaseUser && wasSigningIn) {
          signingInRef.current = false;
          navigate("/app/dashboard", { replace: true });
        }
        if (!isInitial && !firebaseUser) {
          signingInRef.current = false;
        }
      });
    });
    return unsubscribe;
  // navigate is stable from React Router; intentionally omitted from deps.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signInWithGoogle = async () => {
    try {
      // Keep loading=true while the popup + onAuthStateChanged flow completes.
      // ProtectedRoute checks `loading` before redirecting — keeping it true
      // prevents a flash-of-unauthenticated-redirect.
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

      // Navigation is handled by the onAuthStateChanged callback above.
      // That fires AFTER React has finished rendering, so state is settled.
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
