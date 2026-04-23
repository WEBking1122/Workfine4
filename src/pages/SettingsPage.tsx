/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { 
  User as UserIcon, 
  Bell, 
  Moon, 
  Sun, 
  Shield, 
  Mail,
  Camera,
  Check
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';

export default function SettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  const tabs = [
    { id: 'profile', name: 'Profile', icon: UserIcon },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'appearance', name: 'Appearance', icon: Sun },
    { id: 'security', name: 'Security', icon: Shield },
  ];

  return (
    <div className="ml-64 bg-[#f4f5f7] min-h-screen overflow-y-auto">
      <Navbar title="Settings" />
      <div className="px-8 pt-14 pb-8 max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row gap-8">
        <aside className="w-full md:w-64 shrink-0 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all",
                activeTab === tab.id 
                  ? "bg-primary text-white shadow-lg shadow-primary/20" 
                  : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              )}
            >
              <tab.icon size={18} />
              {tab.name}
            </button>
          ))}
        </aside>

        <main className="flex-1 max-w-2xl">
          {activeTab === 'profile' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <section className="card p-8 space-y-6">
                <div className="flex items-center gap-6">
                  <div className="relative group">
                    <img 
                      src={user?.photoURL || 'https://via.placeholder.com/100'} 
                      alt="" 
                      className="w-24 h-24 rounded-3xl object-cover border-4 border-slate-50 dark:border-slate-800 shadow-md"
                    />
                    <button className="absolute inset-0 bg-black/40 rounded-3xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white">
                      <Camera size={24} />
                    </button>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold dark:text-white">{user?.displayName}</h3>
                    <p className="text-sm text-muted-text">{user?.email}</p>
                    <div className="mt-2 flex gap-2">
                       <span className="px-2 py-0.5 bg-success/10 text-success text-[10px] font-bold uppercase rounded leading-none">Verified</span>
                       <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold uppercase rounded leading-none">Admin</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100 dark:border-border-dark">
                   <div className="space-y-2">
                     <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Full Name</label>
                     <input 
                       defaultValue={user?.displayName || ''} 
                       className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-border-dark rounded-2xl text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none transition-all dark:text-white"
                     />
                   </div>
                   <div className="space-y-2">
                     <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Email Address</label>
                     <input 
                       disabled
                       defaultValue={user?.email || ''} 
                       className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800 border border-slate-100 dark:border-border-dark rounded-2xl text-sm font-medium outline-none text-slate-500 cursor-not-allowed"
                     />
                   </div>
                </div>

                <button className="btn-primary w-full md:w-auto px-8 py-3 rounded-2xl shadow-lg shadow-primary/20">
                  Save Changes
                </button>
              </section>

              <section className="card p-8 space-y-4 border-danger/10">
                <h4 className="font-bold text-danger text-sm uppercase tracking-widest">Danger Zone</h4>
                <p className="text-xs text-muted-text">Once you delete your account, there is no going back. Please be certain.</p>
                <button className="px-6 py-2 border border-danger/20 text-danger text-xs font-bold rounded-xl hover:bg-danger/5 transition-colors">
                  Delete Account
                </button>
              </section>
            </div>
          )}

          {activeTab === 'notifications' && (
             <div className="card p-8 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
               <h3 className="text-xl font-bold dark:text-white mb-6">Notification Preferences</h3>
               {[
                 { id: 'assign', name: 'Task Assignments', desc: 'When someone assigns you a task' },
                 { id: 'comment', name: 'Comments & Mentions', desc: 'When someone mentions you or comments' },
                 { id: 'due', name: 'Due Date Reminders', desc: 'Alerts for upcoming or overdue tasks' },
                 { id: 'project', name: 'Project Updates', desc: 'Summary of project activity and changes' },
               ].map((item) => (
                 <div key={item.id} className="flex items-center justify-between py-2">
                   <div>
                     <p className="text-sm font-bold dark:text-white">{item.name}</p>
                     <p className="text-xs text-muted-text">{item.desc}</p>
                   </div>
                   <button 
                     onClick={() => setNotifications(!notifications)}
                     className={cn(
                       "w-12 h-6 rounded-full transition-all relative overflow-hidden",
                       notifications ? "bg-primary" : "bg-slate-200"
                     )}
                   >
                     <div className={cn(
                       "absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm",
                       notifications ? "right-1" : "left-1"
                     )} />
                   </button>
                 </div>
               ))}
             </div>
          )}
          
          {activeTab === 'appearance' && (
            <div className="card p-8 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
               <h3 className="text-xl font-bold dark:text-white mb-6">Interface Settings</h3>
               <div className="flex items-center justify-between">
                 <div className="flex items-center gap-3">
                   <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                     {darkMode ? <Moon size={20} className="text-primary" /> : <Sun size={20} className="text-amber-500" />}
                   </div>
                   <div>
                     <p className="text-sm font-bold dark:text-white">Dark Mode</p>
                     <p className="text-xs text-muted-text">Switch between light and dark themes</p>
                   </div>
                 </div>
                 <button 
                   onClick={() => setDarkMode(!darkMode)}
                   className={cn(
                     "w-12 h-6 rounded-full transition-all relative overflow-hidden",
                     darkMode ? "bg-primary" : "bg-slate-200"
                   )}
                 >
                   <div className={cn(
                     "absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm",
                     darkMode ? "right-1" : "left-1"
                   )} />
                 </button>
               </div>
            </div>
          )}
        </main>
      </div>
      </div>
    </div>
  );
}
