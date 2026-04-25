import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAppData } from "../context/AppDataContext";
import { useAuth } from "../context/AuthContext";
import { db } from "../lib/firebase/config";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query as firestoreQuery,
  serverTimestamp,
} from "firebase/firestore";
import {
  X,
  Send,
  Trash2,
  Edit2,
  ArrowLeft,
  Calendar,
  User as UserIcon,
  Tag,
  Clock,
  MessageCircle,
  FolderKanban,
} from "lucide-react";

export interface Task {
  id: string;
  taskCode?: string;
  title: string;
  status: string;
  priority: string;
  projectId?: string;
  projectCode?: string;
  assignee?: string;
  dueDate?: string;
  description?: string;
  createdAt?: any;
  [key: string]: any;
}

interface TaskDetailPanelProps {
  task: Task;
  onClose: () => void;
  onEdit: (task: Task) => void;
}

interface Comment {
  id: string;
  text: string;
  authorId: string;
  authorName: string;
  createdAt?: any;
  mentions?: string[];
}

const STATUS_STYLE: Record<string, string> = {
  "To Do": "bg-gray-100 text-gray-600",
  "In Progress": "bg-blue-100 text-blue-600",
  "In Review": "bg-purple-100 text-purple-600",
  "Done": "bg-emerald-100 text-emerald-600",
};

const PRIORITY_STYLE: Record<string, string> = {
  High: "bg-red-100 text-red-600",
  Medium: "bg-amber-100 text-amber-600",
  Low: "bg-gray-100 text-gray-500",
};

const PRIORITY_DOT: Record<string, string> = {
  High: "bg-red-500",
  Medium: "bg-amber-400",
  Low: "bg-gray-400",
};

const MENTION_SPLIT = /(#(?:TSK|PRJ)-\d+)/g;

function extractMentions(text: string): string[] {
  const regex = /#((?:TSK|PRJ)-\d+)/g;
  const matches: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    matches.push(match[1]);
  }
  return matches;
}

function toMs(v: any): number {
  if (!v) return 0;
  if (typeof v?.toMillis === "function") return v.toMillis();
  if (typeof v?.seconds === "number") return v.seconds * 1000;
  return new Date(v).getTime();
}

