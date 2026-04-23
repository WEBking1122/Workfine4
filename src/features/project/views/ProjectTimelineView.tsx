/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Task } from '../../../types';
import { cn, formatDate } from '../../../lib/utils';
import { format, differenceInDays, startOfMonth, addDays, eachDayOfInterval, endOfMonth, isToday } from 'date-fns';

interface ProjectTimelineViewProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

export default function ProjectTimelineView({ tasks, onTaskClick }: ProjectTimelineViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const daysInView = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getTaskPosition = (task: Task) => {
    if (!task.dueDate) return null;
    const taskDate = new Date(task.dueDate);
    if (taskDate < monthStart || taskDate > monthEnd) return null;
    
    const dayIndex = differenceInDays(taskDate, monthStart);
    return {
      left: `${(dayIndex / daysInView.length) * 100}%`,
      width: '200px' // Simple fixed width for now
    };
  };

  return (
    <div className="card border-slate-100 overflow-hidden flex flex-col bg-white dark:bg-surface-dark">
      <div className="p-6 border-b border-slate-100 dark:border-border-dark flex items-center justify-between">
        <h3 className="font-bold text-lg dark:text-white">{format(currentDate, 'MMMM yyyy')}</h3>
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentDate(addDays(monthStart, -1))} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
             <ChevronLeft size={20} />
          </button>
          <button onClick={() => setCurrentDate(new Date())} className="px-4 py-2 text-sm font-bold text-primary hover:bg-primary/5 rounded-lg">
            Today
          </button>
          <button onClick={() => setCurrentDate(addDays(monthEnd, 1))} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
             <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto relative min-h-[400px]">
        {/* Timeline Header (Days) */}
        <div className="sticky top-0 z-10 flex border-b border-slate-100 dark:border-border-dark bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md">
           <div className="w-64 shrink-0 p-4 border-r border-slate-100 dark:border-border-dark font-bold text-xs text-muted-text uppercase">
             Project Tasks
           </div>
           {daysInView.map((day) => (
             <div 
               key={day.toISOString()} 
               className={cn(
                 "w-12 shrink-0 flex flex-col items-center justify-center py-2 border-r border-slate-100 dark:border-gray-800 last:border-r-0",
                 isToday(day) && "bg-primary/5 font-bold"
               )}
             >
               <span className="text-[10px] text-slate-400">{format(day, 'EEE')}</span>
               <span className={cn("text-sm", isToday(day) ? "text-primary font-black" : "text-slate-600 dark:text-slate-400")}>
                 {format(day, 'd')}
               </span>
             </div>
           ))}
        </div>

        {/* Timeline Body */}
        <div className="relative">
          {/* Vertical Grid Lines */}
          <div className="absolute inset-0 flex pointer-events-none">
            <div className="w-64 shrink-0 border-r border-slate-100 dark:border-border-dark" />
            {daysInView.map((day) => (
              <div 
                key={day.toISOString()} 
                className={cn(
                   "w-12 shrink-0 border-r border-slate-100/50 dark:border-gray-800/50",
                   isToday(day) && "bg-primary/5"
                )}
              />
            ))}
          </div>

          {/* Task Rows */}
          <div className="relative z-0">
            {tasks.map((task) => (
              <div key={task.id} className="flex border-b border-slate-100 dark:border-border-dark hover:bg-slate-50/50 dark:hover:bg-slate-800/20 group">
                <div 
                  onClick={() => onTaskClick(task)}
                  className="w-64 shrink-0 p-4 border-r border-slate-100 dark:border-border-dark flex items-center gap-3 cursor-pointer"
                >
                  <div className={cn("w-2 h-2 rounded-full", task.status === 'Done' ? 'bg-success' : 'bg-primary')} />
                  <span className="text-sm font-medium text-slate-800 dark:text-white truncate group-hover:text-primary transition-colors">
                    {task.title}
                  </span>
                </div>
                
                <div className="flex-1 relative flex items-center h-14">
                   {getTaskPosition(task) && (
                     <div 
                        onClick={() => onTaskClick(task)}
                        className={cn(
                          "absolute h-9 rounded-lg flex items-center px-4 cursor-pointer hover:shadow-lg transition-all",
                          task.priority === 'Urgent' ? 'bg-danger/10 text-danger border border-danger/20' : 
                          task.priority === 'High' ? 'bg-amber-100 text-amber-600 border border-amber-200' :
                          'bg-primary text-white border border-primary-dark shadow-md'
                        )}
                        style={{ ...getTaskPosition(task) }}
                     >
                       <span className="text-[10px] font-bold truncate">{task.title}</span>
                     </div>
                   )}
                </div>
              </div>
            ))}
            {tasks.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 bg-slate-50/50">
                <p className="text-muted-text text-sm">No tasks scheduled for this period.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
