import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBSr79gujmJrHdCwLjoeUtsYxBA5f_AFRM",
  authDomain: "workfine-app.firebaseapp.com",
  projectId: "workfine-app",
  storageBucket: "workfine-app.firebasestorage.app",
  messagingSenderId: "1047026690029",
  appId: "1:1047026690029:web:3aa9db704c26bce9c2e9e4",
};

// Prevent duplicate Firebase app initialization
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const db   = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export default app;
