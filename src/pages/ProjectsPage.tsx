import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAppData } from "../context/AppDataContext";
import CreateProjectModal from "../components/CreateProjectModal";
import { getOverdueTasks } from "../utils/overdueUtils";

const fmtDate = (d: string) =>
  new Date(d + "T12:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

export default function ProjectsPage() {
  const { projects, tasks } = useAppData();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [showCreateProject, setShowCreateProject] = useState(false);

  const now = new Date();
  
  // Real-time overdue check
  const overdueTasks = useMemo(() => getOverdueTasks(tasks), [tasks]);
  const overdueIds = useMemo(() => new Set(overdueTasks.map((t: any) => t.id)), [overdueTasks]);

  const filteredProjects = useMemo(() => {
    return projects.filter((p: any) => {
      // Name search
      const matchesSearch = p.name?.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Status filter
      const pStatus = (p.status || "active").toLowerCase();
      let matchesStatus = true;
      if (filterStatus !== "All") {
        matchesStatus = pStatus === filterStatus.toLowerCase();
      }

      return matchesSearch && matchesStatus;
    });
  }, [projects, searchQuery, filterStatus]);

  const STATUS_FILTERS = ["All", "Active", "Planning", "On Hold", "Completed"];

  return (
    <div className="ml-0 bg-[#f4f5f7] min-h-screen overflow-y-auto">
      <div className="max-w-6xl mx-auto px-6 pt-14 pb-10">
        
        {/* ── Header ── */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              All Projects
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Manage and track all your projects
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowCreateProject(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
          >
            + New Project
          </button>
        </div>

        {/* ── Filters & Search ── */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
          <div className="flex flex-wrap items-center gap-2">
            {STATUS_FILTERS.map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`text-xs px-4 py-2 rounded-full font-medium transition-colors ${
                  filterStatus === status
                    ? "bg-violet-600 text-white shadow-sm"
                    : "bg-white border border-gray-200 text-gray-500 hover:bg-gray-50"
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          <div className="w-full md:w-64 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              🔍
            </span>
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/30 focus:border-violet-400 transition-all shadow-sm"
            />
          </div>
        </div>

        {/* ── Project Count Summary ── */}
        <div className="mb-4">
          <p className="text-xs font-medium text-gray-500">
            Showing {filteredProjects.length} of {projects.length} projects
          </p>
        </div>

        {/* ── Grid ── */}
        {filteredProjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProjects.map((p: any) => {
              const pt = tasks.filter((t: any) => t.projectId === p.id);
              const done = pt.filter((t: any) => t.status === "Done").length;
              const pct = pt.length > 0 ? Math.round((done / pt.length) * 100) : 0;
              const over = pt.filter((t: any) => overdueIds.has(t.id)).length;
              
              return (
                <div
                  key={p.id}
                  onClick={() => navigate(`/projects/${p.id}`)}
                  className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 cursor-pointer hover:shadow-md hover:border-blue-200 transition-all group"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                      style={{ backgroundColor: p.color ?? "#3b82f6" }}
                    >
                      {p.name[0]?.toUpperCase() || "?"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-800 truncate group-hover:text-blue-600 transition-colors">
                        {p.name}
                      </p>
                      <p className="text-[10px] text-gray-400 capitalize">
                        {p.status ?? "active"}
                      </p>
                    </div>
                  </div>

                  {p.description && (
                    <p className="text-xs text-gray-400 mb-3 truncate">
                      {p.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] text-gray-400">Progress</span>
                    <span className="text-[10px] font-semibold text-gray-600">
                      {pct}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 rounded-full mb-3">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: p.color ?? "#3b82f6" }}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      <span className="text-[10px] text-gray-500">
                        📋 {pt.length} tasks
                      </span>
                      {over > 0 && (
                        <span className="text-[10px] text-red-500">
                          ⚠️ {over} overdue
                        </span>
                      )}
                    </div>
                    {p.priority && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                        p.priority === "High"   ? "bg-red-100 text-red-500"
                        : p.priority === "Medium" ? "bg-amber-100 text-amber-600"
                        :                           "bg-gray-100 text-gray-500"
                      }`}>
                        {p.priority}
                      </span>
                    )}
                  </div>

                  {p.dueDate && (
                    <p className="text-[10px] text-gray-400 mt-2">
                      📅 Due {fmtDate(p.dueDate)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-20 flex flex-col items-center justify-center">
            <div className="text-4xl mb-3 text-gray-300">📁</div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">
              No projects found
            </h3>
            <p className="text-sm text-gray-500 text-center max-w-sm">
              We couldn't find any projects matching your search or filter.
            </p>
          </div>
        )}
      </div>

      {showCreateProject && (
        <CreateProjectModal onClose={() => setShowCreateProject(false)} />
      )}
    </div>
  );
}
