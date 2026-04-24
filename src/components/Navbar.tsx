/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, Bell, HelpCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAppData } from '../context/AppDataContext';
import { useNavigate } from 'react-router-dom';

interface NavbarProps {
  title?: string;
}

const PRIORITY_COLOR: Record<string, string> = {
  high: "bg-red-500",
  medium: "bg-orange-400",
  low: "bg-green-500",
};

export default function Navbar({ title = "Overview" }: NavbarProps) {
  const { user } = useAuth();
  const { tasks = [], projects = [] } = useAppData() as any;
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside or Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const filteredTasks = useMemo(() => {
    if (query.length < 2) return [];
    const q = query.toLowerCase();
    return tasks.filter((t: any) =>
      t.title?.toLowerCase().includes(q) ||
      t.status?.toLowerCase().includes(q) ||
      t.priority?.toLowerCase().includes(q)
    );
  }, [query, tasks]);

  const filteredProjects = useMemo(() => {
    if (query.length < 2) return [];
    const q = query.toLowerCase();
    return projects.filter((p: any) =>
      p.name?.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q)
    );
  }, [query, projects]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setIsOpen(val.length >= 2);
  };

  return (
    <header className="h-16 flex items-center justify-between px-8 bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="flex items-center gap-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">{title}</h1>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="font-mono">SLV-882</span>
            <span className="text-slate-300">/</span>
            <span>Workspace</span>
            <span className="text-slate-300">/</span>
            <span>Projects</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div ref={containerRef} className="hidden md:flex relative group w-64">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-violet-500 transition-colors"
            size={18}
          />
          <input
            type="text"
            value={query}
            onChange={handleSearchChange}
            onFocus={() => { if (query.length >= 2) setIsOpen(true); }}
            placeholder="Search tasks, projects..."
            className="w-full bg-slate-100 border border-slate-200 rounded-full pl-10 pr-4 py-2 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400/30 focus:border-violet-400 transition-all"
          />

          {isOpen && query.length >= 2 && (
            <div className="absolute top-[calc(100%+8px)] left-0 right-0 bg-white rounded-xl shadow-lg border border-slate-200 max-h-[400px] overflow-y-auto z-50 py-2">
              {filteredTasks.length === 0 && filteredProjects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                  <Search size={24} className="mb-2 opacity-50" />
                  <p className="text-sm">No results found for "{query}"</p>
                </div>
              ) : (
                <>
                  {filteredTasks.length > 0 && (
                    <div className="mb-2">
                      <div className="flex items-center gap-3 px-4 py-1.5 mb-1">
                        <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider flex-none">Tasks ({filteredTasks.length})</span>
                        <div className="h-px bg-slate-100 flex-1"></div>
                      </div>
                      {filteredTasks.map((task: any) => (
                        <div
                          key={task.id}
                          onClick={() => {
                            setIsOpen(false);
                            setQuery("");
                            navigate("/my-tasks");
                          }}
                          className="flex items-start gap-2.5 px-4 py-2 hover:bg-slate-50 cursor-pointer transition-colors"
                        >
                          <span className={`w-2 h-2 rounded-full mt-1.5 flex-none ${PRIORITY_COLOR[task.priority?.toLowerCase()] || "bg-slate-400"}`} />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-slate-700 truncate">{task.title}</p>
                            <p className="text-xs text-slate-400 truncate mt-0.5">
                              {task.status || "To Do"}{task.dueDate ? ` · Due: ${new Date(task.dueDate).toLocaleDateString()}` : ""}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {filteredProjects.length > 0 && (
                    <div>
                      <div className="flex items-center gap-3 px-4 py-1.5 mb-1">
                        <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider flex-none">Projects ({filteredProjects.length})</span>
                        <div className="h-px bg-slate-100 flex-1"></div>
                      </div>
                      {filteredProjects.map((project: any) => (
                        <div
                          key={project.id}
                          onClick={() => {
                            setIsOpen(false);
                            setQuery("");
                            navigate(`/projects/${project.id}`);
                          }}
                          className="flex items-start gap-2.5 px-4 py-2 hover:bg-slate-50 cursor-pointer transition-colors"
                        >
                          <span className="w-2 h-2 rounded-full mt-1.5 flex-none" style={{ backgroundColor: project.color || "#8b5cf6" }} />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-slate-700 truncate">{project.name}</p>
                            <p className="text-xs text-slate-400 truncate mt-0.5">
                              {project.description || project.status || "Active"}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors relative">
            <Bell size={20} />
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
          </button>
          <button className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
            <HelpCircle size={20} />
          </button>
        </div>

        {user && (
          <div className="w-8 h-8 rounded-full bg-violet-100 border border-violet-200 flex items-center justify-center flex-none">
            <span className="text-xs text-violet-600 font-bold">
              {user.displayName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
            </span>
          </div>
        )}
      </div>
    </header>
  );
}
