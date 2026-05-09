import {
  createContext,
  useContext,
  useEffect,
  useState,
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

  // Listen to Firebase auth state — single source of truth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe; // cleanup on unmount
  }, []);

  const signInWithGoogle = async () => {
    try {
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

      navigate("/app/dashboard");
    } catch (err) {
      console.error("[RAKSHAK] Google sign-in failed:", err);
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
