import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  setDoc,
  onSnapshot,
  serverTimestamp,
  Unsubscribe,
} from "firebase/firestore";
import { db } from "./config";

export interface Project {
  id: string;
  name: string;
  description: string;
  color: string;
  status: string;
  uid: string;
  createdAt: unknown;
  [key: string]: any;
}

export interface NewProject {
  name: string;
  description: string;
  color: string;
  status?: string;
  [key: string]: any;
}

async function ensureUserDocExists(uid: string): Promise<void> {
  await setDoc(
    doc(db, "users", uid),
    { uid, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

export async function createProject(
  uid: string,
  data: NewProject
): Promise<string> {
  if (!uid) throw new Error("No authenticated user");

  await ensureUserDocExists(uid);

  const ref    = collection(db, "users", uid, "projects");
  const docRef = await addDoc(ref, {
    name:        data.name.trim(),
    description: data.description?.trim() ?? "",
    color:       data.color ?? "#6366f1",
    status:      data.status ?? "active",
    uid,
    createdAt: serverTimestamp(),
    ...data
  });

  console.log(
    "[Projects] ✅ Saved: users/" + uid + "/projects/" + docRef.id
  );
  return docRef.id;
}

export async function deleteProject(
  uid: string,
  projectId: string
): Promise<void> {
  if (!uid || !projectId) return;
  await deleteDoc(doc(db, "users", uid, "projects", projectId));
  console.log("[Projects] 🗑️ Deleted:", projectId);
}

export function subscribeToProjects(
  uid: string,
  callback: (projects: Project[]) => void
): Unsubscribe {
  if (!uid) {
    callback([]);
    return () => {};
  }

  console.log("[Projects] 👂 Attaching listener for uid:", uid);

  return onSnapshot(
    collection(db, "users", uid, "projects"),
    (snapshot) => {
      const list: Project[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Project, "id">),
      } as Project));

      list.sort((a, b) => {
        const aT =
          a.createdAt && typeof a.createdAt === "object" &&
          "seconds" in (a.createdAt as object)
            ? (a.createdAt as { seconds: number }).seconds : 0;
        const bT =
          b.createdAt && typeof b.createdAt === "object" &&
          "seconds" in (b.createdAt as object)
            ? (b.createdAt as { seconds: number }).seconds : 0;
        return bT - aT;
      });

      console.log("[Projects] 📦 Snapshot received — count:", list.length);
      callback(list);
    },
    (err) => {
      console.error("[Projects] ❌ Listener error:", err.message);
      callback([]);
    }
  );
}
