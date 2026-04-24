import React, { useState, useMemo } from "react";
import { useAppData } from "../context/AppDataContext";
import { useNavigate } from "react-router-dom";

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  projectId?: string;
  assignee?: string;
  dueDate?: string;
}

interface Project {
  id: string;
  name: string;
  color?: string;
}

const PRIORITY_DOT: Record<string, string> = {
  high: "bg-red-500",
  medium: "bg-orange-400",
  low: "bg-green-500",
};

const PROJECT_COLORS = [
  "#8b5cf6","#3b82f6","#10b981","#f59e0b",
  "#ef4444","#ec4899","#06b6d4","#84cc16",
];

const DAYS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

function isOverdue(task: Task): boolean {
  if (!task.dueDate || task.status === "completed") return false;
  return new Date(task.dueDate) < new Date(new Date().toDateString());
}

function dateKey(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
}

export default function CalendarPage() {
  const { tasks = [], projects = [] } = useAppData() as {
    tasks: Task[];
    projects: Project[];
  };
  const navigate = useNavigate();

  const today = new Date();
  const [viewYear,      setViewYear]      = useState(today.getFullYear());
  const [viewMonth,     setViewMonth]     = useState(today.getMonth());
  const [selectedDay,   setSelectedDay]   = useState<number | null>(today.getDate());
  const [filterProject, setFilterProject] = useState("all");
  const [filterStatus,  setFilterStatus]  = useState("all");
  const [sidePanelOpen, setSidePanelOpen] = useState(true);

  const projectColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    projects.forEach((p, i) => {
      map[p.id] = p.color || PROJECT_COLORS[i % PROJECT_COLORS.length];
    });
    return map;
  }, [projects]);

  const filteredTasks = useMemo(() => tasks.filter((t) => {
    if (filterProject !== "all" && t.projectId !== filterProject) return false;
    if (filterStatus === "completed" && t.status !== "completed")  return false;
    if (filterStatus === "active"    && t.status === "completed")  return false;
    if (filterStatus === "overdue"   && !isOverdue(t))             return false;
    return true;
  }), [tasks, filterProject, filterStatus]);

  const tasksByDate = useMemo(() => {
    const map: Record<string, Task[]> = {};
    filteredTasks.forEach((t) => {
      if (!t.dueDate) return;
      const key = t.dueDate.slice(0, 10);
      if (!map[key]) map[key] = [];
      map[key].push(t);
    });
    return map;
  }, [filteredTasks]);

  const firstDay    = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const selectedKey   = selectedDay ? dateKey(viewYear, viewMonth, selectedDay) : "";
  const selectedTasks = selectedDay ? (tasksByDate[selectedKey] || []) : [];

  const monthTasks = useMemo(() => filteredTasks.filter((t) => {
    if (!t.dueDate) return false;
    const d = new Date(t.dueDate);
    return d.getFullYear() === viewYear && d.getMonth() === viewMonth;
  }), [filteredTasks, viewYear, viewMonth]);

  const summaryCompleted  = monthTasks.filter((t) => t.status === "completed").length;
  const summaryOverdue    = monthTasks.filter(isOverdue).length;
  const summaryInProgress = monthTasks.filter(
    (t) => t.status === "in-progress" || t.status === "active"
  ).length;

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
    setSelectedDay(null);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
    setSelectedDay(null);
  }

  return (
    <div className="ml-0 bg-[#f4f5f7] min-h-screen overflow-y-auto">

      {/* ── ONLY THIS LINE CHANGED: max-w-6xl replaces max-w-[1400px], removed pl-8 ── */}
      <div className="max-w-6xl mx-auto px-6 pt-14 pb-10">

        {/* ── PAGE HEADER ── */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Calendar</h1>
            <p className="text-sm text-slate-400 mt-0.5">View and manage tasks by due date</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={filterProject}
              onChange={(e) => setFilterProject(e.target.value)}
              className="text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-600 focus:outline-none focus:border-violet-400 cursor-pointer shadow-sm"
            >
              <option value="all">All Projects</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-600 focus:outline-none focus:border-violet-400 cursor-pointer shadow-sm"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="overdue">Overdue</option>
            </select>
            <button
              onClick={() => setSidePanelOpen((v) => !v)}
              className="text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
            >
              {sidePanelOpen ? "Hide Panel" : "Show Panel"}
            </button>
          </div>
        </div>

        {/* ── STATUS FILTER TABS ── */}
        <div className="mb-4 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-400 font-medium mr-1">Status:</span>
          {["all","todo","active","completed","overdue"].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors capitalize ${
                filterStatus === s
                  ? "bg-violet-600 text-white shadow-sm"
                  : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"
              }`}
            >
              {s === "all" ? "All Status"
                : s === "todo" ? "To Do"
                : s === "active" ? "In Progress"
                : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        {/* ── MONTH NAVIGATION ── */}
        <div className="mb-4 flex items-center justify-between bg-white rounded-2xl px-6 py-3 border border-slate-200 shadow-sm">
          <button
            onClick={prevMonth}
            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors text-lg"
          >‹</button>
          <h2 className="text-base font-semibold text-slate-700">
            {MONTHS[viewMonth]} {viewYear}
          </h2>
          <button
            onClick={nextMonth}
            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors text-lg"
          >›</button>
        </div>

        {/* ── MAIN BODY: GRID + SIDE PANEL ── */}
        <div className="flex gap-4 items-start">

          {/* ── CALENDAR GRID ── */}
          <div className="flex-1 min-w-0 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

            {/* Day-of-week headers */}
            <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50">
              {DAYS.map((d) => (
                <div key={d} className="text-center text-xs font-semibold text-slate-400 uppercase tracking-wider py-3">
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar week rows */}
            <div className="flex flex-col">
              {Array.from({ length: cells.length / 7 }, (_, wi) => (
                <div key={wi} className="grid grid-cols-7 border-b border-slate-100 last:border-b-0">
                  {cells.slice(wi * 7, wi * 7 + 7).map((day, ci) => {
                    if (!day) return (
                      <div
                        key={`e-${wi}-${ci}`}
                        className="h-24 border-r border-slate-100 last:border-r-0 bg-slate-50/40"
                      />
                    );

                    const key        = dateKey(viewYear, viewMonth, day);
                    const dayTasks   = tasksByDate[key] || [];
                    const isToday    = day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
                    const isSelected = day === selectedDay;
                    const hasOverdue = dayTasks.some(isOverdue);

                    return (
                      <button
                        key={day}
                        onClick={() => setSelectedDay(day)}
                        className={[
                          "h-24 flex flex-col items-start p-2 border-r border-slate-100 last:border-r-0 transition-all text-left w-full overflow-hidden",
                          isSelected   ? "bg-violet-50 ring-2 ring-inset ring-violet-400"
                          : isToday    ? "bg-blue-50"
                          : hasOverdue ? "bg-red-50 hover:bg-red-100/50"
                          :              "bg-white hover:bg-slate-50",
                        ].join(" ")}
                      >
                        {/* Day number */}
                        <div className="flex items-center justify-between w-full mb-1">
                          <span className={[
                            "text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full",
                            isToday
                              ? "bg-blue-600 text-white"
                              : isSelected
                              ? "text-violet-700 font-bold"
                              : "text-slate-600",
                          ].join(" ")}>
                            {day}
                          </span>
                          {dayTasks.length > 0 && (
                            <span className="text-[9px] text-slate-400 font-medium">
                              {dayTasks.length}
                            </span>
                          )}
                        </div>

                        {/* Priority dots */}
                        {dayTasks.length > 0 && (
                          <div className="flex flex-wrap gap-0.5">
                            {dayTasks.slice(0, 3).map((t) => (
                              <span
                                key={t.id}
                                className={`w-1.5 h-1.5 rounded-full flex-none ${
                                  isOverdue(t) ? "bg-red-500" : PRIORITY_DOT[t.priority?.toLowerCase()] || "bg-slate-400"
                                }`}
                              />
                            ))}
                            {dayTasks.length > 3 && (
                              <span className="text-[8px] text-slate-400 leading-none">+{dayTasks.length - 3}</span>
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* ── SUMMARY STRIP ── */}
            <div className="border-t border-slate-200 bg-slate-50 px-6 py-3 flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-6">
                {[
                  { label: "Due This Month", value: monthTasks.length,   color: "text-violet-600" },
                  { label: "Completed",      value: summaryCompleted,    color: "text-emerald-600" },
                  { label: "Overdue",        value: summaryOverdue,      color: "text-red-500" },
                  { label: "In Progress",    value: summaryInProgress,   color: "text-blue-600" },
                ].map((s) => (
                  <div key={s.label} className="flex items-center gap-1.5">
                    <span className={`text-lg font-bold ${s.color}`}>{s.value}</span>
                    <span className="text-xs text-slate-400">{s.label}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4 flex-wrap">
                <span className="text-xs text-slate-400 font-medium">Legend:</span>
                {[
                  { label: "High",    cls: "bg-red-500" },
                  { label: "Medium",  cls: "bg-orange-400" },
                  { label: "Low",     cls: "bg-green-500" },
                  { label: "Overdue", cls: "bg-red-300" },
                  { label: "Today",   cls: "bg-blue-600" },
                ].map((leg) => (
                  <div key={leg.label} className="flex items-center gap-1">
                    <span className={`w-2 h-2 rounded-full ${leg.cls}`} />
                    <span className="text-xs text-slate-400">{leg.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── SIDE PANEL ── */}
          {sidePanelOpen && (
            <div className="flex-none w-72 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">

              {/* Header */}
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
                <h3 className="text-sm font-semibold text-slate-700">
                  {selectedDay ? `${MONTHS[viewMonth]} ${selectedDay}, ${viewYear}` : "Select a day"}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selectedTasks.length} task{selectedTasks.length !== 1 ? "s" : ""} scheduled
                </p>
              </div>

              {/* Task list */}
              <div className="overflow-y-auto max-h-[520px] px-4 py-3 space-y-2">
                {selectedTasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-center gap-2">
                    <div className="text-3xl">📅</div>
                    <p className="text-xs text-slate-400">
                      {selectedDay ? "No tasks due on this day" : "Click a day to view tasks"}
                    </p>
                  </div>
                ) : (
                  selectedTasks.map((task) => {
                    const proj      = projects.find((p) => p.id === task.projectId);
                    const projColor = proj ? projectColorMap[proj.id] || "#8b5cf6" : "#8b5cf6";
                    const overdue   = isOverdue(task);

                    return (
                      <div
                        key={task.id}
                        onClick={() => navigate("/my-tasks")}
                        className="bg-white rounded-xl p-3 border border-slate-200 hover:border-violet-300 hover:shadow-sm transition-all cursor-pointer"
                      >
                        <div className="flex items-start gap-2">
                          <span className={`mt-1 w-2 h-2 rounded-full flex-none ${
                            overdue ? "bg-red-500" : PRIORITY_DOT[task.priority?.toLowerCase()] || "bg-slate-400"
                          }`} />
                          <p className="text-xs font-medium text-slate-700 leading-snug line-clamp-2">{task.title}</p>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${
                            overdue
                              ? "bg-red-100 text-red-600"
                              : task.status === "completed"
                              ? "bg-emerald-100 text-emerald-600"
                              : "bg-slate-100 text-slate-500"
                          }`}>
                            {overdue ? "Overdue" : task.status || "Todo"}
                          </span>
                          {task.priority && (
                            <span className="text-[10px] text-slate-400 font-medium capitalize">{task.priority}</span>
                          )}
                        </div>
                        {proj && (
                          <div className="mt-2 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full flex-none" style={{ backgroundColor: projColor }} />
                            <span className="text-[10px] text-slate-400 truncate">{proj.name}</span>
                          </div>
                        )}
                        {task.assignee && (
                          <div className="mt-1.5 flex items-center gap-1.5">
                            <div className="w-4 h-4 rounded-full bg-violet-100 border border-violet-200 flex items-center justify-center flex-none">
                              <span className="text-[8px] text-violet-600 font-bold">{task.assignee[0]?.toUpperCase()}</span>
                            </div>
                            <span className="text-[10px] text-slate-400 truncate">{task.assignee}</span>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Active projects footer */}
              {projects.length > 0 && (
                <div className="border-t border-slate-200 px-5 py-4 bg-slate-50">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Active Projects</p>
                  <div className="space-y-1.5 max-h-28 overflow-y-auto">
                    {projects.map((p, i) => (
                      <div key={p.id} className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full flex-none" style={{ backgroundColor: p.color || PROJECT_COLORS[i % PROJECT_COLORS.length] }} />
                        <span className="text-xs text-slate-600 truncate">{p.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
