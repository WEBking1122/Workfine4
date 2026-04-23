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
import CreateProjectModal from "./CreateProjectModal";

export default function Sidebar() {
  const { user, signOutUser } = useAuth();
  const { projects } = useAppData();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  const [showCreateProject, setShowCreateProject] = useState(false);

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
                type="button"
                onClick={() => setShowCreateProject(true)}
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
      {showCreateProject && (
        <CreateProjectModal onClose={() => setShowCreateProject(false)} />
      )}
    </>
  );
}
