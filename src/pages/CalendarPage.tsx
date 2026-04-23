import React, { useState, useMemo } from "react";
import { useNavigate }               from "react-router-dom";
import { useAppData }                from "../context/AppDataContext";
import { useAuth }                   from "../context/AuthContext";

// ── Types ───────────────────────────────────────────────────
interface Task {
  id:          string;
  title:       string;
  status:      string;
  priority:    string;
  dueDate?:    string;
  projectId?:  string;
  assignee?:   string;
  createdAt?:  unknown;
  updatedAt?:  unknown;
  [key: string]: unknown;
}

interface Project {
  id:    string;
  name:  string;
  color: string;
  [key: string]: unknown;
}

// ── Constants ───────────────────────────────────────────────
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DAYS_SHORT = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

const PRIORITY_COLOR: Record<string, string> = {
  High:   "#ef4444",
  Medium: "#f97316",
  Low:    "#22c55e",
};

const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  "To Do":       { bg: "bg-slate-100",  text: "text-slate-600"  },
  "In Progress": { bg: "bg-blue-100",   text: "text-blue-700"   },
  "In Review":   { bg: "bg-amber-100",  text: "text-amber-700"  },
  "Done":        { bg: "bg-green-100",  text: "text-green-700"  },
};

// ── Helpers ─────────────────────────────────────────────────
function toDateStr(date: Date): string {
  return date.toISOString().split("T")[0];
}

function isOverdue(dueDate?: string, status?: string): boolean {
  if (!dueDate || status === "Done") return false;
  return new Date(dueDate) < new Date(new Date().toDateString());
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });
}

