import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./config";

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string | null;
  plan: string;
  createdAt: any;
  updatedAt: any;
}

// Called on every login and signup — creates or updates user doc
export const createOrUpdateUserProfile = async (
  user: {
    uid: string;
    displayName: string | null;
    email: string | null;
    photoURL: string | null;
  }
): Promise<void> => {
  try {
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      // First time — create full profile
      await setDoc(userRef, {
        uid: user.uid,
        displayName:
          user.displayName ||
          user.email?.split("@")[0] ||
          "User",
        email: user.email || "",
        photoURL: user.photoURL || null,
        plan: "free",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      console.log("[Firebase] User profile created:", user.uid);
    } else {
      // Returning user — update name/photo only
      await setDoc(
        userRef,
        {
          displayName:
            user.displayName ||
            user.email?.split("@")[0] ||
            "User",
          email: user.email || "",
          photoURL: user.photoURL || null,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      console.log("[Firebase] User profile updated:", user.uid);
    }
  } catch (error: any) {
    console.error("[Firebase] createOrUpdateUserProfile error:",
      error.message);
    throw new Error(error.message);
  }
};

// Get user profile from Firestore
export const getUserProfile = async (
  uid: string
): Promise<UserProfile | null> => {
  try {
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      return userSnap.data() as UserProfile;
    }
    return null;
  } catch (error: any) {
    console.error("[Firebase] getUserProfile error:", error.message);
    return null;
  }
};
