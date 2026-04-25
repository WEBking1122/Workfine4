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
import {
  doc, setDoc, serverTimestamp, getDoc, updateDoc,
} from "firebase/firestore";
import { auth, db } from "../lib/firebase/config";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  signOut: () => Promise<void>;
  signOutUser: () => Promise<void>;
  workspaceId: string | null;
  setWorkspaceId: (id: string) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signInWithGoogle: async () => {},
  logout: async () => {},
  signOut: async () => {},
  signOutUser: async () => {},
  workspaceId: null,
  setWorkspaceId: () => {},
});

async function ensureUserProfile(firebaseUser: User): Promise<string> {
  try {
    const userRef = doc(db, "users", firebaseUser.uid);
    const snap    = await getDoc(userRef);

    // ✅ RULE 1 — If user already has a workspaceId, ALWAYS keep it
    // Never overwrite an existing workspace assignment
    if (snap.exists() && snap.data().workspaceId) {
      const existingWid = snap.data().workspaceId as string;

      // Still update presence fields but never touch workspaceId
      await setDoc(
        userRef,
        {
          uid:         firebaseUser.uid,
          displayName: firebaseUser.displayName ?? "",
          email:       firebaseUser.email ?? "",
          photoURL:    firebaseUser.photoURL ?? "",
          plan:        snap.data().plan ?? "free",
          updatedAt:   serverTimestamp(),
          workspaceId: existingWid, // ← preserve existing, never overwrite
        },
        { merge: true }
      );

      console.log("[Auth] ✅ Existing user — keeping workspaceId:", existingWid);
      return existingWid;
    }

    // ✅ RULE 2 — Check if there is a pending invite in localStorage
    // If the user is accepting an invite, their workspaceId comes
    // from the invite — NOT from a newly generated one
    const pendingCode = localStorage.getItem("pendingInviteCode");
    if (pendingCode) {
      console.log("[Auth] 🎫 Pending invite found in localStorage:", pendingCode);
      // The workspaceId will be set by JoinWorkspacePage after
      // reading the invite document — do NOT generate a new one yet
      // Return empty string — JoinWorkspacePage handles the rest
      await setDoc(
        userRef,
        {
          uid:         firebaseUser.uid,
          displayName: firebaseUser.displayName ?? "",
          email:       firebaseUser.email ?? "",
          photoURL:    firebaseUser.photoURL ?? "",
          plan:        "free",
          updatedAt:   serverTimestamp(),
          // workspaceId intentionally NOT set here
          // JoinWorkspacePage will set it after accepting
        },
        { merge: true }
      );
      return ""; // JoinWorkspacePage will set the real workspaceId
    }

    // ✅ RULE 3 — Brand new user with no invite
    // Generate a fresh workspace only for genuinely new users
    const workspaceId =
      "WF-" + String(Math.floor(Math.random() * 900) + 100);

    await setDoc(
      userRef,
      {
        uid:         firebaseUser.uid,
        displayName: firebaseUser.displayName ?? "",
        email:       firebaseUser.email ?? "",
        photoURL:    firebaseUser.photoURL ?? "",
        plan:        "free",
        updatedAt:   serverTimestamp(),
        workspaceId,
      },
      { merge: true }
    );

    console.log("[Auth] ✅ New user — generated workspaceId:", workspaceId);
    return workspaceId;
  } catch (err) {
    console.error("[Auth] ❌ Failed to ensure user profile:", err);
    return "";
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,        setUser]        = useState<User | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const wid = await ensureUserProfile(firebaseUser);
        setWorkspaceId(wid || null);
        setUser(firebaseUser);
        setLoading(false);
        console.log("[Auth] ✅ Signed in:", firebaseUser.uid, "| workspace:", wid);
      } else {
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
    <AuthContext.Provider
      value={{
        user,
        loading,
        workspaceId,
        setWorkspaceId,
        signInWithGoogle,
        logout,
        signOut:     logout,
        signOutUser: logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  return useContext(AuthContext);
}
