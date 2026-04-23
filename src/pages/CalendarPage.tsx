/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { useAppData } from "../context/AppDataContext";
import { useAuth }    from "../context/AuthContext";
import Navbar from "../components/Navbar";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

export default function CalendarPage() {
  const { tasks } = useAppData();
  const { user }  = useAuth();

  const today = new Date();
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const { days, startPad } = useMemo(() => {
    const firstDay    = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return {
      days:     Array.from({ length: daysInMonth }, (_, i) => i + 1),
      startPad: firstDay,
    };
  }, [year, month]);

  const tasksByDate = useMemo(() => {
    const map: Record<string, any[]> = {};
    tasks.forEach(task => {
      if (!task.dueDate) return;
      const key = task.dueDate.slice(0, 10);
      if (!map[key]) map[key] = [];
      map[key].push(task);
    });
    return map;
  }, [tasks]);

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const formatDateKey = (day: number) =>
    `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const isToday = (day: number) =>
    day === today.getDate() &&
    month === today.getMonth() &&
    year === today.getFullYear();

  const selectedTasks = selectedDate ? (tasksByDate[selectedDate] ?? []) : [];

  const monthPrefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  const monthTaskCount = Object.entries(tasksByDate)
    .filter(([key]) => key.startsWith(monthPrefix))
    .reduce((sum: number, [, t]) => sum + (t as any[]).length, 0);
  const monthDoneCount = tasks.filter(
    t => t.status === "Done" && t.dueDate?.startsWith(monthPrefix)
  ).length;

  return (
    <div className="ml-56 bg-[#f4f5f7] min-h-screen overflow-y-auto">
      <Navbar title="Calendar" />
      <div className="max-w-6xl mx-auto px-6 pt-14 pb-8">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
            Calendar
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            View and manage tasks by due date
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Calendar Grid */}
          <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl shadow-sm p-5">

            {/* Navigation */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={prevMonth}
                className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors text-lg"
              >
                &#8249;
              </button>
              <h2 className="text-base font-semibold text-gray-800">
                {MONTHS[month]} {year}
              </h2>
              <button
                onClick={nextMonth}
                className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors text-lg"
              >
                &#8250;
              </button>
            </div>

            {/* Day Labels */}
            <div className="grid grid-cols-7 mb-2">
              {DAYS.map(d => (
                <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">
                  {d}
                </div>
              ))}
            </div>

            {/* Day Cells */}
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: startPad }, (_, i) => (
                <div key={`pad-${i}`} />
              ))}
              {days.map(day => {
                const key      = formatDateKey(day);
                const dayTasks = tasksByDate[key] ?? [];
                const selected = selectedDate === key;
                const todayDay = isToday(day);
                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDate(selected ? null : key)}
                    className={`relative aspect-square flex flex-col items-center justify-start pt-1 rounded-lg text-sm transition-colors ${
                      selected
                        ? "bg-blue-600 text-white"
                        : todayDay
                        ? "bg-blue-50 text-blue-600 font-bold"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {day}
                    {dayTasks.length > 0 && (
                      <span className={`mt-0.5 w-1.5 h-1.5 rounded-full ${
                        selected ? "bg-white" : "bg-blue-500"
                      }`} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Side Panel */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">
              {selectedDate
                ? new Date(selectedDate + "T12:00:00").toLocaleDateString(
                    "en-US", { weekday: "long", month: "long", day: "numeric" }
                  )
                : "Select a day"}
            </h3>

            {selectedDate ? (
              selectedTasks.length > 0 ? (
                <div className="space-y-2">
                  {selectedTasks.map(task => (
                    <div key={task.id} className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                      <p className={`text-sm font-medium ${
                        task.status === "Done" ? "line-through text-gray-400" : "text-gray-800"
                      }`}>
                        {task.title}
                      </p>
                      <div className="flex gap-2 mt-1">
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                          task.priority === "High"   ? "bg-red-100 text-red-600" :
                          task.priority === "Medium" ? "bg-amber-100 text-amber-600" :
                                                       "bg-gray-100 text-gray-500"
                        }`}>
                          {task.priority ?? "Low"}
                        </span>
                        <span className="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-medium">
                          {task.status ?? "To Do"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 flex flex-col items-center gap-2">
                  <p className="text-gray-300 text-3xl">&#128197;</p>
                  <p className="text-sm text-gray-400">No tasks this day</p>
                </div>
              )
            ) : (
              <div className="py-12 flex flex-col items-center gap-2">
                <p className="text-gray-300 text-3xl">&#128070;</p>
                <p className="text-sm text-gray-400 text-center">
                  Click any day to see tasks due on that date
                </p>
                <p className="text-xs text-gray-300 text-center mt-1">
                  Blue dots indicate days with tasks
                </p>
              </div>
            )}

            {/* Month Summary */}
            <div className="mt-6 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">
                This Month
              </p>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total tasks due</span>
                  <span className="font-semibold text-gray-800">{monthTaskCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Completed</span>
                  <span className="font-semibold text-emerald-600">{monthDoneCount}</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
