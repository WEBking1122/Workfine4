/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBSr79gujmJrHdCwLjoeUtsYxBA5f_AFRM",
  authDomain: "workfine-app.firebaseapp.com",
  projectId: "workfine-app",
  storageBucket: "workfine-app.firebasestorage.app",
  messagingSenderId: "1047026690029",
  appId: "1:1047026690029:web:3aa9db704c26bce9c2e9e4"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
