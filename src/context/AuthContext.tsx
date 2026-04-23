import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import {
  User,
  onAuthStateChanged,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../lib/firebase/config";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  signOut: () => Promise<void>;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signInWithGoogle: async () => {},
  logout: async () => {},
  signOut: async () => {},
  signOutUser: async () => {},
});

async function ensureUserProfile(firebaseUser: User): Promise<void> {
  try {
    const userRef = doc(db, "users", firebaseUser.uid);
    await setDoc(
      userRef,
      {
        uid: firebaseUser.uid,
        displayName: firebaseUser.displayName ?? "",
        email: firebaseUser.email ?? "",
        photoURL: firebaseUser.photoURL ?? "",
        plan: "free",
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    console.log("[Auth] ✅ User doc ensured: users/" + firebaseUser.uid);
  } catch (err) {
    console.error("[Auth] ❌ Failed to ensure user profile:", err);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Ensure user document exists in Firestore FIRST
        await ensureUserProfile(firebaseUser);
        // Set user BEFORE setting loading false
        // This guarantees AppDataContext sees a valid uid immediately
        setUser(firebaseUser);
        setLoading(false);
        console.log("[Auth] ✅ Signed in:", firebaseUser.uid);
      } else {
        // Clear user first, then loading
        setUser(null);
        setLoading(false);
        console.log("[Auth] User signed out");
      }
    });

    return () => unsub();
  }, []);

  async function signInWithGoogle(): Promise<void> {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    await signInWithPopup(auth, provider);
  }

  async function logout(): Promise<void> {
    await firebaseSignOut(auth);
    console.log("[Auth] ✅ Signed out");
  }

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, logout, signOut: logout, signOutUser: logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  return useContext(AuthContext);
}
