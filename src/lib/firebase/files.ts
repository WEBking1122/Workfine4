/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  getFirestore,
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';

export interface UserFile {
  id?: string;
  name: string;
  url: string;
  size: number;
  type: string;
  ownerId: string;
  projectId?: string | null;
  createdAt?: any;
}

/**
 * Upload a file to Firebase Storage and save its metadata to Firestore.
 * @param onProgress Optional callback called with 0-100 progress percent.
 */
export async function uploadFile(
  userId: string,
  file: File,
  projectId?: string,
  onProgress?: (percent: number) => void
): Promise<UserFile> {
  const storage = getStorage();
  const db = getFirestore();

  const storageRef = ref(storage, `files/${userId}/${Date.now()}_${file.name}`);

  await new Promise<void>((resolve, reject) => {
    const uploadTask = uploadBytesResumable(storageRef, file);
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const percent = Math.round(
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        );
        onProgress?.(percent);
      },
      reject,
      () => resolve()
    );
  });

  const url = await getDownloadURL(storageRef);

  const fileData: Omit<UserFile, 'id'> = {
    name: file.name,
    url,
    size: file.size,
    type: file.type,
    ownerId: userId,
    projectId: projectId ?? null,
    createdAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, 'files'), fileData);
  return { id: docRef.id, ...fileData };
}

/**
 * Subscribe to a user's uploaded files in real-time.
 * Returns an unsubscribe function.
 */
export function subscribeToUserFiles(
  userId: string,
  callback: (files: UserFile[]) => void
): () => void {
  const db = getFirestore();
  const q = query(
    collection(db, 'files'),
    where('ownerId', '==', userId)
  );
  return onSnapshot(q, (snap) => {
    const files = snap.docs.map((d) => ({ id: d.id, ...d.data() } as UserFile));
    callback(files);
  });
}

/**
 * Delete a file from Firebase Storage and remove its Firestore document.
 */
export async function deleteFile(
  fileId: string,
  storageUrl: string
): Promise<void> {
  const db = getFirestore();
  const storage = getStorage();
  const storageRef = ref(storage, storageUrl);
  await deleteObject(storageRef);
  await deleteDoc(doc(db, 'files', fileId));
}
