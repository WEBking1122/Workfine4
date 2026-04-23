/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Task } from '../../../types';
import { cn, formatDate } from '../../../lib/utils';
import { addDays, format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, startOfWeek, endOfWeek } from 'date-fns';

interface ProjectCalendarViewProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

export default function ProjectCalendarView({ tasks, onTaskClick }: ProjectCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  const nextMonth = () => setCurrentDate(addDays(monthEnd, 1));
  const prevMonth = () => setCurrentDate(addDays(monthStart, -1));

  return (
    <div className="card border-slate-100 overflow-hidden">
      <div className="p-6 border-b border-slate-100 dark:border-border-dark flex items-center justify-between">
        <h3 className="font-bold text-lg dark:text-white">{format(currentDate, 'MMMM yyyy')}</h3>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
            <ChevronLeft size={20} />
          </button>
          <button onClick={() => setCurrentDate(new Date())} className="px-4 py-2 text-sm font-bold text-primary hover:bg-primary/5 rounded-lg">
            Today
          </button>
          <button onClick={nextMonth} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-slate-100 dark:border-border-dark">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-widest">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {calendarDays.map((day, idx) => {
          const dayTasks = tasks.filter((task) => 
            task.dueDate && isSameDay(new Date(task.dueDate), day)
          );

          return (
            <div 
              key={idx} 
              className={cn(
                "min-h-[140px] p-2 border-r border-b border-slate-100 dark:border-border-dark last:border-r-0",
                !isSameMonth(day, monthStart) && "bg-slate-50/50 dark:bg-slate-900/20"
              )}
            >
              <div className="flex justify-between items-center mb-2">
                <span className={cn(
                  "text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full",
                  isSameDay(day, new Date()) ? "bg-primary text-white" : "text-slate-500"
                )}>
                  {format(day, 'd')}
                </span>
              </div>
              
              <div className="space-y-1">
                {dayTasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => onTaskClick(task)}
                    className={cn(
                      "group px-2 py-1 rounded text-[10px] font-bold truncate cursor-pointer transition-all",
                      task.priority === 'Urgent' ? "bg-danger/10 text-danger" :
                      task.priority === 'High' ? "bg-amber-100 text-amber-600" :
                      "bg-primary/10 text-primary"
                    )}
                  >
                    {task.title}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

import { useState } from 'react';
import { ChevronLeft, ChevronRight, LayoutGrid } from 'lucide-react';
