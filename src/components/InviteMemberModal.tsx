import React, { useState } from "react";
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { db } from "../lib/firebase/config";
import { useAuth } from "../context/AuthContext";
import { Shield, User, Eye, X, CheckCircle } from "lucide-react";

interface Props {
  onClose: () => void;
  workspaceId: string;
  workspaceName: string;
  members: any[];
  pendingInvites: any[];
}

function generateInviteCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

const ROLES = [
  {
    id: "admin",
    label: "Admin",
    description: "Can manage projects, tasks, and invite members",
    icon: Shield,
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    id: "member",
    label: "Member",
    description: "Can create and manage tasks and projects",
    icon: User,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  {
    id: "viewer",
    label: "Viewer",
    description: "Can view projects and tasks but cannot edit",
    icon: Eye,
    color: "text-orange-500",
    bg: "bg-orange-50",
  },
] as const;

export default function InviteMemberModal({
  onClose,
  workspaceId,
  workspaceName,
  members,
  pendingInvites,
}: Props) {
  const { user } = useAuth();

  const [email, setEmail]       = useState("");
  const [role, setRole]         = useState<"admin" | "member" | "viewer">("member");
  const [message, setMessage]   = useState("");
  const [error, setError]       = useState("");
  const [sending, setSending]   = useState(false);
  const [success, setSuccess]   = useState<{ code: string; email: string } | null>(null);
  const [copied, setCopied]     = useState(false);

  const maxMsg = 200;

  function isValidEmail(e: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
  }

  async function handleSend() {
    setError("");
    const trimmedEmail = email.trim().toLowerCase();

    if (!isValidEmail(trimmedEmail)) {
      setError("Invalid email address.");
      return;
    }

    const alreadyMember = members.some(
      (m) => (m.email || "").toLowerCase() === trimmedEmail
    );
    if (alreadyMember) {
      setError("This email is already a workspace member.");
      return;
    }

    const alreadyPending = pendingInvites.some(
      (inv) => (inv.email || "").toLowerCase() === trimmedEmail
    );
    if (alreadyPending) {
      setError("An invitation is already pending for this email.");
      return;
    }

    setSending(true);
    try {
      const inviteCode = generateInviteCode();
      const now = Timestamp.now();
      const expiresAt = Timestamp.fromMillis(now.toMillis() + 7 * 24 * 60 * 60 * 1000);

      const inviteData = {
        email: trimmedEmail,
        role,
        status: "pending",
        invitedBy: user?.uid ?? "",
        invitedByName: user?.displayName ?? user?.email ?? "Someone",
        workspaceId,
        workspaceName,
        inviteCode,
        message: message.trim(),
        createdAt: serverTimestamp(),
        expiresAt,
        acceptedAt: null,
      };

      // Save to workspace invites sub-collection
      await addDoc(
        collection(db, "workspaces", workspaceId, "invites"),
        inviteData
      );

      // Save to global invites collection (for lookup by inviteCode on join)
      await addDoc(collection(db, "invites"), {
        ...inviteData,
        id: inviteCode,
      });

      setSuccess({ code: inviteCode, email: trimmedEmail });
    } catch (err: any) {
      console.error("[InviteModal] error:", err);
      setError("Failed to send invitation. Please try again.");
    } finally {
      setSending(false);
    }
  }

  function copyCode(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-auto overflow-hidden"
        style={{ animation: "fadeInUp 0.2s ease" }}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Invite Team Member
            </h2>
            <p className="text-sm text-slate-400 mt-0.5">
              Send an invitation to join your workspace
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-5">
          {/* ── Success state ── */}
          {success ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="text-emerald-600" size={28} />
              </div>
              <p className="text-base font-semibold text-slate-800 mb-1">
                Invitation sent!
              </p>
              <p className="text-sm text-slate-500 mb-4">
                Invitation sent to <span className="font-medium text-slate-700">{success.email}</span>
              </p>

              <div className="bg-slate-50 rounded-xl p-4 mb-3">
                <p className="text-xs text-slate-400 mb-1">Share this code with them:</p>
                <p className="font-mono text-xl font-bold tracking-widest text-violet-700">
                  {success.code}
                </p>
              </div>

              <div className="flex items-center gap-2 bg-slate-100 rounded-xl px-3 py-2 mb-4">
                <span className="text-xs text-slate-500 truncate flex-1">
                  workfine.app/join/{success.code}
                </span>
                <button
                  onClick={() => copyCode(`workfine.app/join/${success.code}`)}
                  className="text-xs text-violet-600 font-medium flex-shrink-0"
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>

              <button
                onClick={onClose}
                className="w-full py-2.5 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 transition-colors"
              >
                Done
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Email */}
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  placeholder="colleague@company.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(""); }}
                  className={`w-full border rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all ${
                    error.toLowerCase().includes("email")
                      ? "border-red-400 bg-red-50"
                      : "border-slate-200"
                  }`}
                />
                {error && (
                  <p className="text-xs text-red-500 mt-1">{error}</p>
                )}
              </div>

              {/* Role */}
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-2">
                  Assign Role
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {ROLES.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setRole(r.id)}
                      className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                        role === r.id
                          ? "border-violet-500 bg-violet-50"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${r.bg} flex-shrink-0`}>
                        <r.icon size={16} className={r.color} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{r.label}</p>
                        <p className="text-xs text-slate-400">{r.description}</p>
                      </div>
                      {role === r.id && (
                        <div className="ml-auto w-4 h-4 rounded-full bg-violet-600 flex items-center justify-center flex-shrink-0">
                          <div className="w-2 h-2 rounded-full bg-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message */}
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">
                  Personal Message{" "}
                  <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <textarea
                  placeholder="Add a personal message to your invitation..."
                  value={message}
                  onChange={(e) =>
                    setMessage(e.target.value.slice(0, maxMsg))
                  }
                  rows={2}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                />
                <p className="text-xs text-slate-400 text-right mt-0.5">
                  {message.length}/{maxMsg}
                </p>
              </div>

              {/* Submit */}
              <button
                onClick={handleSend}
                disabled={sending || !email.trim()}
                className="w-full py-3 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {sending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send Invitation →"
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
