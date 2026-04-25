import React, { useState, useMemo } from "react";
import { useAppData } from "../context/AppDataContext";
import { useNavigate } from "react-router-dom";
import { getOverdueTasks } from "../utils/overdueUtils";
import { 
  FolderKanban, Zap, CheckCircle, PauseCircle,
  Search, AlertTriangle, ClipboardList, FolderOpen
} from "lucide-react";
import NewProjectModal from "../components/CreateProjectModal";

const fmtDate = (d: string) => {
  if (!d) return "";
  return new Date(d + "T12:00:00").toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
};

const toMs = (v: any): number => {
  if (!v) return 0;
  if (typeof v?.toMillis === "function") return v.toMillis();
  if (typeof v?.seconds === "number") return v.seconds * 1000;
  return new Date(v).getTime();
};

const getStatusColor = (status: string) => {
  const s = (status || "active").toLowerCase();
  if (s === "completed" || s === "done") return "bg-emerald-100 text-emerald-700";
  if (s === "planning") return "bg-blue-100 text-blue-700";
  if (s === "on-hold" || s === "on hold") return "bg-orange-100 text-orange-700";
  return "bg-green-100 text-green-700"; // Active
};

const getPriorityColor = (priority: string) => {
  const p = (priority || "Low").toLowerCase();
  if (p === "high") return "bg-red-100 text-red-700";
  if (p === "medium") return "bg-orange-100 text-orange-700";
  return "bg-slate-100 text-slate-600";
};

const getStatusDot = (status: string) => {
  const s = (status || "active").toLowerCase();
  if (s === "completed" || s === "done") return "#10b981"; // emerald-500
  if (s === "planning") return "#3b82f6"; // blue-500
  if (s === "on-hold" || s === "on hold") return "#f97316"; // orange-500
  return "#8b5cf6"; // violet-500 for active
};

