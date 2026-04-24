/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { useAppData } from "../context/AppDataContext";
import { useAuth }    from "../context/AuthContext";
import { doc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase/config";
import Navbar from "../components/Navbar";

type FilterType = "All" | "To Do" | "In Progress" | "In Review" | "Done";

const statusColor: Record<string, string> = {
  "To Do":       "bg-gray-100 text-gray-600",
  "In Progress": "bg-blue-100 text-blue-600",
  "In Review":   "bg-purple-100 text-purple-600",
  "Done":        "bg-emerald-100 text-emerald-600",
};

const priorityColor: Record<string, string> = {
  "High":   "bg-red-100 text-red-600",
  "Medium": "bg-amber-100 text-amber-600",
  "Low":    "bg-gray-100 text-gray-500",
};

const FILTERS: FilterType[] = ["All", "To Do", "In Progress", "In Review", "Done"];

export default function MyTasksPage() {
  const { user }  = useAuth();
  const { tasks } = useAppData();
  const [filter, setFilter] = useState<FilterType>("All");

  const filteredTasks = filter === "All"
    ? tasks
    : tasks.filter(t => t.status === filter);

  const toggleDone = async (task: any) => {
    if (!user?.uid) return;
    const newStatus = task.status === "Done" ? "To Do" : "Done";
    await updateDoc(
      doc(db, "users", user.uid, "tasks", task.id),
      { status: newStatus, updatedAt: serverTimestamp() }
    );
  };

  const deleteTask = async (taskId: string) => {
    if (!user?.uid) return;
    await deleteDoc(doc(db, "users", user.uid, "tasks", taskId));
  };

  return (
    <div className="ml-0 bg-[#f4f5f7] min-h-screen overflow-y-auto">
      <Navbar title="My Tasks" />
      <div className="max-w-6xl mx-auto px-6 pt-14 pb-8">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
            My Tasks
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {tasks.length} total &middot; {tasks.filter(t => t.status === "Done").length} completed
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === f
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              {f}
              <span className="ml-1.5 opacity-70">
                {f === "All" ? tasks.length : tasks.filter(t => t.status === f).length}
              </span>
            </button>
          ))}
        </div>

        {/* Task List */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          {filteredTasks.length > 0 ? (
            filteredTasks.map((task, idx) => (
              <div
                key={task.id}
                className={`flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors ${
                  idx < filteredTasks.length - 1 ? "border-b border-gray-100" : ""
                }`}
              >
                {/* Checkbox */}
                <button
                  onClick={() => toggleDone(task)}
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    task.status === "Done"
                      ? "border-emerald-500 bg-emerald-500"
                      : "border-gray-300 hover:border-blue-400"
                  }`}
                >
                  {task.status === "Done" && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>

                {/* Task info */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${
                    task.status === "Done" ? "line-through text-gray-400" : "text-gray-800"
                  }`}>
                    {task.title}
                  </p>
                  {task.dueDate && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      Due: {new Date(task.dueDate).toLocaleDateString()}
                    </p>
                  )}
                </div>

                {/* Status badge */}
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  statusColor[task.status] ?? "bg-gray-100 text-gray-500"
                }`}>
                  {task.status ?? "To Do"}
                </span>

                {/* Priority badge */}
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  priorityColor[task.priority] ?? "bg-gray-100 text-gray-500"
                }`}>
                  {task.priority ?? "Low"}
                </span>

                {/* Delete */}
                <button
                  onClick={() => deleteTask(task.id)}
                  className="text-gray-300 hover:text-red-400 transition-colors text-lg leading-none flex-shrink-0"
                >
                  &times;
                </button>
              </div>
            ))
          ) : (
            <div className="py-20 flex flex-col items-center justify-center gap-2">
              <p className="text-gray-400 text-sm font-medium">
                {filter === "All" ? "No tasks yet" : `No ${filter} tasks`}
              </p>
              <p className="text-gray-300 text-xs">
                Tasks you create will appear here instantly
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
