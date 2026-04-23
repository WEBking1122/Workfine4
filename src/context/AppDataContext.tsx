import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  ReactNode,
} from "react";
import { onSnapshot, collection } from "firebase/firestore";
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
}

const AppDataContext = createContext<AppDataContextType>({
  tasks: [],
  teamMembers: [],
  notes: [],
  projects: [],
  loading: true,
  files: [],
});

export function AppDataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  // Extract uid as a plain string — this is the critical fix.
  // useEffect depends on this string, not the user object,
  // so it only re-runs when the actual uid changes (sign in/out)
  // and never double-fires due to object reference changes.
  const uid = user?.uid ?? "";

  const [tasks, setTasks]             = useState<Task[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [notes, setNotes]             = useState<Note[]>([]);
  const [projects, setProjects]       = useState<Project[]>([]);
  const [loading, setLoading]         = useState(true);
  const resolvedRef                   = useRef(false);

  useEffect(() => {
    // No user — clear everything immediately
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

    // Hard safety net — never spin longer than 5 seconds
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
        console.log("[AppData] tasks:", data.length);
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
        console.log("[AppData] teamMembers:", data.length);
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
        console.log("[AppData] notes:", data.length);
        tryResolve();
      },
      () => { n = true; tryResolve(); }
    );

    const unsubProjects = subscribeToProjects(uid, (data) => {
      setProjects(data);
      p = true;
      console.log("[AppData] projects:", data.length);
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
  }, [uid]); // <-- uid string only, never user object

  return (
    <AppDataContext.Provider
      value={{ tasks, teamMembers, notes, projects, loading, files: [] }}
    >
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData(): AppDataContextType {
  return useContext(AppDataContext);
}
