import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "./config";

export const deleteAllUserProjects = async (userId: string): Promise<void> => {
  try {
    const colRef = collection(db, "users", userId, "projects");
    const snap   = await getDocs(colRef);
    const deletes = snap.docs.map((d) =>
      deleteDoc(doc(db, "users", userId, "projects", d.id))
    );
    await Promise.all(deletes);
    console.log(
      "[Cleanup] ✅ Deleted",
      snap.size,
      "project documents from Firestore"
    );
  } catch (err: any) {
    console.warn("[Cleanup] project deletion error:", err.message);
  }
};
