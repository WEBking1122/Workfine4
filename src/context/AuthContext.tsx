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
import { doc, setDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase/config";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  signOut: () => Promise<void>;
  signOutUser: () => Promise<void>;
  workspaceId: string | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signInWithGoogle: async () => {},
  logout: async () => {},
  signOut: async () => {},
  signOutUser: async () => {},
  workspaceId: null,
});

async function ensureUserProfile(firebaseUser: User): Promise<string> {
  try {
    const userRef = doc(db, "users", firebaseUser.uid);
    const snap = await getDoc(userRef);
    let workspaceId = "";
    if (snap.exists() && snap.data().workspaceId) {
      workspaceId = snap.data().workspaceId;
    } else {
      workspaceId = "WF-" + String(Math.floor(Math.random() * 900) + 100);
    }
    await setDoc(
      userRef,
      {
        uid: firebaseUser.uid,
        displayName: firebaseUser.displayName ?? "",
        email: firebaseUser.email ?? "",
        photoURL: firebaseUser.photoURL ?? "",
        plan: "free",
        updatedAt: serverTimestamp(),
        workspaceId,
      },
      { merge: true }
    );
    console.log("[Auth] ✅ User doc ensured: users/" + firebaseUser.uid);
    return workspaceId;
  } catch (err) {
    console.error("[Auth] ❌ Failed to ensure user profile:", err);
    return "";
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Ensure user document exists in Firestore FIRST
        const wid = await ensureUserProfile(firebaseUser);
        setWorkspaceId(wid);
        // Set user BEFORE setting loading false
        // This guarantees AppDataContext sees a valid uid immediately
        setUser(firebaseUser);
        setLoading(false);
        console.log("[Auth] ✅ Signed in:", firebaseUser.uid);
      } else {
        // Clear user first, then loading
        setWorkspaceId(null);
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
    <AuthContext.Provider value={{ user, loading, workspaceId, signInWithGoogle, logout, signOut: logout, signOutUser: logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  return useContext(AuthContext);
}
