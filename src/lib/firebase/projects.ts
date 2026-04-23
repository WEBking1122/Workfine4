import {
  addDoc, collection, serverTimestamp,
  onSnapshot, doc, deleteDoc, updateDoc,
} from "firebase/firestore";
import { db } from "./config";

// ALL functions scope to /users/{uid}/projects — never a root collection
const projectsRef = (uid: string) =>
  collection(db, "users", uid, "projects");

const projectDocRef = (uid: string, projectId: string) =>
  doc(db, "users", uid, "projects", projectId);

export const createProject = async (
  uid: string,
  data: {
    name:        string;
    color:       string;
    description: string;
    status:      string;
    priority:    string;
    dueDate:     string;
    members:     string[];
    tags:        string[];
  }
): Promise<string> => {
  const ref = await addDoc(collection(db, "users", uid, "projects"), {
    name:               data.name.trim(),
    color:              data.color,
    description:        data.description.trim(),
    status:             data.status,
    priority:           data.priority,
    dueDate:            data.dueDate,
    members:            data.members,
    tags:               data.tags,
    taskCount:          0,
    completedTaskCount: 0,
    progress:           0,
    ownerId:            uid,
    createdAt:          serverTimestamp(),
    updatedAt:          serverTimestamp(),
  });
  console.log("[Firebase] ✅ Project created: users/" + uid + "/projects/" + ref.id);
  return ref.id;
};

export const updateProject = async (
  uid: string,
  projectId: string,
  data: Partial<{ name: string; color: string; description: string; status: string }>
): Promise<void> => {
  await updateDoc(projectDocRef(uid, projectId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

export const deleteProject = async (
  uid: string,
  projectId: string
): Promise<void> => {
  await deleteDoc(projectDocRef(uid, projectId));
  console.log("[Firebase] 🗑 Project deleted:", projectId);
};

export const subscribeToProjects = (
  uid: string,
  cb: (projects: any[]) => void
): (() => void) => {
  return onSnapshot(
    projectsRef(uid),
    (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      console.log("[Firebase] projects synced:", data.length, "for user:", uid);
      cb(data);
    },
    (err) => console.error("[Firebase] projects listener error:", err.code)
  );
};