// ── Component ────────────────────────────────────────────────
export default function CalendarPage(): React.ReactElement {
  const { tasks, projects } = useAppData() as {
    tasks: Task[];
    projects: Project[];
  };
  const { user }    = useAuth();
  const navigate    = useNavigate();

  const today       = new Date();
  const todayStr    = toDateStr(today);

  const [currentYear,  setCurrentYear]  = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedDay,  setSelectedDay]  = useState<string | null>(todayStr);
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [statusFilter,  setStatusFilter]  = useState<string>("all");

  // ── Navigation ──────────────────────────────────────────
  function prevMonth() {
    if (currentMonth === 0) { setCurrentYear(y => y - 1); setCurrentMonth(11); }
    else setCurrentMonth(m => m - 1);
    setSelectedDay(null);
  }
  function nextMonth() {
    if (currentMonth === 11) { setCurrentYear(y => y + 1); setCurrentMonth(0); }
    else setCurrentMonth(m => m + 1);
    setSelectedDay(null);
  }

  // ── Filtered tasks ──────────────────────────────────────
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (projectFilter !== "all" && t.projectId !== projectFilter) return false;
      if (statusFilter  !== "all" && t.status    !== statusFilter)  return false;
      return true;
    });
  }, [tasks, projectFilter, statusFilter]);

  // ── Tasks for a specific date string ───────────────────
  function tasksForDate(dateStr: string): Task[] {
    return filteredTasks.filter((t) => t.dueDate === dateStr);
  }

  // ── Selected day tasks ─────────────────────────────────
  const selectedTasks = useMemo(
    () => (selectedDay ? tasksForDate(selectedDay) : []),
    [selectedDay, filteredTasks]
  );

  // ── Month summary stats ─────────────────────────────────
  const monthStats = useMemo(() => {
    const prefix = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`;
    const monthTasks = filteredTasks.filter(
      (t) => t.dueDate?.startsWith(prefix)
    );
    return {
      total:      monthTasks.length,
      completed:  monthTasks.filter((t) => t.status === "Done").length,
      overdue:    monthTasks.filter((t) => isOverdue(t.dueDate, t.status)).length,
      inProgress: monthTasks.filter((t) => t.status === "In Progress").length,
    };
  }, [filteredTasks, currentMonth, currentYear]);

  // ── Calendar grid cells ─────────────────────────────────
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth     = new Date(currentYear, currentMonth + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDayOfMonth).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  // ── Project lookup map ──────────────────────────────────
  const projectMap = useMemo(() => {
    const map: Record<string, Project> = {};
    projects.forEach((p) => { map[p.id] = p; });
    return map;
  }, [projects]);

  return (
    <div className="lg:ml-64 min-h-screen bg-gray-50 px-6 pt-6 pb-6 flex flex-col gap-5 w-full overflow-x-hidden">

      {/* ── Page Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            View and manage tasks by due date
          </p>
        </div>
        <button
          onClick={() => navigate("/my-tasks")}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700
                     text-white px-4 py-2.5 rounded-xl text-sm font-semibold
                     transition shadow-sm shadow-blue-200"
        >
          + Add Task
        </button>
      </div>

      {/* ── Filter Bar ── */}
      <div className="flex flex-wrap items-center gap-3 overflow-x-auto pb-1">
        {/* Project filter */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 font-medium">Project:</label>
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-1.5 text-sm
                       text-gray-700 bg-white focus:outline-none
                       focus:border-blue-400 transition"
          >
            <option value="all">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Status filter tabs */}
        <div className="flex gap-1.5">
          {["all", "To Do", "In Progress", "In Review", "Done"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium
                         transition border ${
                           statusFilter === s
                             ? "bg-blue-600 text-white border-blue-600"
                             : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
                         }`}
            >
              {s === "all" ? "All Status" : s}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="flex flex-col lg:flex-row gap-5 w-full min-w-0">

        {/* ── Calendar Grid ── */}
        <div className="flex-1 bg-white rounded-2xl shadow-sm border
                        border-gray-100 p-5 min-w-0 overflow-hidden">

          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-5">
            <button
              onClick={prevMonth}
              className="w-8 h-8 flex items-center justify-center rounded-xl
                         bg-gray-100 hover:bg-gray-200 text-gray-600
                         transition text-lg font-bold"
            >
              ‹
            </button>
            <h2 className="text-base font-bold text-gray-800">
              {MONTHS[currentMonth]} {currentYear}
            </h2>
            <button
              onClick={nextMonth}
              className="w-8 h-8 flex items-center justify-center rounded-xl
                         bg-gray-100 hover:bg-gray-200 text-gray-600
                         transition text-lg font-bold"
            >
              ›
            </button>
          </div>

          {/* Day Labels */}
          <div className="grid grid-cols-7 mb-2">
            {DAYS_SHORT.map((d) => (
              <div key={d}
                className="text-center text-xs font-semibold text-gray-400
                           py-1 uppercase tracking-wide">
                {d}
              </div>
            ))}
          </div>

          {/* Day Cells */}
          <div className="grid grid-cols-7 gap-1 w-full">
            {cells.map((day, idx) => {
              if (day === null) {
                return <div key={`empty-${idx}`} className="h-14" />;
              }

              const dateStr   = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const dayTasks  = tasksForDate(dateStr);
              const isToday   = dateStr === todayStr;
              const isSelected = selectedDay === dateStr;
              const hasOverdue = dayTasks.some(
                (t) => isOverdue(t.dueDate, t.status)
              );

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(
                    isSelected ? null : dateStr
                  )}
                  className={`relative h-14 w-full flex flex-col items-center
                    justify-start pt-1.5 rounded-xl text-sm font-medium
                    transition-all border ${
                      isSelected
                        ? "bg-blue-600 text-white border-blue-600 shadow-md"
                        : isToday
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : hasOverdue
                        ? "bg-red-50 text-red-700 border-red-100"
                        : "hover:bg-gray-50 text-gray-700 border-transparent"
                    }`}
                >
                  <span className={`text-sm font-semibold ${
                    isSelected ? "text-white" : ""
                  }`}>
                    {day}
                  </span>

                  {/* Task dots */}
                  {dayTasks.length > 0 && (
                    <div className="flex gap-0.5 mt-1 flex-wrap
                                    justify-center px-1">
                      {dayTasks.slice(0, 4).map((t) => (
                        <span
                          key={t.id}
                          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{
                            backgroundColor: isSelected
                              ? "#fff"
                              : (PRIORITY_COLOR[t.priority] ?? "#6366f1"),
                          }}
                          title={t.title}
                        />
                      ))}
                      {dayTasks.length > 4 && (
                        <span className={`text-[8px] font-bold ${
                          isSelected ? "text-white" : "text-gray-400"
                        }`}>
                          +{dayTasks.length - 4}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* ── Month Summary Stats ── */}
          <div className="mt-5 pt-4 border-t border-gray-100
                          grid grid-cols-4 gap-3">
            {[
              { label: "Due",        value: monthStats.total,      color: "text-gray-700",  bg: "bg-gray-100"   },
              { label: "Completed",  value: monthStats.completed,  color: "text-green-700", bg: "bg-green-100"  },
              { label: "Overdue",    value: monthStats.overdue,    color: "text-red-700",   bg: "bg-red-100"    },
              { label: "In Progress",value: monthStats.inProgress, color: "text-blue-700",  bg: "bg-blue-100"   },
            ].map((s) => (
              <div key={s.label}
                className={`${s.bg} rounded-xl p-3 text-center`}>
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                <p className={`text-[10px] font-medium ${s.color} opacity-80`}>
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Side Panel ── */}
        <div className="w-full lg:w-80 flex-shrink-0 flex flex-col gap-4">

          {/* Selected day header */}
          <div className="bg-white rounded-2xl shadow-sm border
                          border-gray-100 p-5">
            {selectedDay ? (
              <>
                <h3 className="text-sm font-bold text-gray-800 mb-0.5">
                  {formatDate(selectedDay)}
                </h3>
                <p className="text-xs text-gray-400">
                  {selectedTasks.length === 0
                    ? "No tasks due on this day"
                    : `${selectedTasks.length} task${selectedTasks.length > 1 ? "s" : ""} due`}
                </p>
              </>
            ) : (
              <div className="flex flex-col items-center py-4 gap-2">
                <span className="text-4xl">👆</span>
                <p className="text-sm font-medium text-gray-500 text-center">
                  Click any day to see tasks due on that date
                </p>
                <p className="text-xs text-gray-400 text-center">
                  Colored dots indicate task priority
                </p>
              </div>
            )}
          </div>

          {/* Task cards for selected day */}
          {selectedDay && (
            <div className="flex flex-col gap-3 max-h-[420px]
                            overflow-y-auto pr-1">
              {selectedTasks.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm border
                                border-gray-100 p-6 flex flex-col
                                items-center gap-2">
                  <span className="text-3xl">📭</span>
                  <p className="text-sm text-gray-400 text-center">
                    No tasks due on this day
                  </p>
                  <button
                    onClick={() => navigate("/my-tasks")}
                    className="text-xs text-blue-600 font-medium
                               hover:underline mt-1"
                  >
                    + Add a task
                  </button>
                </div>
              ) : (
                selectedTasks.map((task) => {
                  const proj    = task.projectId
                    ? projectMap[task.projectId]
                    : null;
                  const over    = isOverdue(task.dueDate, task.status);
                  const stStyle = STATUS_STYLE[task.status] ??
                    { bg: "bg-gray-100", text: "text-gray-600" };

                  return (
                    <div
                      key={task.id}
                      className={`bg-white rounded-2xl shadow-sm border p-4
                        flex flex-col gap-2.5 transition ${
                          over
                            ? "border-red-200 bg-red-50"
                            : "border-gray-100"
                        }`}
                    >
                      {/* Task title + overdue badge */}
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-gray-800
                                     leading-snug">
                          {task.title}
                        </p>
                        {over && (
                          <span className="text-[10px] bg-red-100 text-red-600
                                           px-1.5 py-0.5 rounded-full
                                           font-medium flex-shrink-0">
                            Overdue
                          </span>
                        )}
                      </div>

                      {/* Status + Priority */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full
                          font-medium ${stStyle.bg} ${stStyle.text}`}>
                          {task.status}
                        </span>
                        <div className="flex items-center gap-1">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{
                              backgroundColor:
                                PRIORITY_COLOR[task.priority] ?? "#94a3b8",
                            }}
                          />
                          <span className="text-[10px] text-gray-500 font-medium">
                            {task.priority}
                          </span>
                        </div>
                      </div>

                      {/* Project tag */}
                      {proj && (
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: proj.color }}
                          />
                          <span className="text-[10px] text-gray-500 truncate">
                            {proj.name}
                          </span>
                        </div>
                      )}

                      {/* Assignee */}
                      {task.assignee &&
                        task.assignee !== "Unassigned" && (
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-violet-500
                                          flex items-center justify-center
                                          text-white text-[9px] font-bold
                                          flex-shrink-0">
                            {task.assignee.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-[10px] text-gray-500 truncate">
                            {task.assignee}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ── Priority Legend ── */}
          <div className="bg-white rounded-2xl shadow-sm border
                          border-gray-100 p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase
                          tracking-wide mb-3">
              Priority Legend
            </p>
            <div className="flex flex-col gap-2">
              {Object.entries(PRIORITY_COLOR).map(([label, color]) => (
                <div key={label} className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-xs text-gray-600 font-medium">
                    {label} Priority
                  </span>
                </div>
              ))}
              <div className="flex items-center gap-2 mt-1 pt-2
                              border-t border-gray-100">
                <span className="w-3 h-3 rounded-xl border-2
                                 border-red-300 bg-red-50 flex-shrink-0" />
                <span className="text-xs text-red-500 font-medium">
                  Overdue Day
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-xl bg-blue-100
                                 border-2 border-blue-300 flex-shrink-0" />
                <span className="text-xs text-blue-600 font-medium">
                  Today
                </span>
              </div>
            </div>
          </div>

          {/* ── This Month projects active ── */}
          {projects.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border
                            border-gray-100 p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase
                            tracking-wide mb-3">
                Active Projects
              </p>
              <div className="flex flex-col gap-2">
                {projects.map((proj) => {
                  const projTasksThisMonth = tasks.filter(
                    (t) =>
                      t.projectId === proj.id &&
                      t.dueDate?.startsWith(
                        `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`
                      )
                  );
                  return (
                    <div
                      key={proj.id}
                      className="flex items-center justify-between
                                 cursor-pointer hover:bg-gray-50 rounded-xl
                                 px-2 py-1.5 transition"
                      onClick={() => {
                        setProjectFilter(
                          projectFilter === proj.id ? "all" : proj.id
                        );
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: proj.color }}
                        />
                        <span className="text-xs text-gray-700 font-medium
                                         truncate max-w-[140px]">
                          {proj.name}
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-400 font-medium">
                        {projTasksThisMonth.length} task
                        {projTasksThisMonth.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
