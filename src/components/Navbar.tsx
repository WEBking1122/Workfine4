/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Search, Bell, HelpCircle } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  title: string;
}

export default function Navbar({ title }: NavbarProps) {
  const { user } = useAuth();
  const location = useLocation();

  return (
    <header className="h-16 flex items-center justify-between px-8 bg-[#0F172A] border-b border-slate-800 sticky top-0 z-40 backdrop-blur-md bg-opacity-80">
      <div className="flex items-center gap-6">
        <div>
          <h1 className="text-xl font-semibold text-white">{title}</h1>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="mono">SLV-882</span>
            <span className="text-slate-700">/</span>
            <span>Workspace</span>
            <span className="text-slate-700">/</span>
            <span>Projects</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="hidden md:flex relative group w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-400 transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Search tasks, projects..." 
            className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-full pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 transition-all outline-none dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <button className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors relative">
            <Bell size={20} />
            <span className="absolute top-2 right-2 w-2 h-2 bg-danger rounded-full border-2 border-white dark:border-bg-dark" />
          </button>
          <button className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <HelpCircle size={20} />
          </button>
        </div>
      </div>
    </header>
  );
}
