/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  BarChart2,
  CalendarDays,
  CheckSquare,
  Menu,
  X,
  LogOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { cn, getInitials, getAvatarColor } from '../lib/utils';
import { useAppData } from "../context/AppDataContext";
import { createProject, deleteProject } from "../lib/firebase/projects";
import { useNavigate } from "react-router-dom";

export default function Sidebar() {
  const { user, signOutUser } = useAuth();
  const { projects } = useAppData();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  const [showModal,    setShowModal]    = useState(false);
  const [name,         setName]         = useState("");
  const [description,  setDescription]  = useState("");
  const [color,        setColor]        = useState("#3b82f6");
  const [status,       setStatus]       = useState("active");
  const [priority,     setPriority]     = useState("Medium");
  const [dueDate,      setDueDate]      = useState("");
  const [tagInput,     setTagInput]     = useState("");
  const [tags,         setTags]         = useState<string[]>([]);
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState("");
  const [step,         setStep]         = useState(1); // 2-step form

  const COLORS = ["#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6","#ec4899","#0ea5e9","#14b8a6"];

  const resetModal = () => {
    setName(""); setDescription(""); setColor("#3b82f6");
    setStatus("active"); setPriority("Medium"); setDueDate("");
    setTags([]); setTagInput(""); setError(""); setStep(1);
    setShowModal(false);
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) setTags(prev => [...prev, t]);
    setTagInput("");
  };

  const handleCreate = async () => {
    if (!user?.uid)   { setError("Not signed in.");         return; }
    if (!name.trim()) { setError("Project name required."); return; }
    setSaving(true); setError("");
    try {
      await createProject(user.uid, {
        name, color, description, status, priority, dueDate, tags,
        members: [],
      });
      resetModal();
    } catch (e: any) {
      setError(e.message ?? "Failed to create project.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    if (!user?.uid) return;
    await deleteProject(user.uid, projectId);
  };

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { name: 'Insights',  icon: BarChart2,        path: '/insights' },
    { name: 'Calendar',  icon: CalendarDays,      path: '/calendar' },
    { name: 'My Tasks',  icon: CheckSquare,       path: '/my-tasks' },
  ];

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileMenuOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-slate-900 text-white rounded-lg"
      >
        <Menu size={20} />
      </button>

      {/* Sidebar Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/60 z-[60] lg:hidden backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      <motion.aside
        id="sidebar"
        className={cn(
          "fixed inset-y-0 left-0 z-[70] w-64 bg-[#0F172A] border-r border-slate-800 flex flex-col transition-transform duration-300 lg:translate-x-0",
          !isMobileMenuOpen && "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="p-6 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg primary-gradient flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
              </svg>
            </div>
            <span className="font-bold text-lg text-white tracking-tight uppercase">Slate &amp; Violet</span>
          </Link>
          <button onClick={() => setIsMobileMenuOpen(false)} className="lg:hidden text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest px-2 mb-2 mt-4">
            Workspace
          </div>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-3 py-2 rounded-xl transition-all group",
                isActive
                  ? "bg-blue-600/20 text-blue-300"
                  : "text-slate-400 hover:text-white"
              )}
            >
              <item.icon
                size={18}
                className={cn(
                  "transition-transform group-hover:scale-110",
                  location.pathname === item.path ? "text-blue-300" : ""
                )}
              />
              <span className="font-medium text-sm">{item.name}</span>
            </NavLink>
          ))}

          {/* PROJECTS */}
          <div className="px-3 mt-6">
            <div className="flex items-center justify-between mb-2 px-2">
              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">
                Projects
              </span>
              <button
                onClick={() => { setShowModal(true); setError(""); }}
                className="w-5 h-5 rounded flex items-center justify-center text-gray-400 hover:text-white hover:bg-blue-600 transition-colors text-lg leading-none"
                title="New Project"
              >+</button>
            </div>

            {projects.length === 0 ? (
              <p className="text-xs text-gray-500 px-2 py-2 italic">
                No projects yet
              </p>
            ) : (
              projects.map(p => (
                <div
                  key={p.id}
                  className="group flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-gray-300 hover:bg-white/10 transition-colors cursor-pointer"
                  onClick={() => navigate(`/projects/${p.id}`)}
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: p.color ?? "#3b82f6" }}
                  />
                  <span className="truncate flex-1">{p.name}</span>
                  <button
                    onClick={(e) => handleDelete(e as any, p.id)}
                    className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-all text-xs px-1"
                    title="Delete project"
                  >✕</button>
                </div>
              ))
            )}
          </div>
        </nav>

        {/* User profile */}
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 p-2 bg-slate-800/30 rounded-xl">

            {/* Avatar */}
            <div className="relative flex-shrink-0">
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName ?? user.email ?? 'User'}
                  referrerPolicy="no-referrer"
                  className="w-10 h-10 rounded-full object-cover border border-indigo-400/30"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const fallback = e.currentTarget.nextElementSibling as HTMLElement | null;
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
              ) : null}
              <div
                className={cn(
                  'w-10 h-10 rounded-full items-center justify-center',
                  'text-white text-xs font-bold border border-indigo-400/30 flex-shrink-0',
                  getAvatarColor(user?.email ?? user?.displayName ?? 'user'),
                  user?.photoURL ? 'hidden' : 'flex'
                )}
                aria-label="User avatar"
              >
                {getInitials(user?.displayName ?? user?.email ?? 'User')}
              </div>
            </div>

            {/* Name + email */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user?.displayName
                  ?? (user?.email
                      ? user.email.split('@')[0].replace(/[._-]/g, ' ')
                      : 'User')}
              </p>
              <p className="text-[10px] text-slate-500 truncate mono font-medium">
                {user?.email ?? ''}
              </p>
            </div>

            <button
              onClick={signOutUser}
              className="text-slate-500 hover:text-white transition-colors flex-shrink-0"
              title="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </motion.aside>

      {/* Create Project Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="px-6 pt-6 pb-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    New Project
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Step {step} of 2 — {step === 1 ? "Basic Info" : "Details"}
                  </p>
                </div>
                <button onClick={resetModal} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
              </div>
              {/* Progress bar */}
              <div className="mt-3 h-1 bg-gray-100 rounded-full">
                <div className="h-1 bg-blue-600 rounded-full transition-all" style={{ width: step === 1 ? "50%" : "100%" }} />
              </div>
            </div>

            <div className="px-6 py-5 space-y-4">
              {step === 1 && (
                <>
                  {/* Project Name */}
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">
                      Project Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Website Redesign"
                      value={name}
                      onChange={e => { setName(e.target.value); setError(""); }}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">
                      Description
                    </label>
                    <textarea
                      placeholder="What is this project about?"
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      rows={3}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>

                  {/* Color */}
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-2">
                      Project Color
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      {COLORS.map(c => (
                        <button key={c} onClick={() => setColor(c)}
                                className={`w-8 h-8 rounded-full border-2 transition-all ${
                                  color === c
                                    ? "border-gray-800 scale-110"
                                    : "border-transparent hover:scale-105"
                                }`}
                                style={{ backgroundColor: c }} />
                      ))}
                    </div>
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  {/* Status */}
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">
                      Status
                    </label>
                    <select
                      value={status}
                      onChange={e => setStatus(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="active">🟢 Active</option>
                      <option value="planning">🔵 Planning</option>
                      <option value="on-hold">🟡 On Hold</option>
                      <option value="completed">✅ Completed</option>
                      <option value="cancelled">🔴 Cancelled</option>
                    </select>
                  </div>

                  {/* Priority */}
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">
                      Priority
                    </label>
                    <div className="flex gap-2">
                      {["Low","Medium","High"].map(p => (
                        <button key={p} onClick={() => setPriority(p)}
                                className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${
                                  priority === p
                                    ? p === "High"   ? "bg-red-500 text-white border-red-500"
                                    : p === "Medium" ? "bg-amber-500 text-white border-amber-500"
                                    :                  "bg-gray-500 text-white border-gray-500"
                                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                                }`}>
                          {p === "High" ? "🔴" : p === "Medium" ? "🟡" : "🟢"} {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Due Date */}
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={dueDate}
                      min={new Date().toISOString().split("T")[0]}
                      onChange={e => setDueDate(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Tags */}
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">
                      Tags
                    </label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        placeholder="Add a tag and press Enter"
                        value={tagInput}
                        onChange={e => setTagInput(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && addTag()}
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button onClick={addTag}
                              className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors">
                        Add
                      </button>
                    </div>
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {tags.map(t => (
                          <span key={t} className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-xs">
                            #{t}
                            <button onClick={() => setTags(prev => prev.filter(x => x !== t))} className="hover:text-red-500 ml-0.5">✕</button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Preview Card */}
                  <div className="border border-gray-100 rounded-xl p-3 bg-gray-50">
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">
                      Preview
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                      <span className="text-sm font-semibold text-gray-800">
                        {name || "Project Name"}
                      </span>
                      <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium ${
                        priority === "High"   ? "bg-red-100 text-red-600"
                        : priority === "Medium" ? "bg-amber-100 text-amber-600"
                        :                        "bg-gray-100 text-gray-500"
                      }`}>{priority}</span>
                    </div>
                    {description && (
                      <p className="text-xs text-gray-500 mt-1 ml-5 truncate">
                        {description}
                      </p>
                    )}
                    {dueDate && (
                      <p className="text-xs text-gray-400 mt-1 ml-5">
                        📅 Due: {new Date(dueDate + "T12:00:00").toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </>
              )}

              {error && (
                <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">
                  {error}
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 pb-6 flex gap-2">
              {step === 2 && (
                <button onClick={() => setStep(1)}
                        className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                  ← Back
                </button>
              )}
              {step === 1 ? (
                <>
                  <button onClick={resetModal}
                          className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (!name.trim()) { setError("Project name required."); return; }
                      setError(""); setStep(2);
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    Next →
                  </button>
                </>
              ) : (
                <button
                  onClick={handleCreate}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? "Creating..." : "🚀 Create Project"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
