/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { useAppData } from "../context/AppDataContext";
import { useAuth } from "../context/AuthContext";
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import {
  Plus,
  X,
  Folder,
  FileText,
  Pencil,
  FolderOpen,
  Clock,
  CheckSquare,
  Users,
  AlertTriangle,
  CheckCircle2,
  Check,
} from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";

const DENSITY_COLORS: Record<string, string> = {
  "To Do": "#9ca3af",
  "In Progress": "#3b82f6",
  "In Review": "#a855f7",
  Done: "#10b981",
};

function getMemberInitials(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { tasks, teamMembers, notes, files, folders, projects } = useAppData();

  // ── Derived stats ────────────────────────────────────────────────────────────
  const activeTasks = useMemo(
    () => tasks.filter((t) => t.status !== "Done"),
    [tasks],
  );
  const completedTasks = useMemo(
    () => tasks.filter((t) => t.status === "Done"),
    [tasks],
  );
  const totalMembers = teamMembers.length;


  // ── Overdue ──────────────────────────────────────────────────────────────────
  const [showOverdue, setShowOverdue] = useState(true);
  const overdueTasks = useMemo(
    () =>
      tasks.filter((t) => {
        if (!t.dueDate || t.status === "Done") return false;
        return new Date(t.dueDate) < new Date();
      }),
    [tasks],
  );

  // ── Workflow Health ──────────────────────────────────────────────────────────
  const workflowData = useMemo(
    () => [
      {
        name: "To Do",
        count: tasks.filter((t) => t.status === "To Do").length,
        color: "#9ca3af",
      },
      {
        name: "In Progress",
        count: tasks.filter((t) => t.status === "In Progress").length,
        color: "#3b82f6",
      },
      {
        name: "In Review",
        count: tasks.filter((t) => t.status === "In Review").length,
        color: "#a855f7",
      },
      {
        name: "Done",
        count: tasks.filter((t) => t.status === "Done").length,
        color: "#10b981",
      },
    ],
    [tasks],
  );

  // ── Project Density ──────────────────────────────────────────────────────────
  const densityData = []; // Projects removed temporarily

  // ── Task Priority ────────────────────────────────────────────────────────────
  const priorityData = useMemo(
    () =>
      [
        {
          name: "High",
          value: tasks.filter((t) => t.priority === "High").length,
          color: "#ef4444",
        },
        {
          name: "Medium",
          value: tasks.filter((t) => t.priority === "Medium").length,
          color: "#f59e0b",
        },
        {
          name: "Low",
          value: tasks.filter((t) => t.priority === "Low").length,
          color: "#9ca3af",
        },
      ].filter((d) => d.value > 0),
    [tasks],
  );

  // ── Upcoming Tasks ───────────────────────────────────────────────────────────
  const upcomingTasks = useMemo(
    () =>
      tasks
        .filter((t) => t.status !== "Done")
        .sort((a, b) => {
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        })
        .slice(0, 6),
    [tasks],
  );

  // ── Recent Activity ──────────────────────────────────────────────────────────
  const recentActivity = useMemo(
    () =>
      [...tasks]
        .sort((a, b) => {
          const ms = (v: any) =>
            v?.toMillis?.() ?? (v?.seconds ? v.seconds * 1000 : 0);
          return (
            ms(b.updatedAt ?? b.createdAt) - ms(a.updatedAt ?? a.createdAt)
          );
        })
        .slice(0, 6)
        .map((t) => ({
          id: t.id,
          icon: t.status === "Done" ? "check" : "plus",
          text:
            t.status === "Done"
              ? `Completed "${t.title}"`
              : `Created "${t.title}"`,
          project: "",
        })),
    [tasks],
  );

  // ── Weekly Productivity ──────────────────────────────────────────────────────
  const productivityData = useMemo(() => {
    const last7 = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return {
        day: d.toLocaleDateString("en-US", { weekday: "short" }),
        date: d.toISOString().split("T")[0],
      };
    });
    return last7.map(({ day, date }) => ({
      day,
      completed: completedTasks.filter((t) => {
        if (!t.updatedAt) return false;
        try {
          const taskDate = t.updatedAt.toDate
            ? t.updatedAt.toDate().toISOString().split("T")[0]
            : String(t.updatedAt).split("T")[0];
          return taskDate === date;
        } catch {
          return false;
        }
      }).length,
    }));
  }, [completedTasks]);

  const thisWeekCount = useMemo(
    () => productivityData.reduce((s, d) => s + d.completed, 0),
    [productivityData],
  );

  const displayName = user?.displayName ?? user?.email?.split("@")[0] ?? "User";

  // ── Modal state ──────────────────────────────────────────────────────────────

  // Quick Add Task
  const [showQuickTask, setShowQuickTask] = useState(false);
  const [quickTitle, setQuickTitle] = useState("");
  const [quickPriority, setQuickPriority] = useState<"High" | "Medium" | "Low">(
    "Medium",
  );
  const [quickDue, setQuickDue] = useState("");
  const [quickLoading, setQuickLoading] = useState(false);
  const [quickError, setQuickError] = useState<string | null>(null);

  const handleQuickAdd = async () => {
    if (!quickTitle.trim()) {
      setQuickError("Task title is required.");
      return;
    }
    if (!user?.uid) return;
    setQuickLoading(true);
    setQuickError(null);
    try {
      await addDoc(collection(getFirestore(), "users", user.uid, "tasks"), {
        title: quickTitle.trim(),
        priority: quickPriority,
        status: "To Do",
        dueDate: quickDue || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setQuickTitle("");
      setQuickPriority("Medium");
      setQuickDue("");
      setShowQuickTask(false);
    } catch (e: any) {
      setQuickError(e?.message ?? "Failed to create task.");
    } finally {
      setQuickLoading(false);
    }
  };

  // Team Members
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberName, setMemberName] = useState("");
  const [memberRole, setMemberRole] = useState("");
  const [memberError, setMemberError] = useState<string | null>(null);
  const [memberSaving, setMemberSaving] = useState(false);

  const handleAddMember = async () => {
    if (!memberName.trim()) {
      setMemberError("Full name is required.");
      return;
    }
    if (!user?.uid) return;
    setMemberSaving(true);
    setMemberError(null);
    try {
      await addDoc(
        collection(getFirestore(), "users", user.uid, "teamMembers"),
        {
          name: memberName.trim(),
          role: memberRole.trim() || null,
          createdAt: serverTimestamp(),
        },
      );
      setMemberName("");
      setMemberRole("");
      setShowAddMember(false);
    } catch (e: any) {
      setMemberError(e?.message ?? "Failed to add member.");
    } finally {
      setMemberSaving(false);
    }
  };

  const handleRemoveMember = async (id: string) => {
    if (!user?.uid) return;
    await deleteDoc(doc(getFirestore(), "users", user.uid, "teamMembers", id));
  };

  // Notes
  const [showNewNote, setShowNewNote] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteError, setNoteError] = useState<string | null>(null);
  const [noteSaving, setNoteSaving] = useState(false);

  const handleCreateNote = async () => {
    if (!noteTitle.trim()) {
      setNoteError("Title is required.");
      return;
    }
    if (!user?.uid) return;
    setNoteSaving(true);
    setNoteError(null);
    try {
      await addDoc(collection(getFirestore(), "users", user.uid, "notes"), {
        title: noteTitle.trim(),
        content: noteContent.trim(),
        createdAt: serverTimestamp(),
      });
      setNoteTitle("");
      setNoteContent("");
      setShowNewNote(false);
    } catch (e: any) {
      setNoteError(e?.message ?? "Failed to save note.");
    } finally {
      setNoteSaving(false);
    }
  };

  // Files / Folders
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [folderError, setFolderError] = useState<string | null>(null);
  const [folderSaving, setFolderSaving] = useState(false);

  const handleCreateFolder = async () => {
    if (!folderName.trim()) {
      setFolderError("Folder name is required.");
      return;
    }
    if (!user?.uid) return;
    setFolderSaving(true);
    setFolderError(null);
    try {
      await addDoc(collection(getFirestore(), "users", user.uid, "folders"), {
        name: folderName.trim(),
        createdAt: serverTimestamp(),
      });
      setFolderName("");
      setShowNewFolder(false);
    } catch (e: any) {
      setFolderError(e?.message ?? "Failed to create folder.");
    } finally {
      setFolderSaving(false);
    }
  };

  const [showAddFile, setShowAddFile] = useState(false);
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState("");
  const [fileFolderId, setFileFolderId] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);
  const [fileSaving, setFileSaving] = useState(false);

  const handleAddFile = async () => {
    if (!fileName.trim()) {
      setFileError("File name is required.");
      return;
    }
    if (!fileSize.trim()) {
      setFileError("File size is required.");
      return;
    }
    if (!user?.uid) return;
    setFileSaving(true);
    setFileError(null);
    try {
      await addDoc(collection(getFirestore(), "users", user.uid, "files"), {
        name: fileName.trim(),
        size: fileSize.trim(),
        folderId: fileFolderId || null,
        createdAt: serverTimestamp(),
      });
      setFileName("");
      setFileSize("");
      setFileFolderId("");
      setShowAddFile(false);
    } catch (e: any) {
      setFileError(e?.message ?? "Failed to add file.");
    } finally {
      setFileSaving(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="ml-56 bg-[#f4f5f7] min-h-screen overflow-y-auto relative">
      <Navbar title="Dashboard" />
      <div className="max-w-6xl mx-auto px-6 pt-14 pb-8">
        {/* ── Page Header ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Welcome, {displayName}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Here&apos;s your productivity overview for today.
            </p>
          </div>
        </div>

        {/* ── Overdue Banner ──────────────────────────────────────────────── */}
        {showOverdue && overdueTasks.length > 0 && (
          <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 mb-4">
            <div className="flex items-center gap-2 min-w-0">
              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <span className="text-sm font-medium text-red-700 flex-shrink-0">
                {overdueTasks.length} Overdue Task
                {overdueTasks.length > 1 ? "s" : ""}
              </span>
              <span className="text-xs text-red-500 truncate hidden sm:block">
                {overdueTasks.map((t) => t.title).join(", ")}
              </span>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <Link
                to="/my-tasks"
                className="text-xs font-medium text-red-600 hover:text-red-800 underline whitespace-nowrap"
              >
                View All &rarr;
              </Link>
              <button
                onClick={() => setShowOverdue(false)}
                className="text-red-400 hover:text-red-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── ROW 1: Stat Cards ───────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {[
            {
              label: "Total Projects",
              value: projects.length,
              icon: <FolderOpen className="w-5 h-5 text-blue-500" />,
              bg: "bg-blue-50",
            },
            {
              label: "Active Tasks",
              value: activeTasks.length,
              icon: <Clock className="w-5 h-5 text-orange-500" />,
              bg: "bg-orange-50",
            },
            {
              label: "Completed Tasks",
              value: completedTasks.length,
              icon: <CheckSquare className="w-5 h-5 text-emerald-500" />,
              bg: "bg-emerald-50",
            },
            {
              label: "Team Members",
              value: totalMembers,
              icon: <Users className="w-5 h-5 text-purple-500" />,
              bg: "bg-purple-50",
            },
          ].map((s, i) => (
            <div
              key={i}
              className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 flex items-center gap-3 h-[100px]"
            >
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${s.bg}`}
              >
                {s.icon}
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">{s.label}</p>
                <p className="text-2xl font-bold text-gray-900 leading-tight">
                  {s.value}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* ── ROW 2: Project Progress | Upcoming Tasks ────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
          {/* Project Progress */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 max-h-[260px] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-semibold text-gray-800">
                  Project Progress
                </h2>
                <p className="text-xs text-gray-400 uppercase tracking-wide mt-0.5">
                  Tasks by project
                </p>
              </div>
              <span className="text-xs text-gray-400">{0} projects</span>
            </div>
            <p className="text-xs text-gray-400 text-center py-8">
              No projects yet.
            </p>
          </div>

          {/* Upcoming Tasks */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 max-h-[260px] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-semibold text-gray-800">
                  Upcoming Tasks
                </h2>
                <p className="text-xs text-gray-400 uppercase tracking-wide mt-0.5">
                  Sorted by due date
                </p>
              </div>
              <Link
                to="/my-tasks"
                className="text-xs font-medium text-blue-600 hover:text-blue-800"
              >
                VIEW ALL &rarr;
              </Link>
            </div>
            {upcomingTasks.length === 0 ? (
              <div className="flex flex-col items-center py-8">
                <p className="text-xs text-gray-400">
                  Your task list is clear. Great job!
                </p>
              </div>
            ) : (
              <div>
                {upcomingTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-2 py-1.5 border-b border-gray-50 last:border-0"
                  >
                    {task.status === "Done" ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    ) : (
                      <Clock className="w-4 h-4 text-gray-300 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-700 truncate">
                        {task.title}
                      </p>
                      <p className="text-xs text-gray-400">
                        {task.dueDate
                          ? new Date(task.dueDate).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "No due date"}
                      </p>
                    </div>
                    <span
                      className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                        task.priority === "High"
                          ? "bg-red-100 text-red-600"
                          : task.priority === "Medium"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {task.priority || "None"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── ROW 3: Workflow Health ─────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
          {/* Workflow Health */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
            <div className="mb-3">
              <h2 className="text-sm font-semibold text-gray-800">
                Workflow Health
              </h2>
              <p className="text-xs text-gray-400 uppercase tracking-wide mt-0.5">
                Tasks by status
              </p>
            </div>
            <div className="h-[180px] w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={workflowData}
                  margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#e5e7eb"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "#6b7280", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#6b7280", fontSize: 11 }}
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={40}>
                    {workflowData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ── ROW 4: Task Priority | Recent Activity ───────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
          {/* Task Priority Breakdown */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
            <div className="mb-3">
              <h2 className="text-sm font-semibold text-gray-800">
                Task Priority Breakdown
              </h2>
              <p className="text-xs text-gray-400 uppercase tracking-wide mt-0.5">
                Distribution by level
              </p>
            </div>
            {tasks.length === 0 ? (
              <div className="flex items-center justify-center h-[180px] mt-2">
                <p className="text-xs text-gray-400">No tasks yet.</p>
              </div>
            ) : (
              <div className="h-[180px] w-full mt-2 relative">
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-4">
                  <span className="text-2xl font-bold text-gray-900">
                    {tasks.length}
                  </span>
                  <span className="text-[10px] text-gray-500 uppercase">
                    Tasks
                  </span>
                </div>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={priorityData}
                      cx="50%"
                      cy="45%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {priorityData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "#fff",
                        border: "1px solid #e5e7eb",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Legend
                      iconType="circle"
                      iconSize={6}
                      verticalAlign="bottom"
                      formatter={(v) => (
                        <span style={{ fontSize: "10px", color: "#6b7280" }}>
                          {v}
                        </span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
            <div className="mb-3">
              <h2 className="text-sm font-semibold text-gray-800">
                Recent Activity
              </h2>
              <p className="text-xs text-gray-400 uppercase tracking-wide mt-0.5">
                Latest actions
              </p>
            </div>
            {recentActivity.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-8">
                No activity yet.
              </p>
            ) : (
              <div className="space-y-1 mt-2">
                {recentActivity.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 py-1.5 border-b border-gray-50 last:border-0"
                  >
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        item.icon === "check" ? "bg-emerald-100" : "bg-blue-100"
                      }`}
                    >
                      {item.icon === "check" ? (
                        <Check className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <Plus className="w-3 h-3 text-blue-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-700 truncate">
                        {item.text}
                      </p>
                      <p className="text-[10px] text-gray-400 truncate">
                        {item.project}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── ROW 5: Weekly Productivity | Team Members Workload ───────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
          {/* Weekly Productivity */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-semibold text-gray-800">
                  Weekly Productivity
                </h2>
                <p className="text-xs text-gray-400 uppercase tracking-wide mt-0.5">
                  Completed last 7 days
                </p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-gray-900 leading-tight">
                  {thisWeekCount}
                </p>
                <p className="text-[10px] text-gray-400">this week</p>
              </div>
            </div>
            <div className="h-[180px] w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={productivityData}
                  margin={{ top: 5, right: 5, left: -30, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="prodGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#f3f4f6"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="day"
                    tick={{ fill: "#9ca3af", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#9ca3af", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="completed"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fill="url(#prodGrad)"
                    dot={{ fill: "#3b82f6", r: 3 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Team Members Workload */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
            <div className="mb-3">
              <h2 className="text-sm font-semibold text-gray-800">
                Team Members
              </h2>
              <p className="text-xs text-gray-400 uppercase tracking-wide mt-0.5">
                Workload overview
              </p>
            </div>
            {teamMembers.length === 0 ? (
              <div className="flex items-center justify-center h-[140px] mt-2">
                <p className="text-xs text-gray-400 text-center">
                  No team members yet.
                  <br />
                  Add members to see workload.
                </p>
              </div>
            ) : (
              <div className="mt-2">
                {teamMembers.slice(0, 5).map((member) => {
                  const memberTasks = tasks.filter(
                    (t) =>
                      t.assignee === member.name ||
                      t.assigneeId === member.id ||
                      (Array.isArray(t.assigneeIds) &&
                        t.assigneeIds.includes(member.id)),
                  );
                  const doneTasks = memberTasks.filter(
                    (t) => t.status === "Done",
                  );
                  const pct =
                    memberTasks.length > 0
                      ? Math.round(
                          (doneTasks.length / memberTasks.length) * 100,
                        )
                      : 0;
                  return (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 mb-3 last:mb-0"
                    >
                      <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {getMemberInitials(member.name ?? member.email ?? "?")}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <p className="text-xs font-medium text-gray-700 truncate">
                            {member.name}
                          </p>
                          <p className="text-[10px] text-gray-400 ml-2">
                            {memberTasks.length} tasks
                          </p>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1">
                          <div
                            className="h-1 bg-blue-500 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── ROW 6: My Files | My Notes ──────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
          {/* My Files */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 max-h-[220px] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-800">My Files</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowNewFolder(true)}
                  className="text-[10px] font-medium text-gray-500 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 px-2 py-1 rounded"
                >
                  New Folder
                </button>
                <button
                  onClick={() => setShowAddFile(true)}
                  className="text-[10px] font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded"
                >
                  Add File
                </button>
              </div>
            </div>
            {folders.length === 0 && files.length === 0 ? (
              <div className="flex flex-col items-center py-6">
                <Folder className="w-8 h-8 text-gray-200 mb-2" />
                <p className="text-xs text-gray-400">No files yet.</p>
              </div>
            ) : (
              <div>
                {folders.map((f) => (
                  <div
                    key={f.id}
                    className="h-8 flex items-center gap-2 border-b border-gray-50 last:border-0"
                  >
                    <Folder className="w-4 h-4 text-gray-400" />
                    <span className="text-xs text-gray-700 truncate flex-1">
                      {f.name}
                    </span>
                  </div>
                ))}
                {files.map((f) => (
                  <div
                    key={f.id}
                    className="h-8 flex items-center gap-2 border-b border-gray-50 last:border-0"
                  >
                    <FileText className="w-4 h-4 text-gray-400" />
                    <span className="text-xs text-gray-700 truncate flex-1">
                      {f.name}
                    </span>
                    <span className="text-[10px] text-gray-400">{f.size}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* My Notes */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 max-h-[220px] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-800">My Notes</h2>
              <button
                onClick={() => setShowNewNote(true)}
                className="text-[10px] font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded"
              >
                New Note
              </button>
            </div>
            {notes.length === 0 ? (
              <div className="flex flex-col items-center py-6">
                <Pencil className="w-8 h-8 text-gray-200 mb-2" />
                <p className="text-xs text-gray-400">No notes yet.</p>
              </div>
            ) : (
              <div>
                {notes.map((n) => (
                  <div
                    key={n.id}
                    className="py-2 border-b border-gray-50 last:border-0"
                  >
                    <p className="text-xs font-medium text-gray-700 truncate">
                      {n.title}
                    </p>
                    {n.content && (
                      <p className="text-[10px] text-gray-400 truncate mt-0.5">
                        {n.content}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── ROW 7: Team Members Management ──────────────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-gray-800">
                Team Members
              </h2>
              <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                {teamMembers.length}
              </span>
            </div>
            <button
              onClick={() => setShowAddMember(true)}
              className="text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg"
            >
              Add Member
            </button>
          </div>
          {teamMembers.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-center">
              <p className="text-xs text-gray-400">
                No team members yet. Click Add Member.
              </p>
            </div>
          ) : (
            <div className="max-h-[200px] overflow-y-auto">
              <div className="grid grid-cols-[auto_1fr_1fr_auto] gap-x-4 pb-2 border-b border-gray-100">
                <div className="text-[10px] text-gray-400 uppercase tracking-wide font-medium" />
                <div className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">
                  Name
                </div>
                <div className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">
                  Role
                </div>
                <div className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">
                  Action
                </div>
              </div>
              {teamMembers.map((m) => (
                <div
                  key={m.id}
                  className="grid grid-cols-[auto_1fr_1fr_auto] gap-x-4 py-2 border-b border-gray-50 last:border-0 items-center"
                >
                  <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-bold">
                    {getMemberInitials(m.name ?? m.email ?? "?")}
                  </div>
                  <div className="text-xs font-medium text-gray-700 truncate">
                    {m.name ?? m.email}
                  </div>
                  <div>
                    <span className="text-[10px] bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">
                      {m.role || "Member"}
                    </span>
                  </div>
                  <div>
                    <button
                      onClick={() => handleRemoveMember(m.id)}
                      className="text-[10px] text-red-400 hover:text-red-600 font-medium"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Floating Add Task ────────────────────────────────────────────────── */}
      <button
        onClick={() => setShowQuickTask(true)}
        className="fixed bottom-6 right-6 z-50 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm px-4 py-3 rounded-full shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
      >
        <Plus className="w-4 h-4" /> Add Task
      </button>

      {/* ── Quick Add Task Modal ─────────────────────────────────────────────── */}
      {showQuickTask && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-gray-900">
                Quick Add Task
              </h3>
              <button
                onClick={() => setShowQuickTask(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mb-3">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">
                Task Title *
              </label>
              <input
                autoFocus
                type="text"
                value={quickTitle}
                onChange={(e) => setQuickTitle(e.target.value)}
                placeholder="What needs to be done?"
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">
                  Priority
                </label>
                <select
                  value={quickPriority}
                  onChange={(e) => setQuickPriority(e.target.value as any)}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  value={quickDue}
                  onChange={(e) => setQuickDue(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
            </div>
            {quickError && (
              <p className="text-red-500 text-xs mb-3">{quickError}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => setShowQuickTask(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleQuickAdd}
                disabled={quickLoading}
                className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-sm font-semibold py-2 rounded-lg transition-colors"
              >
                {quickLoading ? "Adding..." : "Add Task"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── New Folder Modal ─────────────────────────────────────────────────── */}
      {showNewFolder && (
        <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-gray-900">
                New Folder
              </h3>
              <button
                onClick={() => setShowNewFolder(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mb-4">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">
                Folder Name *
              </label>
              <input
                autoFocus
                type="text"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                placeholder="e.g. Project Assets"
                className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              {folderError && (
                <p className="text-red-500 text-xs mt-1">{folderError}</p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowNewFolder(false)}
                className="flex-1 bg-white border border-gray-200 text-gray-600 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFolder}
                disabled={folderSaving}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm disabled:opacity-60"
              >
                {folderSaving ? "Creating..." : "Create Folder"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add File Modal ───────────────────────────────────────────────────── */}
      {showAddFile && (
        <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-gray-900">
                Add File
              </h3>
              <button
                onClick={() => setShowAddFile(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 mb-4">
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">
                  File Name *
                </label>
                <input
                  autoFocus
                  type="text"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  placeholder="e.g. Design Spec.pdf"
                  className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">
                  File Size *
                </label>
                <input
                  type="text"
                  value={fileSize}
                  onChange={(e) => setFileSize(e.target.value)}
                  placeholder="e.g. 2.4 MB"
                  className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">
                  Folder
                </label>
                <select
                  value={fileFolderId}
                  onChange={(e) => setFileFolderId(e.target.value)}
                  className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <option value="">No Folder</option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>
              {fileError && (
                <p className="text-red-500 text-xs mt-1">{fileError}</p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowAddFile(false)}
                className="flex-1 bg-white border border-gray-200 text-gray-600 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddFile}
                disabled={fileSaving}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm disabled:opacity-60"
              >
                {fileSaving ? "Adding..." : "Add File"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── New Note Modal ───────────────────────────────────────────────────── */}
      {showNewNote && (
        <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-gray-900">
                New Note
              </h3>
              <button
                onClick={() => setShowNewNote(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 mb-4">
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">
                  Title *
                </label>
                <input
                  autoFocus
                  type="text"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  placeholder="Note title"
                  className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">
                  Content
                </label>
                <textarea
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Write your note..."
                  rows={4}
                  className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 w-full focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none min-h-[100px]"
                />
              </div>
              {noteError && (
                <p className="text-red-500 text-xs mt-1">{noteError}</p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowNewNote(false)}
                className="flex-1 bg-white border border-gray-200 text-gray-600 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateNote}
                disabled={noteSaving}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm disabled:opacity-60"
              >
                {noteSaving ? "Saving..." : "Save Note"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Team Member Modal ────────────────────────────────────────────── */}
      {showAddMember && (
        <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-gray-900">
                Add Team Member
              </h3>
              <button
                onClick={() => setShowAddMember(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 mb-4">
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">
                  Full Name *
                </label>
                <input
                  autoFocus
                  type="text"
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
                  placeholder="e.g. Sarah Chen"
                  className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">
                  Role
                </label>
                <input
                  type="text"
                  value={memberRole}
                  onChange={(e) => setMemberRole(e.target.value)}
                  placeholder="e.g. Designer, Developer"
                  className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              {memberError && (
                <p className="text-red-500 text-xs mt-1">{memberError}</p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowAddMember(false)}
                className="flex-1 bg-white border border-gray-200 text-gray-600 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddMember}
                disabled={memberSaving}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm disabled:opacity-60"
              >
                {memberSaving ? "Adding..." : "Add Member"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
