import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { createProject } from "../lib/firebase/projects";

interface Props {
  onClose: () => void;
}

const COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e",
  "#f97316", "#eab308", "#22c55e", "#14b8a6", "#3b82f6",
];

export default function CreateProjectModal({ onClose }: Props) {
  const { user } = useAuth();
  const [name, setName]               = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor]             = useState("#6366f1");
  const [status, setStatus]           = useState("active");
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim())  { setError("Project name is required."); return; }
    if (!user?.uid)    { setError("You must be signed in.");    return; }

    setSaving(true);
    setError("");

    try {
      const id = await createProject(user.uid, {
        name, description, color, status,
      });
      console.log("[Modal] ✅ Project saved with ID:", id);
      onClose();
    } catch (err) {
      console.error("[Modal] ❌ Save failed:", err);
      setError("Failed to save. Check your connection and try again.");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center
                    bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl
                      w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-white">
            Create New Project
          </h2>
          <button onClick={onClose}
            className="text-gray-400 hover:text-white text-xl transition">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Project Name *
            </label>
            <input
              type="text" value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Website Redesign"
              className="w-full bg-gray-800 border border-gray-600
                         rounded-xl px-4 py-2.5 text-white
                         placeholder-gray-500 focus:outline-none
                         focus:border-violet-500 transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief project description..."
              rows={3}
              className="w-full bg-gray-800 border border-gray-600
                         rounded-xl px-4 py-2.5 text-white
                         placeholder-gray-500 focus:outline-none
                         focus:border-violet-500 transition resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Status
            </label>
            <select value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full bg-gray-800 border border-gray-600
                         rounded-xl px-4 py-2.5 text-white
                         focus:outline-none focus:border-violet-500 transition"
            >
              <option value="active">Active</option>
              <option value="planning">Planning</option>
              <option value="on-hold">On Hold</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Project Color
            </label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map((c) => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full border-2 transition-transform
                    ${color === c
                      ? "border-white scale-125"
                      : "border-transparent hover:scale-110"}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-900/20 border
                          border-red-800 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3 mt-2">
            <button type="button" onClick={onClose}
              className="flex-1 bg-gray-800 hover:bg-gray-700
                         text-gray-300 rounded-xl py-2.5 font-medium transition"
            >
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-violet-600 hover:bg-violet-700
                         disabled:opacity-50 disabled:cursor-not-allowed
                         text-white rounded-xl py-2.5 font-medium transition"
            >
              {saving ? "Saving to database..." : "Create Project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
