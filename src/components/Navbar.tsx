/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Search, Bell, HelpCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  title?: string;
}

export default function Navbar({ title = "Overview" }: NavbarProps) {
  const { user } = useAuth();

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
        <div className="hidden md:flex relative group w-64">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-violet-500 transition-colors"
            size={18}
          />
          <input
            type="text"
            placeholder="Search tasks, projects..."
            className="w-full bg-slate-100 border border-slate-200 rounded-full pl-10 pr-4 py-2 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400/30 focus:border-violet-400 transition-all"
          />
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
