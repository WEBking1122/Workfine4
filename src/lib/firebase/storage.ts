/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import { storage } from './config';
import { Attachment } from '../../types';

export const storageService = {
  async uploadFile(
    userId: string, 
    projectId: string, 
    taskId: string, 
    file: File
  ): Promise<Attachment> {
    const filePath = `uploads/${userId}/${projectId}/${taskId}/${Date.now()}_${file.name}`;
    const storageRef = ref(storage, filePath);
    
    const snapshot = await uploadBytes(storageRef, file);
    const url = await getDownloadURL(snapshot.ref);
    
    return {
      name: file.name,
      url,
      size: file.size,
      type: file.type,
      uploadedAt: new Date().toISOString(),
      userId
    };
  }
};
