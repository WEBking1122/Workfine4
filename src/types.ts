/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface User {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  createdAt: string;
  lastActive: string;
  settings: {
    theme: 'light' | 'dark';
    notifications: boolean;
  };
}

export interface Workspace {
  id: string;
  name: string;
  ownerId: string;
  memberIds: string[];
  createdAt: string;
}

export interface Project {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  ownerId: string;
  color: string;
  memberRoles: Record<string, 'Owner' | 'Admin' | 'Member'>;
  createdAt: string;
}

export type TaskPriority = 'Urgent' | 'High' | 'Medium' | 'Low';
export type TaskStatus = 'To Do' | 'In Progress' | 'In Review' | 'Done';

export interface Attachment {
  name: string;
  url: string;
  size: number;
  type: string;
  uploadedAt: string;
  userId: string;
}

export interface Task {
  id: string;
  projectId: string;
  workspaceId: string;
  title: string;
  description: string;
  assigneeIds: string[];
  dueDate: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  sectionId: string;
  attachments: Attachment[];
  subtasks: Subtask[];
  createdAt: string;
  updatedAt: string;
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Comment {
  id: string;
  taskId: string;
  userId: string;
  text: string;
  createdAt: string;
}

export interface Activity {
  id: string;
  taskId: string;
  userId: string;
  type: 'status_change' | 'assignment' | 'comment' | 'edit';
  details: string;
  createdAt: string;
}
