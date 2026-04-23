import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "./config";

export async function runOneTimeProjectCleanup(
  uid: string
): Promise<void> {
  if (!uid) return;

  // Check localStorage so this NEVER runs more than once per browser
  const flagKey = "projects_cleanup_done_" + uid;
  if (localStorage.getItem(flagKey) === "true") {
    console.log("[Cleanup] ✅ Already ran — skipping");
    return;
  }

  const ref = collection(db, "users", uid, "projects");
  const snapshot = await getDocs(ref);

  if (snapshot.empty) {
    console.log("[Cleanup] ✅ No old projects found — nothing to delete");
    localStorage.setItem(flagKey, "true");
    return;
  }

  const deletions = snapshot.docs.map((d) =>
    deleteDoc(doc(db, "users", uid, "projects", d.id))
  );
  await Promise.all(deletions);

  localStorage.setItem(flagKey, "true");
  console.log(
    "[Cleanup] ✅ Deleted " +
      snapshot.docs.length +
      " old broken project(s). Will never run again."
  );
}
