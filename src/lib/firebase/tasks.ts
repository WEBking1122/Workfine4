/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove,
  limit,
  QuerySnapshot,
  DocumentData,
} from 'firebase/firestore';
import { db, auth } from './config';
import { Task, Comment, Activity } from '../../types';

// Helper paths — ensuring everything is scoped under /users/{userId}/
const tasksRef = (userId: string) =>
  collection(db, "users", userId, "tasks");

const taskDocRef = (userId: string, taskId: string) =>
  doc(db, "users", userId, "tasks", taskId);

const commentsRef = (userId: string) =>
  collection(db, "users", userId, "comments");

export const taskService = {
  async createTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'attachments' | 'subtasks'>): Promise<string> {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error("Unauthenticated user cannot create tasks");

    const tRef = doc(tasksRef(userId));
    const newTask: Task = {
      ...task,
      id: tRef.id,
      attachments: [],
      subtasks: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await setDoc(tRef, newTask);
    return tRef.id;
  },

  async updateTask(taskId: string, updates: Partial<Task>): Promise<void> {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error("Unauthenticated user");

    await updateDoc(taskDocRef(userId, taskId), {
      ...updates,
      updatedAt: new Date().toISOString()
    });
  },

  async deleteTask(taskId: string): Promise<void> {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error("Unauthenticated user");

    await deleteDoc(taskDocRef(userId, taskId));
  },

  subscribeToProjectTasks(projectId: string, callback: (tasks: Task[]) => void) {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      callback([]);
      return () => {};
    }

    const q = query(
      tasksRef(userId), 
      where('projectId', '==', projectId),
      orderBy('createdAt', 'asc')
    );
    return onSnapshot(q, (snapshot) => {
      const tasks = snapshot.docs.map(doc => doc.data() as Task);
      callback(tasks);
    });
  },

  subscribeToUserTasks(userId: string, callback: (tasks: Task[]) => void) {
    const q = query(
      tasksRef(userId), 
      where('assigneeId', '==', userId),
      orderBy('dueDate', 'asc')
    );
    return onSnapshot(q, (snapshot) => {
      const tasks = snapshot.docs.map(doc => doc.data() as Task);
      callback(tasks);
    });
  },

  async addComment(comment: Omit<Comment, 'id' | 'createdAt'>): Promise<void> {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error("Unauthenticated user");

    await addDoc(commentsRef(userId), {
      ...comment,
      createdAt: new Date().toISOString()
    });
  },

  subscribeToTaskComments(taskId: string, callback: (comments: Comment[]) => void) {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      callback([]);
      return () => {};
    }

    const q = query(
      commentsRef(userId), 
      where('taskId', '==', taskId),
      orderBy('createdAt', 'asc')
    );
    return onSnapshot(q, (snapshot) => {
      const comments = snapshot.docs.map(doc => doc.data() as Comment);
      callback(comments);
    });
  }
};

export async function getUserTasks(userId: string): Promise<Task[]> {
  const q = query(
    tasksRef(userId),
    where("assigneeId", "==", userId),
    limit(200)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Task));
}

export function subscribeToUserTasks(
  userId: string,
  callback: (tasks: Task[]) => void
): () => void {
  const q = query(
    tasksRef(userId),
    where("assigneeId", "==", userId),
    limit(200)
  );
  return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
    const tasks = snapshot.docs.map(
      (d) => ({ id: d.id, ...d.data() } as Task)
    );
    callback(tasks);
  });
}

export function subscribeToProjectTasks(
  projectId: string,
  callback: (tasks: Task[]) => void
): () => void {
  const userId = auth.currentUser?.uid;
  if (!userId) {
    callback([]);
    return () => {};
  }

  const q = query(
    tasksRef(userId),
    where("projectId", "==", projectId),
    limit(200)
  );
  return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
    const tasks = snapshot.docs.map(
      (d) => ({ id: d.id, ...d.data() } as Task)
    );
    callback(tasks);
  });
}

export async function createTask(
  uid: string,
  data: {
    title: string;
    description?: string;
    status: string;
    priority: string;
    dueDate?: string;
    assignee?: string;
    projectId?: string;
  }
): Promise<string> {
  if (!uid) throw new Error("No authenticated user");

  const ref    = collection(db, "users", uid, "tasks");
  const docRef = await addDoc(ref, {
    title:       data.title.trim(),
    description: data.description?.trim() ?? "",
    status:      data.status ?? "To Do",
    priority:    data.priority ?? "Medium",
    dueDate:     data.dueDate ?? null,
    assignee:    data.assignee?.trim() ?? "Unassigned",
    projectId:   data.projectId ?? null,
    userId:      uid,
    createdAt:   new Date().toISOString(), // Use ISO string to match existing taskService format or serverTimestamp()
    updatedAt:   new Date().toISOString(),
  });

  console.log("[Tasks] ✅ Task saved:", docRef.id);
  return docRef.id;
}
