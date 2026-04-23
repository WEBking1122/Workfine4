/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode
} from 'react';
import {
  onAuthStateChanged,
  updateProfile,
  User as FirebaseUser,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult,
  getAuth
} from 'firebase/auth';
import { auth } from '../lib/firebase/config';
import { User } from '../types';
import { deleteAllUserProjects } from '../lib/firebase/cleanup';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  signOutUser: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getGoogleProvider = () => {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  provider.addScope("email");
  provider.addScope("profile");
  return provider;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // onAuthStateChanged — syncs user and runs one-time cleanup
  useEffect(() => {
    const authInstance = getAuth();
    const unsubscribe = onAuthStateChanged(authInstance, async (firebaseUser) => {
      if (firebaseUser) {
        // Derive display name for email accounts if missing
        if (!firebaseUser.displayName && firebaseUser.email) {
          const emailName = firebaseUser.email
            .split('@')[0]
            .replace(/[._-]+/g, ' ')
            .replace(/\b\w/g, (c) => c.toUpperCase());
          try { await updateProfile(firebaseUser, { displayName: emailName }); } catch { /* non-fatal */ }
        }

        // Sync Firestore user profile
        try {
          const { createOrUpdateUserProfile } = await import('../lib/firebase/users');
          await createOrUpdateUserProfile({
            uid:         firebaseUser.uid,
            displayName: firebaseUser.displayName,
            email:       firebaseUser.email,
            photoURL:    firebaseUser.photoURL,
          });
        } catch (e) {
          console.error("[Auth] Failed to sync profile:", e);
        }

        // One-time project collection cleanup
        deleteAllUserProjects(firebaseUser.uid);

        const currentUser: User = {
          uid:         firebaseUser.uid,
          displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
          email:       firebaseUser.email,
          photoURL:    firebaseUser.photoURL,
          createdAt:   new Date().toISOString(),
          lastActive:  new Date().toISOString(),
          settings: { theme: 'dark', notifications: true },
        };
        setUser(currentUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Handle Google redirect result on page load
  useEffect(() => {
    const authInstance = getAuth();
    getRedirectResult(authInstance)
      .then((result) => {
        if (result?.user) {
          console.log("[Auth] ✅ Google redirect completed:", result.user.email);
        }
      })
      .catch((err) => {
        if (err.code !== "auth/no-auth-event") {
          console.warn("[Auth] getRedirectResult:", err.code);
        }
      });
  }, []);

  // Safety timeout — force loading false after 8 s
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading((prev) => {
        if (prev) { console.warn("[Auth] Safety timeout — forcing loading false"); return false; }
        return prev;
      });
    }, 8000);
    return () => clearTimeout(timer);
  }, []);

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  const signOutUser = async () => {
    try {
      const authInstance = getAuth();
      await authInstance.signOut();
      localStorage.clear();
      sessionStorage.clear();
      const databases = await window.indexedDB.databases?.();
      if (databases) {
        databases.forEach((db) => { if (db.name) window.indexedDB.deleteDatabase(db.name); });
      }
      console.log("[Auth] User signed out. All cache cleared.");
    } catch (error: any) {
      console.error("[Auth] Sign out error:", error.message);
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    const authInstance = getAuth();
    await firebaseSignOut(authInstance);
    const provider = getGoogleProvider();
    await signInWithRedirect(authInstance, provider);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut, signOutUser, signInWithGoogle }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
