import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase/config";
import { useAuth } from "./AuthContext";
import { subscribeToProjects } from "../lib/firebase/projects";

interface AppDataContextType {
  projects:    any[];
  tasks:       any[];
  teamMembers: any[];
  notes:       any[];
  files:       any[];
  folders:     any[];
  loading:     boolean;
  error:       string | null;
}

const AppDataContext = createContext<AppDataContextType>({
  projects:    [],
  tasks:       [],
  teamMembers: [],
  notes:       [],
  files:       [],
  folders:     [],
  loading:     false,
  error:       null,
});

const sortDesc = (arr: any[]): any[] =>
  [...arr].sort((a, b) => {
    const ms = (v: any): number => {
      if (!v) return 0;
      if (typeof v?.toMillis === "function") return v.toMillis();
      if (typeof v?.seconds  === "number")   return v.seconds * 1000;
      return new Date(v).getTime();
    };
    return ms(b.createdAt) - ms(a.createdAt);
  });

export const AppDataProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();

  const [projects,    setProjects]    = useState<any[]>([]);
  const [tasks,       setTasks]       = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [notes,       setNotes]       = useState<any[]>([]);
  const [files,       setFiles]       = useState<any[]>([]);
  const [folders,     setFolders]     = useState<any[]>([]);

  useEffect(() => {
    if (!user?.uid) {
      setProjects([]);
      setTasks([]);
      setTeamMembers([]);
      setNotes([]);
      setFiles([]);
      setFolders([]);
      return;
    }

    const uid = user.uid;
    const col = (name: string) => collection(db, "users", uid, name);

    const unsubProjects = subscribeToProjects(uid, (data) => {
      setProjects(
        data.sort((a, b) => {
          const ms = (v: any): number =>
            v?.toMillis?.() ?? (v?.seconds ? v.seconds * 1000 : 0);
          return ms(b.createdAt) - ms(a.createdAt);
        })
      );
    });

    const u1 = onSnapshot(
      col("tasks"),
      (s) => {
        setTasks(sortDesc(s.docs.map(d => ({ id: d.id, ...d.data() }))));
        console.log("[AppData] tasks:", s.size);
      },
      (e) => console.error("[AppData] tasks error:", e.code)
    );

    const u2 = onSnapshot(
      col("teamMembers"),
      (s) => setTeamMembers(sortDesc(s.docs.map(d => ({ id: d.id, ...d.data() })))),
      (e) => console.error("[AppData] teamMembers error:", e.code)
    );

    const u3 = onSnapshot(
      col("notes"),
      (s) => setNotes(sortDesc(s.docs.map(d => ({ id: d.id, ...d.data() })))),
      (e) => console.error("[AppData] notes error:", e.code)
    );

    const u4 = onSnapshot(
      col("files"),
      (s) => setFiles(sortDesc(s.docs.map(d => ({ id: d.id, ...d.data() })))),
      (e) => console.error("[AppData] files error:", e.code)
    );

    const u5 = onSnapshot(
      col("folders"),
      (s) => setFolders(sortDesc(s.docs.map(d => ({ id: d.id, ...d.data() })))),
      (e) => console.error("[AppData] folders error:", e.code)
    );

    return () => { unsubProjects(); u1(); u2(); u3(); u4(); u5(); };
  }, [user?.uid]);

  return (
    <AppDataContext.Provider
      value={{ projects, tasks, teamMembers, notes, files, folders, loading: false, error: null }}
    >
      {children}
    </AppDataContext.Provider>
  );
};

export const useAppData = () => useContext(AppDataContext);
