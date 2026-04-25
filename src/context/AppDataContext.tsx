import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  ReactNode,
} from "react";
import {
  onSnapshot,
  collection,
  query,
  where,
  doc,
} from "firebase/firestore";
import { db } from "../lib/firebase/config";
import { useAuth } from "./AuthContext";
import { subscribeToProjects, Project } from "../lib/firebase/projects";

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate?: string;
  createdAt?: unknown;
  [key: string]: unknown;
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
  email?: string;
  [key: string]: unknown;
}

interface WorkspaceMember {
  userId: string;
  email: string;
  displayName: string;
  avatar: string;
  avatarColor: string;
  role: "owner" | "admin" | "member" | "viewer";
  status: "active" | "pending" | "suspended";
  joinedAt: any;
  invitedBy: string;
  lastActive: any;
  permissions: {
    canCreateProjects: boolean;
    canDeleteProjects: boolean;
    canInviteMembers: boolean;
    canManageTasks: boolean;
  };
}

interface PendingInvite {
  id: string;
  email: string;
  role: "admin" | "member" | "viewer";
  status: "pending" | "accepted" | "declined" | "expired";
  invitedBy: string;
  invitedByName: string;
  workspaceId: string;
  workspaceName: string;
  inviteCode: string;
  createdAt: any;
  expiresAt: any;
  acceptedAt: any;
}

interface WorkspaceData {
  id: string;
  workspaceId: string;
  name: string;
  ownerId: string;
  ownerEmail: string;
  createdAt: any;
  memberCount: number;
  plan: "free" | "pro";
}

interface Note {
  id: string;
  content: string;
  createdAt?: unknown;
  [key: string]: unknown;
}

interface AppDataContextType {
  tasks: Task[];
  teamMembers: TeamMember[];
  notes: Note[];
  projects: Project[];
  loading: boolean;
  files: any[];
  // Workspace team data
  members: WorkspaceMember[];
  pendingInvites: PendingInvite[];
  memberCount: number;
  workspaceData: WorkspaceData | null;
}

const AppDataContext = createContext<AppDataContextType>({
  tasks: [],
  teamMembers: [],
  notes: [],
  projects: [],
  loading: true,
  files: [],
  members: [],
  pendingInvites: [],
  memberCount: 0,
  workspaceData: null,
});

export function AppDataProvider({ children }: { children: ReactNode }) {
  const { user, workspaceId } = useAuth();
  const uid = user?.uid ?? "";

  const [tasks, setTasks]               = useState<Task[]>([]);
  const [teamMembers, setTeamMembers]   = useState<TeamMember[]>([]);
  const [notes, setNotes]               = useState<Note[]>([]);
  const [projects, setProjects]         = useState<Project[]>([]);
  const [loading, setLoading]           = useState(true);
  const [members, setMembers]           = useState<WorkspaceMember[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [workspaceData, setWorkspaceData]   = useState<WorkspaceData | null>(null);
  const resolvedRef                     = useRef(false);

  // ── Core user data listeners ──────────────────────────────────────────────
  useEffect(() => {
    if (!uid) {
      setTasks([]);
      setTeamMembers([]);
      setNotes([]);
      setProjects([]);
      setLoading(false);
      return;
    }

    console.log("[AppData] 🔄 Attaching all listeners for uid:", uid);
    resolvedRef.current = false;
    setLoading(true);

    let t = false, m = false, n = false, p = false;

    function tryResolve() {
      if (!resolvedRef.current && t && m && n && p) {
        resolvedRef.current = true;
        setLoading(false);
        console.log("[AppData] ✅ All listeners ready — loading resolved");
      }
    }

    const timeout = setTimeout(() => {
      if (!resolvedRef.current) {
        resolvedRef.current = true;
        setLoading(false);
        console.warn("[AppData] ⚠️ Safety timeout fired — forced ready");
      }
    }, 5000);

    const unsubTasks = onSnapshot(
      collection(db, "users", uid, "tasks"),
      (snap) => {
        const data: Task[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Task, "id">),
        } as Task));
        data.sort((a, b) => {
          const aT = a.createdAt && typeof a.createdAt === "object" &&
            "seconds" in (a.createdAt as object)
            ? (a.createdAt as { seconds: number }).seconds : 0;
          const bT = b.createdAt && typeof b.createdAt === "object" &&
            "seconds" in (b.createdAt as object)
            ? (b.createdAt as { seconds: number }).seconds : 0;
          return bT - aT;
        });
        setTasks(data);
        t = true;
        tryResolve();
      },
      () => { t = true; tryResolve(); }
    );

    const unsubMembers = onSnapshot(
      collection(db, "users", uid, "teamMembers"),
      (snap) => {
        const data: TeamMember[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<TeamMember, "id">),
        } as TeamMember));
        setTeamMembers(data);
        m = true;
        tryResolve();
      },
      () => { m = true; tryResolve(); }
    );

    const unsubNotes = onSnapshot(
      collection(db, "users", uid, "notes"),
      (snap) => {
        const data: Note[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Note, "id">),
        } as Note));
        setNotes(data);
        n = true;
        tryResolve();
      },
      () => { n = true; tryResolve(); }
    );

    const unsubProjects = subscribeToProjects(uid, (data) => {
      setProjects(data);
      p = true;
      tryResolve();
    });

    return () => {
      console.log("[AppData] 🧹 Cleaning up listeners for uid:", uid);
      clearTimeout(timeout);
      unsubTasks();
      unsubMembers();
      unsubNotes();
      unsubProjects();
    };
  }, [uid]);

  // ── Workspace team listeners (depends on workspaceId) ────────────────────
  useEffect(() => {
    if (!workspaceId) {
      setMembers([]);
      setPendingInvites([]);
      setWorkspaceData(null);
      return;
    }

    console.log("[AppData] 🔄 Attaching workspace listeners for:", workspaceId);

    // Listen to workspace doc
    const unsubWorkspace = onSnapshot(
      doc(db, "workspaces", workspaceId),
      (snap) => {
        if (snap.exists()) {
          setWorkspaceData({ id: snap.id, ...snap.data() } as WorkspaceData);
        }
      },
      (err) => console.warn("[AppData] workspace doc error:", err.code)
    );

    // Listen to workspace members
    const unsubWsMembers = onSnapshot(
      collection(db, "workspaces", workspaceId, "members"),
      (snap) => {
        const data = snap.docs.map((d) => ({
          ...d.data(),
        } as WorkspaceMember));
        setMembers(data);
        console.log("[AppData] workspace members:", data.length);
      },
      (err) => console.warn("[AppData] members error:", err.code)
    );

    // Listen to pending invites
    const unsubInvites = onSnapshot(
      query(
        collection(db, "workspaces", workspaceId, "invites"),
        where("status", "==", "pending")
      ),
      (snap) => {
        const data = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        } as PendingInvite));
        setPendingInvites(data);
        console.log("[AppData] pending invites:", data.length);
      },
      (err) => console.warn("[AppData] invites error:", err.code)
    );

    return () => {
      unsubWorkspace();
      unsubWsMembers();
      unsubInvites();
    };
  }, [workspaceId]);

  return (
    <AppDataContext.Provider
      value={{
        tasks,
        teamMembers,
        notes,
        projects,
        loading,
        files: [],
        members,
        pendingInvites,
        memberCount: members.filter((m) => m.status === "active").length,
        workspaceData,
      }}
    >
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData(): AppDataContextType {
  return useContext(AppDataContext);
}
