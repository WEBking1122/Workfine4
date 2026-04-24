# Workfine - Work Management Platform

A production-quality Work Management Platform inspired by Asana, built with React, Tailwind CSS, and Google Firebase.

## 🚀 Live Demo

[Deployment URL] (AI Studio Preview)

## ✨ Features

- **User Authentication**: Google OAuth via Firebase Auth with persistent sessions.
- **Workspace & Projects**: Create custom workspaces and projects with unique themes.
- **Real-Time Task Engine**: Advanced task management with priorities, statuses, and due dates.
- **Multi-View System**:
  - **List View**: Hierarchical status-based list.
  - **Board View**: Interactive Kanban columns.
  - **Timeline View**: Gantt-style horizontal project tracking.
  - **Calendar View**: Monthly deadline visualization.
- **File Management**: Secure file uploads to Firebase Storage with task-level attachments.
- **Dashboard**: Real-time project health analytics using Recharts.
- **Real-Time Sync**: Firestore `onSnapshot` integration for instant multi-user collaboration.
- **Responsive Design**: Polished, mobile-first UI using the custom Workfine design system.

## 🛠 Tech Stack

- **Frontend**: React 18, Vite, TypeScript.
- **Styling**: Tailwind CSS 4, Lucide Icons, Motion (Framer Motion).
- **Backend**: Firebase Auth, Cloud Firestore (Enterprise), Firebase Storage.
- **Visuals**: Recharts (Charts), date-fns (Date Math).

## 📊 Firebase Data Model

- `/users/{uid}`: Profile data, settings, and last active tracking.
- `/workspaces/{workspaceId}`: Collaborative workspace containers.
- `/projects/{projectId}`: Themed project containers with member permissions.
- `/tasks/{taskId}`: Core task documents with nested attachments and subtasks.

## ⚙️ Local Setup

1. Clone the repository.
2. Install dependencies: `npm install`.
3. Create `.env.local` and add your Firebase configuration:
   ```env
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_PROJECT_ID=...
   VITE_FIREBASE_STORAGE_BUCKET=...
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   ```
4. Start the dev server: `npm run dev`.

---

_Built with ❤️ for high-performance product teams._