export default function ProjectsPage() {
  const { projects, tasks } = useAppData();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [showCreateProject, setShowCreateProject] = useState(false);

  const overdueTasks = useMemo(() => getOverdueTasks(tasks), [tasks]);
  const overdueIds = useMemo(() => new Set(overdueTasks.map((t: any) => t.id)), [overdueTasks]);

  // Derived stats
  const totalCount = projects.length;
  const activeCount = projects.filter(p => (p.status || "active").toLowerCase() === "active").length;
  const completedCount = projects.filter(p => (p.status || "active").toLowerCase() === "completed").length;
  const onHoldCount = projects.filter(p => {
    const s = (p.status || "active").toLowerCase();
    return s === "on-hold" || s === "on hold" || s === "planning";
  }).length;
  const planningCount = projects.filter(p => (p.status || "active").toLowerCase() === "planning").length;

  const STAT_CARDS = [
    { label: "Total Projects", value: totalCount, icon: FolderKanban, color: "text-violet-600", bg: "bg-violet-100" },
    { label: "Active Projects", value: activeCount, icon: Zap, color: "text-blue-600", bg: "bg-blue-100" },
    { label: "Completed Projects", value: completedCount, icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-100" },
    { label: "On Hold", value: onHoldCount, icon: PauseCircle, color: "text-orange-600", bg: "bg-orange-100" },
  ];

  const filteredProjects = useMemo(() => {
    return projects.filter((p: any) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = (p.name || "").toLowerCase().includes(q) || (p.description || "").toLowerCase().includes(q);
      const s = (p.status || "active").toLowerCase();
      
      let matchesStatus = true;
      if (filterStatus !== "All") {
        if (filterStatus === "On Hold") {
          matchesStatus = s === "on-hold" || s === "on hold";
        } else {
          matchesStatus = s === filterStatus.toLowerCase();
        }
      }

      return matchesSearch && matchesStatus;
    });
  }, [projects, searchQuery, filterStatus]);

  const STATUS_FILTERS = ["All", "Active", "Planning", "On Hold", "Completed"];

  // Infographic Data - Status Donut
  const activePct = totalCount ? (activeCount / totalCount) * 100 : 0;
  const completedPct = totalCount ? (completedCount / totalCount) * 100 : 0;
  const planningPct = totalCount ? (planningCount / totalCount) * 100 : 0;
  const holdCountOnly = projects.filter(p => {
    const s = (p.status || "active").toLowerCase();
    return s === "on-hold" || s === "on hold";
  }).length;
  const holdPct = totalCount ? (holdCountOnly / totalCount) * 100 : 0;

  let acc = 0;
  const activeDash = `${activePct} 100`; acc += activePct;
  const completedDash = `${completedPct} 100`; const completedOffset = 100 - (acc - completedPct); acc += completedPct;
  const planningDash = `${planningPct} 100`; const planningOffset = 100 - (acc - planningPct); acc += planningPct;
  const holdDash = `${holdPct} 100`; const holdOffset = 100 - (acc - holdPct);

  // Infographic Data - Tasks Priority Breakdown
  const highTasks = tasks.filter(t => (t.priority || "").toLowerCase() === "high").length;
  const mediumTasks = tasks.filter(t => (t.priority || "").toLowerCase() === "medium").length;
  const lowTasks = tasks.filter(t => (t.priority || "").toLowerCase() === "low").length;
  const totalTasks = highTasks + mediumTasks + lowTasks || 1; // avoid / 0

  // Infographic Data - Recent Activity
  const recentTasks = [...tasks]
    .filter(t => t.createdAt || t.updatedAt)
    .sort((a, b) => toMs(b.updatedAt || b.createdAt) - toMs(a.updatedAt || a.createdAt))
    .slice(0, 5);

  return (
    <div className="ml-0 bg-[#f4f5f7] min-h-screen overflow-y-auto">
      <div className="max-w-6xl mx-auto px-6 pt-14 pb-10">
        
        {/* SECTION 1 — PAGE HEADER */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
              Projects
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">
              Manage and track all your projects
            </p>
          </div>
          <button
            onClick={() => setShowCreateProject(true)}
            className="bg-violet-600 text-white hover:bg-violet-700 px-4 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm"
          >
            + New Project
          </button>
        </div>

        {/* SECTION 2 — STAT CARDS STRIP */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {STAT_CARDS.map(card => (
            <div key={card.label} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${card.bg} ${card.color}`}>
                <card.icon size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{card.value}</p>
                <p className="text-xs text-slate-400">{card.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* SECTION 3 — SEARCH AND FILTER BAR */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div className="flex flex-col md:flex-row md:items-center gap-4 flex-1">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all shadow-sm text-slate-800"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {STATUS_FILTERS.map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`text-xs px-4 py-2 rounded-full font-medium transition-colors ${
                    filterStatus === status
                      ? "bg-violet-600 text-white shadow-sm"
                      : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs text-slate-400 flex-shrink-0">
            Showing {filteredProjects.length} of {totalCount} projects
          </p>
        </div>

        {/* SECTION 4 — MAIN CONTENT */}
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          
          {/* LEFT COLUMN — PROJECT CARDS GRID */}
          <div className="flex-1 w-full flex flex-col gap-4">
            {filteredProjects.length > 0 ? (
              filteredProjects.map((p: any) => {
                const projectTasks = tasks.filter(t => t.projectId === p.id);
                const completedTasks = projectTasks.filter(t => {
                  const st = (t.status || "").toLowerCase();
                  return st === "done" || st === "completed";
                });
                const progress = projectTasks.length > 0 
                  ? Math.round((completedTasks.length / projectTasks.length) * 100) 
                  : 0;
                const overdueCount = projectTasks.filter(t => overdueIds.has(t.id)).length;

                return (
                  <div
                    key={p.id}
                    onClick={() => navigate(`/projects/${p.id}`)}
                    className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-all cursor-pointer flex flex-col gap-3 group"
                  >
                    {/* Top row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm"
                          style={{ backgroundColor: p.color || "#8b5cf6" }}
                        >
                          {(p.name?.[0] || "?").toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 group-hover:text-violet-600 transition-colors">
                            {p.name}
                          </p>
                          {p.code && <p className="text-xs text-slate-400 mt-0.5">{p.code}</p>}
                          <span className={`inline-block mt-0.5 text-[10px] px-2 py-0.5 rounded-full font-medium ${getStatusColor(p.status)} capitalize`}>
                            {p.status || "Active"}
                          </span>
                        </div>
                      </div>
                      <span className={`text-[10px] px-2 py-1 rounded-full font-medium ${getPriorityColor(p.priority)} capitalize`}>
                        {p.priority || "Low"}
                      </span>
                    </div>

                    {/* Second row */}
                    <p className="text-sm text-slate-400 truncate">
                      {p.description || "No description"}
                    </p>

                    {/* Third row — Progress bar */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs text-slate-400">Progress</span>
                        <span className="text-xs font-semibold text-slate-600">{progress}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${progress}%`, backgroundColor: p.color || "#8b5cf6" }}
                        />
                      </div>
                    </div>

                    {/* Fourth row — Stats */}
                    <div className="flex items-center justify-between mt-1 pt-3 border-t border-slate-50">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <ClipboardList size={14} />
                          <span className="text-xs font-medium">{projectTasks.length} tasks</span>
                        </div>
                        {overdueCount > 0 && (
                          <div className="flex items-center gap-1.5 text-red-500">
                            <AlertTriangle size={14} />
                            <span className="text-xs font-medium">{overdueCount} overdue</span>
                          </div>
                        )}
                      </div>
                      {p.dueDate && (
                        <p className="text-xs text-slate-400">
                          Due {fmtDate(p.dueDate)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-20 flex flex-col items-center justify-center bg-white border border-slate-200 rounded-2xl border-dashed">
                <FolderOpen className="text-slate-300 mb-3" size={48} strokeWidth={1} />
                <h3 className="text-sm font-medium text-slate-800 mb-1">
                  No projects found
                </h3>
                <p className="text-xs text-slate-400 text-center max-w-sm">
                  We couldn't find any projects matching your criteria. Try adjusting your filters.
                </p>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN — INFOGRAPHICS PANEL */}
          <div className="w-full lg:w-72 flex-none flex flex-col gap-4">
            
            {/* Card 1 — Status Overview */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-slate-800 mb-4">Status Overview</h3>
              {totalCount > 0 ? (
                <>
                  <div className="flex justify-center mb-6">
                    <svg width="120" height="120" viewBox="0 0 36 36" className="transform -rotate-90">
                      <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#f1f5f9" strokeWidth="4" />
                      <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#8b5cf6" strokeWidth="4" strokeDasharray={activeDash} strokeDashoffset="100" />
                      {completedPct > 0 && <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#10b981" strokeWidth="4" strokeDasharray={completedDash} strokeDashoffset={completedOffset} />}
                      {planningPct > 0 && <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#3b82f6" strokeWidth="4" strokeDasharray={planningDash} strokeDashoffset={planningOffset} />}
                      {holdPct > 0 && <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#f97316" strokeWidth="4" strokeDasharray={holdDash} strokeDashoffset={holdOffset} />}
                    </svg>
                  </div>
                  <div className="space-y-3">
                    {[
                      { label: "Active", count: activeCount, color: "#8b5cf6" },
                      { label: "Completed", count: completedCount, color: "#10b981" },
                      { label: "Planning", count: planningCount, color: "#3b82f6" },
                      { label: "On Hold", count: holdCountOnly, color: "#f97316" },
                    ].map(item => (
                      <div key={item.label} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-slate-600">{item.label}</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="font-semibold text-slate-800">{item.count}</span>
                          <span className="text-slate-400 w-8 text-right">{Math.round(totalCount ? (item.count / totalCount) * 100 : 0)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-xs text-slate-400 text-center py-6">No project data</p>
              )}
            </div>

            {/* Card 2 — Priority Breakdown */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-slate-800 mb-4">Priority Breakdown</h3>
              <div className="space-y-4">
                {[
                  { label: "High", count: highTasks, color: "bg-red-500", total: totalTasks },
                  { label: "Medium", count: mediumTasks, color: "bg-orange-400", total: totalTasks },
                  { label: "Low", count: lowTasks, color: "bg-green-500", total: totalTasks },
                ].map(item => {
                  const pct = Math.round((item.count / item.total) * 100) || 0;
                  return (
                    <div key={item.label}>
                      <div className="flex items-center justify-between mb-1.5 text-xs">
                        <span className="text-slate-600 font-medium">{item.label}</span>
                        <span className="font-semibold text-slate-800">{item.count}</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden flex">
                        <div className={`h-full ${item.color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Card 3 — Recent Activity */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-slate-800 mb-4">Recent Activity</h3>
              {recentTasks.length > 0 ? (
                <div className="space-y-4">
                  {recentTasks.map(t => {
                    const pName = projects.find(p => p.id === t.projectId)?.name || "No Project";
                    return (
                      <div key={t.id} className="flex gap-3">
                        <div className="mt-1 w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: getStatusDot(t.status) }} />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-slate-800 truncate">{t.title}</p>
                          <p className="text-[10px] text-slate-400 truncate mt-0.5">{pName}</p>
                        </div>
                        <span className="text-[10px] text-slate-400 flex-shrink-0">
                          {t.updatedAt ? "updated" : "new"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-400 text-center py-6">No recent activity</p>
              )}
            </div>

          </div>
        </div>
      </div>

      {showCreateProject && (
        <NewProjectModal onClose={() => setShowCreateProject(false)} />
      )}
    </div>
  );
}