function timeAgo(timestamp: any): string {
  const ms = toMs(timestamp);
  if (!ms) return "";
  const date = new Date(ms);
  const diff = Date.now() - date.getTime();
  if (diff < 0) return "just now";
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function isOverdue(task: Task): boolean {
  if (!task.dueDate) return false;
  const status = (task.status ?? "").toLowerCase();
  if (status === "done" || status === "completed") return false;
  const due = new Date(task.dueDate + "T12:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today;
}

export default function TaskDetailPanel({
  task,
  onClose,
  onEdit,
}: TaskDetailPanelProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { projects = [], tasks: allTasks = [] } = useAppData() as any;

  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [sending, setSending] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const [mentionStart, setMentionStart] = useState<number>(-1);
  const [toast, setToast] = useState<string | null>(null);

  const inputRef = useRef<HTMLTextAreaElement>(null);

  const project = task.projectId
    ? projects.find((p: any) => p.id === task.projectId)
    : null;

  const overdue = isOverdue(task);

  // Slide-in animation
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !showSuggestions) handleClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showSuggestions]);

  // Real-time comments listener — newest first
  useEffect(() => {
    if (!user?.uid || !task.id) return;
    const q = firestoreQuery(
      collection(db, "users", user.uid, "tasks", task.id, "comments"),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const data: Comment[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Comment, "id">),
        }));
        setComments(data);
      },
      (err) => console.error("[TaskDetailPanel] comments listener:", err.message)
    );
    return () => unsub();
  }, [user?.uid, task.id]);

  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => onClose(), 280);
  }, [onClose]);

  const handleSend = useCallback(async () => {
    if (!user?.uid || !commentText.trim() || sending) return;
    setSending(true);
    try {
      const text = commentText.trim();
      const authorName = user.displayName ?? user.email ?? "User";
      await addDoc(
        collection(db, "users", user.uid, "tasks", task.id, "comments"),
        {
          text,
          authorId: user.uid,
          authorName,
          createdAt: serverTimestamp(),
          mentions: extractMentions(text),
        }
      );
      setCommentText("");
      setShowSuggestions(false);
      setMentionFilter("");
      setMentionStart(-1);
    } catch (e) {
      console.error("[TaskDetailPanel] add comment:", e);
    } finally {
      setSending(false);
    }
  }, [user, commentText, sending, task.id]);

  async function handleDelete(c: Comment) {
    if (!user?.uid) return;
    if (c.authorId !== user.uid) return;
    try {
      await deleteDoc(
        doc(db, "users", user.uid, "tasks", task.id, "comments", c.id)
      );
    } catch (e) {
      console.error("[TaskDetailPanel] delete comment:", e);
    }
  }

  function handleMentionClick(code: string) {
    if (code.startsWith("TSK-")) {
      navigate("/my-tasks?highlight=" + code);
      handleClose();
    } else if (code.startsWith("PRJ-")) {
      const found = projects.find((p: any) => p.code === code);
      if (found) {
        navigate("/projects/" + found.id);
        handleClose();
      } else {
        setToast(`Project ${code} not found`);
        setTimeout(() => setToast(null), 2000);
      }
    }
  }

  function renderCommentText(text: string): React.ReactNode {
    const parts = text.split(MENTION_SPLIT);
    return parts.map((part, i) => {
      const m = part.match(/^#((?:TSK|PRJ)-\d+)$/);
      if (m) {
        const code = m[1];
        const isProject = code.startsWith("PRJ-");
        return (
          <span
            key={i}
            onClick={(e) => {
              e.stopPropagation();
              handleMentionClick(code);
            }}
            className={`${
              isProject ? "text-violet-700" : "text-violet-600"
            } font-medium bg-violet-50 px-1.5 py-0.5 rounded cursor-pointer hover:bg-violet-100 hover:underline transition-colors font-mono text-sm`}
          >
            {part}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  }

  // Mention autocomplete suggestions, split into groups
  const taskItems = useMemo(
    () =>
      allTasks
        .filter((t: any) => t.taskCode)
        .map((t: any) => ({
          code: t.taskCode as string,
          label: t.title as string,
          priority: (t.priority as string) ?? "Low",
        })),
    [allTasks]
  );

  const projectItems = useMemo(
    () =>
      projects
        .filter((p: any) => p.code)
        .map((p: any) => ({
          code: p.code as string,
          label: p.name as string,
          color: (p.color as string) ?? "#8b5cf6",
        })),
    [projects]
  );

  const filteredTasks = useMemo(() => {
    if (!showSuggestions) return [];
    const q = mentionFilter.toLowerCase();
    if (!q) return taskItems.slice(0, 5);
    return taskItems
      .filter(
        (it: any) =>
          it.code.toLowerCase().includes(q) ||
          it.label.toLowerCase().includes(q)
      )
      .slice(0, 5);
  }, [showSuggestions, mentionFilter, taskItems]);

  const filteredProjects = useMemo(() => {
    if (!showSuggestions) return [];
    const q = mentionFilter.toLowerCase();
    if (!q) return projectItems.slice(0, 5);
    return projectItems
      .filter(
        (it: any) =>
          it.code.toLowerCase().includes(q) ||
          it.label.toLowerCase().includes(q)
      )
      .slice(0, 5);
  }, [showSuggestions, mentionFilter, projectItems]);

  const hasSuggestions =
    showSuggestions && (filteredTasks.length > 0 || filteredProjects.length > 0);

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value;
    setCommentText(val);
    const caret = e.target.selectionStart ?? val.length;
    const upToCaret = val.slice(0, caret);
    const hashIdx = upToCaret.lastIndexOf("#");
    if (hashIdx >= 0) {
      const between = upToCaret.slice(hashIdx + 1);
      if (!/\s/.test(between)) {
        setShowSuggestions(true);
        setMentionFilter(between);
        setMentionStart(hashIdx);
        return;
      }
    }
    setShowSuggestions(false);
    setMentionFilter("");
    setMentionStart(-1);
  }

  function insertMention(code: string) {
    if (mentionStart < 0) return;
    const before = commentText.slice(0, mentionStart);
    const caret = inputRef.current?.selectionStart ?? commentText.length;
    const after = commentText.slice(caret);
    const inserted = `#${code} `;
    const next = before + inserted + after;
    setCommentText(next);
    setShowSuggestions(false);
    setMentionFilter("");
    setMentionStart(-1);
    requestAnimationFrame(() => {
      const pos = (before + inserted).length;
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(pos, pos);
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (hasSuggestions && e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const first = filteredTasks[0] ?? filteredProjects[0];
      if (first) insertMention(first.code);
      return;
    }
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSend();
      return;
    }
    if (e.key === "Escape" && showSuggestions) {
      e.preventDefault();
      e.stopPropagation();
      setShowSuggestions(false);
    }
  }

  const dueDateLabel = task.dueDate
    ? new Date(task.dueDate + "T12:00:00").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";

  const createdLabel = task.createdAt
    ? new Date(toMs(task.createdAt)).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";

  const userInitial =
    (user?.displayName ?? user?.email ?? "U")[0]?.toUpperCase() ?? "U";

  const slideClass = !mounted || closing ? "translate-x-full" : "translate-x-0";
  const overlayClass = mounted && !closing ? "opacity-100" : "opacity-0";

  return (
    <>
      {/* Overlay — clicking closes the panel */}
      <div
        onClick={handleClose}
        className={`fixed inset-0 bg-black/30 z-40 transition-opacity duration-300 ${overlayClass}`}
      />

      {/* Side panel */}
      <div
        className={`fixed right-0 top-0 h-screen w-full max-w-2xl bg-white shadow-2xl border-l border-slate-200 z-50 flex flex-col transform transition-transform duration-300 ease-in-out ${slideClass}`}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-200 flex-shrink-0">
          <button
            onClick={handleClose}
            className="text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg p-2 transition-colors flex-shrink-0"
            title="Back"
          >
            <ArrowLeft size={18} />
          </button>

          {task.taskCode && (
            <span className="font-mono text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded mr-2 flex-shrink-0">
              {task.taskCode}
            </span>
          )}

          <h2 className="text-xl font-bold text-slate-800 flex-1 min-w-0 truncate">
            {task.title}
          </h2>

          <button
            onClick={() => onEdit(task)}
            className="bg-violet-50 hover:bg-violet-100 text-violet-600 rounded-lg p-2 transition-colors flex-shrink-0"
            title="Edit task"
          >
            <Edit2 size={16} />
          </button>

          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg p-2 transition-colors flex-shrink-0"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {/* SECTION 1 — Task info card */}
          <div className="bg-slate-50 rounded-2xl p-5 mb-4 border border-slate-100">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1.5">
                  Status
                </p>
                <span
                  className={`inline-block text-xs px-2 py-1 rounded-full font-medium ${
                    STATUS_STYLE[task.status] ?? "bg-gray-100 text-gray-500"
                  }`}
                >
                  {task.status ?? "To Do"}
                </span>
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1.5">
                  Priority
                </p>
                <span
                  className={`inline-block text-xs px-2 py-1 rounded-full font-medium ${
                    PRIORITY_STYLE[task.priority] ?? "bg-gray-100 text-gray-500"
                  }`}
                >
                  {task.priority ?? "Low"}
                </span>
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1.5">
                  Due Date
                </p>
                <div
                  className={`flex items-center gap-1.5 ${
                    overdue ? "text-red-500 font-medium" : "text-slate-700"
                  }`}
                >
                  <Calendar size={14} />
                  <span>{dueDateLabel}</span>
                  {overdue && (
                    <span className="text-[10px] font-semibold uppercase ml-1">
                      Overdue
                    </span>
                  )}
                </div>
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1.5">
                  Assignee
                </p>
                {task.assignee ? (
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-violet-500 flex items-center justify-center text-white text-[10px] font-bold">
                      {task.assignee[0]?.toUpperCase()}
                    </div>
                    <span className="text-slate-700 truncate">
                      {task.assignee}
                    </span>
                  </div>
                ) : (
                  <span className="text-slate-400 italic flex items-center gap-1.5">
                    <UserIcon size={14} />
                    Unassigned
                  </span>
                )}
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1.5">
                  Project
                </p>
                {project ? (
                  <div
                    onClick={() => {
                      navigate("/projects/" + project.id);
                      handleClose();
                    }}
                    className="flex items-center gap-2 cursor-pointer hover:text-violet-600 transition-colors"
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: project.color ?? "#8b5cf6" }}
                    />
                    <span className="text-slate-700 truncate hover:text-violet-600">
                      {project.name}
                    </span>
                  </div>
                ) : (
                  <span className="text-slate-400 italic flex items-center gap-1.5">
                    <FolderKanban size={14} />
                    No project
                  </span>
                )}
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1.5">
                  Task Code
                </p>
                <span className="font-mono text-slate-500 text-sm">
                  {task.taskCode ?? "—"}
                </span>
              </div>

              <div className="col-span-2">
                <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1.5">
                  Created
                </p>
                <div className="flex items-center gap-1.5 text-slate-700">
                  <Clock size={14} className="text-slate-400" />
                  <span>{createdLabel}</span>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2 — Description */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Tag size={14} className="text-slate-500" />
              <h3 className="text-sm font-semibold text-slate-700">
                Description
              </h3>
            </div>
            {task.description ? (
              <p className="text-sm text-slate-600 bg-slate-50 rounded-xl p-4 border border-slate-100 whitespace-pre-wrap">
                {task.description}
              </p>
            ) : (
              <p className="text-sm text-slate-400 italic">
                No description added. Click edit to add one.
              </p>
            )}
          </div>

          {/* SECTION 3 — Comments */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <MessageCircle size={14} className="text-slate-500" />
              <h3 className="text-sm font-semibold text-slate-700">Comments</h3>
              <span className="bg-violet-100 text-violet-600 text-xs px-2 py-0.5 rounded-full font-medium">
                {comments.length}
              </span>
            </div>

            {/* Input box */}
            <div className="mb-4">
              <div className="flex items-start gap-2 relative">
                <div className="w-8 h-8 rounded-full bg-violet-600 text-white flex items-center justify-center flex-shrink-0 font-bold text-xs">
                  {userInitial}
                </div>
                <div className="flex-1 relative">
                  <textarea
                    ref={inputRef}
                    value={commentText}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Add a comment... type # to mention a task or project"
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 focus:outline-none focus:border-violet-400 resize-none min-h-[80px] w-full"
                  />

                  {hasSuggestions && (
                    <div className="absolute bottom-full left-0 w-full bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto z-50 p-2 mb-1">
                      {filteredTasks.length > 0 && (
                        <div className="mb-1">
                          <p className="text-[10px] uppercase tracking-wider text-slate-400 px-2 py-1 font-semibold">
                            Tasks
                          </p>
                          {filteredTasks.map((it: any) => (
                            <button
                              key={"t-" + it.code}
                              type="button"
                              onClick={() => insertMention(it.code)}
                              className="w-full text-left px-2 py-1.5 hover:bg-violet-50 rounded-lg flex items-center gap-2 transition-colors"
                            >
                              <span
                                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                  PRIORITY_DOT[it.priority] ?? "bg-gray-400"
                                }`}
                              />
                              <span className="font-mono text-xs text-violet-600">
                                {it.code}
                              </span>
                              <span className="text-sm text-slate-700 truncate">
                                · {it.label}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                      {filteredProjects.length > 0 && (
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-slate-400 px-2 py-1 font-semibold">
                            Projects
                          </p>
                          {filteredProjects.map((it: any) => (
                            <button
                              key={"p-" + it.code}
                              type="button"
                              onClick={() => insertMention(it.code)}
                              className="w-full text-left px-2 py-1.5 hover:bg-violet-50 rounded-lg flex items-center gap-2 transition-colors"
                            >
                              <span
                                className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{ backgroundColor: it.color }}
                              />
                              <span className="font-mono text-xs text-violet-700">
                                {it.code}
                              </span>
                              <span className="text-sm text-slate-700 truncate">
                                · {it.label}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between mt-2 pl-10">
                <p className="text-xs text-slate-400">
                  Tip: type #TSK-001 or #PRJ-001 to create a clickable mention
                </p>
                <button
                  onClick={handleSend}
                  disabled={!commentText.trim() || sending}
                  className="bg-violet-600 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  <Send size={14} />
                  Send
                </button>
              </div>
            </div>

            {/* Comment list */}
            {comments.length === 0 ? (
              <p className="text-sm text-slate-400 italic py-3 text-center">
                No comments yet. Start the conversation.
              </p>
            ) : (
              <div className="space-y-2">
                {comments.map((c) => {
                  const isMine = c.authorId === user?.uid;
                  const initial = (c.authorName ?? "U")[0]?.toUpperCase() ?? "U";
                  return (
                    <div
                      key={c.id}
                      className="group bg-white rounded-xl p-4 border border-slate-100 hover:border-slate-200 transition-all mb-2"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-600 font-bold text-xs flex items-center justify-center flex-shrink-0">
                          {initial}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-xs font-semibold text-slate-700 truncate">
                                {c.authorName}
                              </span>
                              <span className="text-xs text-slate-400">
                                · {timeAgo(c.createdAt)}
                              </span>
                            </div>
                            {isMine && (
                              <button
                                onClick={() => handleDelete(c)}
                                className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 cursor-pointer transition-all flex-shrink-0"
                                title="Delete comment"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                          <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap break-words">
                            {renderCommentText(c.text)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Toast */}
        {toast && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-4 py-2 rounded-lg shadow-lg z-[60]">
            {toast}
          </div>
        )}
      </div>
    </>
  );
}
