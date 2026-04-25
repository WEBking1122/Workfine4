// src/pages/TeamPage.tsx
import React, { useState, useEffect, useCallback } from "react";
import {
  Users, Shield, Clock, Star, Copy, Check, Crown,
  ChevronDown, UserX, Search, FolderOpen,
} from "lucide-react";
import {
  doc, updateDoc, deleteDoc,
  serverTimestamp, setDoc, getDoc,
} from "firebase/firestore";
import { db } from "../lib/firebase/config";
import { useAuth } from "../context/AuthContext";
import { useAppData } from "../context/AppDataContext";
import InviteMemberModal from "../components/InviteMemberModal";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "#8b5cf6","#3b82f6","#10b981","#f59e0b",
  "#ef4444","#ec4899","#06b6d4","#84cc16",
];

function getAvatarColor(userId: string): string {
  return AVATAR_COLORS[userId.charCodeAt(0) % AVATAR_COLORS.length];
}

function timeAgo(ts: any): string {
  if (!ts) return "Never";
  const ms =
    typeof ts?.toMillis === "function" ? ts.toMillis()
    : typeof ts?.seconds === "number"  ? ts.seconds * 1000
    : new Date(ts).getTime();
  const diff = Date.now() - ms;
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function isOnline(ts: any): boolean {
  if (!ts) return false;
  const ms =
    typeof ts?.toMillis === "function" ? ts.toMillis()
    : typeof ts?.seconds === "number"  ? ts.seconds * 1000
    : new Date(ts).getTime();
  return Date.now() - ms < 5 * 60 * 1000;
}

function isExpired(expiresAt: any): boolean {
  if (!expiresAt) return false;
  const ms =
    typeof expiresAt?.toMillis === "function" ? expiresAt.toMillis()
    : typeof expiresAt?.seconds === "number"  ? expiresAt.seconds * 1000
    : new Date(expiresAt).getTime();
  return ms < Date.now();
}

const ROLE_HIERARCHY: Record<string, number> = {
  owner: 4, admin: 3, member: 2, viewer: 1,
};

function canManage(currentRole: string, targetRole: string): boolean {
  return (ROLE_HIERARCHY[currentRole] ?? 0) > (ROLE_HIERARCHY[targetRole] ?? 0);
}

const ROLE_BADGE: Record<string, string> = {
  owner:  "bg-violet-600 text-white",
  admin:  "bg-blue-100 text-blue-700",
  member: "bg-slate-100 text-slate-600",
  viewer: "bg-gray-100 text-gray-600",
};

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ msg, onDone }: { msg: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, []);
  return (
    <div
      className="fixed bottom-6 right-6 z-50 bg-slate-800 text-white px-4 py-3 rounded-xl shadow-lg text-sm"
      style={{ animation: "slideUp 0.2s ease" }}
    >
      {msg}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TeamPage() {
  const { user, workspaceId, setWorkspaceId } = useAuth();
  const { members, pendingInvites, workspaceData, cancelInvite } = useAppData();

  const [search,         setSearch]         = useState("");
  const [showInvite,     setShowInvite]     = useState(false);
  const [toast,          setToast]          = useState("");
  const [copiedWid,      setCopiedWid]      = useState(false);
  const [confirmRemove,  setConfirmRemove]  = useState<string | null>(null);
  const [roleMenuFor,    setRoleMenuFor]    = useState<string | null>(null);
  const [cancellingCode, setCancellingCode] = useState<string | null>(null);
  const [cancelError,    setCancelError]    = useState<string | null>(null);

  const showToast = useCallback((msg: string) => setToast(msg), []);

  const myMember = members.find((m) => m.userId === user?.uid);
  const myRole   = myMember?.role ?? "member";

  const filtered = members.filter((m) => {
    const q = search.toLowerCase();
    return (
      (m.displayName || "").toLowerCase().includes(q) ||
      (m.email       || "").toLowerCase().includes(q)
    );
  });

  // ── Workspace initialisation ───────────────────────────────────────────────
  // Only creates workspace doc + owner member doc for the TRUE owner.
  // Invitees already have their member doc from JoinWorkspacePage and must
  // NEVER be overwritten here with role:"owner".
  useEffect(() => {
    if (!workspaceId || !user) return;

    const init = async () => {
      try {
        const wsRef     = doc(db, "workspaces", workspaceId);
        const memberRef = doc(db, "workspaces", workspaceId, "members", user.uid);

        const [wsSnap, memberSnap] = await Promise.all([
          getDoc(wsRef),
          getDoc(memberRef),
        ]);

        // Create workspace doc only when it does not exist
        if (!wsSnap.exists()) {
          await setDoc(wsRef, {
            id:          workspaceId,
            workspaceId,
            name:        `${user.displayName ?? user.email?.split("@")[0] ?? "My"}'s Workspace`,
            ownerId:     user.uid,
            ownerEmail:  user.email ?? "",
            createdAt:   serverTimestamp(),
            memberCount: 1,
            plan:        "free",
          });
        }

        // Create member doc ONLY when missing AND this user is the owner
        if (!memberSnap.exists()) {
          const freshWs = wsSnap.exists() ? wsSnap : await getDoc(wsRef);
          const isOwner = freshWs.data()?.ownerId === user.uid;
          // ✅ Guard — invitees must not be assigned role:"owner" here
          if (!isOwner) return;

          await setDoc(memberRef, {
            userId:      user.uid,
            email:       user.email ?? "",
            displayName: user.displayName ?? user.email?.split("@")[0] ?? "Owner",
            avatar:      (user.displayName ?? user.email ?? "O")[0].toUpperCase(),
            avatarColor: getAvatarColor(user.uid),
            role:        "owner",
            status:      "active",
            joinedAt:    serverTimestamp(),
            invitedBy:   "",
            lastActive:  serverTimestamp(),
            permissions: {
              canCreateProjects: true,
              canDeleteProjects: true,
              canInviteMembers:  true,
              canManageTasks:    true,
            },
          });
        }
      } catch (err) {
        console.error("[TeamPage] init error:", err);
      }
    };

    init();
  }, [workspaceId, user]);

  // ── Actions ───────────────────────────────────────────────────────────────

  async function changeRole(userId: string, name: string, newRole: string) {
    if (!workspaceId) return;
    try {
      await updateDoc(
        doc(db, "workspaces", workspaceId, "members", userId),
        { role: newRole, updatedAt: serverTimestamp() }
      );
      setRoleMenuFor(null);
      showToast(`${name} is now a${/^[aeiou]/i.test(newRole) ? "n" : ""} ${newRole}`);
    } catch (err) {
      console.error("[TeamPage] changeRole error:", err);
      showToast("Failed to update role.");
    }
  }

  // ✅ THE WORKING APPROACH:
  // Step 1 — deleteDoc the member (same as the old working code — no batch)
  // Step 2 — fire-and-forget background reset of the removed user's workspaceId
  //           This runs AFTER the member is already removed from the UI so the
  //           user never sees an error even if step 2 has a permissions issue.
  async function removeMember(memberId: string, name: string) {
    if (!workspaceId) return;
    try {
      // ── Step 1: Delete member doc — identical to the old working code ──
      await deleteDoc(doc(db, "workspaces", workspaceId, "members", memberId));

      // UI updates immediately via onSnapshot — member disappears right now ✅
      setConfirmRemove(null);
      showToast(`${name} has been removed from the workspace`);

      // ── Step 2: Background — reset removed user's workspace (best effort) ──
      // This runs AFTER the toast so it never blocks or errors the UI.
      // It silently provisions the removed user's personal workspace.
      resetRemovedUserWorkspace(memberId).catch((err) => {
        // Silent — the member is already removed, this is just cleanup
        console.warn("[TeamPage] background workspace reset failed:", err);
      });

    } catch (err) {
      console.error("[TeamPage] removeMember error:", err);
      showToast("Failed to remove member. Please try again.");
    }
  }

  // Runs in the background after removal — does NOT affect the remove action
  async function resetRemovedUserWorkspace(memberId: string) {
    const personalWsId = `WF-${Math.floor(Math.random() * 900) + 100}`;

    // Update removed user's workspaceId
    await setDoc(
      doc(db, "users", memberId),
      { workspaceId: personalWsId, updatedAt: serverTimestamp() },
      { merge: true }
    );

    // Provision their personal workspace doc if it doesn't exist
    const personalWsRef  = doc(db, "workspaces", personalWsId);
    const personalWsSnap = await getDoc(personalWsRef);

    if (!personalWsSnap.exists()) {
      const removedUserSnap = await getDoc(doc(db, "users", memberId));
      const removedData     = removedUserSnap.exists() ? removedUserSnap.data() : {} as any;

      await setDoc(personalWsRef, {
        id:          personalWsId,
        workspaceId: personalWsId,
        name:        removedData.displayName
                       ? `${removedData.displayName}'s Workspace`
                       : "My Workspace",
        ownerId:     memberId,
        ownerEmail:  removedData.email ?? "",
        plan:        "free",
        createdAt:   serverTimestamp(),
        updatedAt:   serverTimestamp(),
        memberCount: 1,
      });

      await setDoc(
        doc(db, "workspaces", personalWsId, "members", memberId),
        {
          userId:      memberId,
          displayName: removedData.displayName ?? "User",
          email:       removedData.email       ?? "",
          avatar:      (removedData.displayName ?? removedData.email ?? "U")[0].toUpperCase(),
          avatarColor: getAvatarColor(memberId),
          role:        "owner",
          status:      "active",
          joinedAt:    serverTimestamp(),
          lastActive:  serverTimestamp(),
          invitedBy:   "",
          permissions: {
            canCreateProjects: true,
            canDeleteProjects: true,
            canInviteMembers:  true,
            canManageTasks:    true,
          },
        }
      );
    }

    // If this user removed themselves, update local state too
    if (memberId === user?.uid && setWorkspaceId) {
      setWorkspaceId(personalWsId);
    }
  }

  const handleCancelInvite = async (inviteCode: string) => {
    if (cancellingCode) return;
    setCancellingCode(inviteCode);
    setCancelError(null);
    try {
      await cancelInvite(inviteCode);
    } catch {
      setCancelError("Failed to cancel invite. Please try again.");
      setTimeout(() => setCancelError(null), 4000);
    } finally {
      setCancellingCode(null);
    }
  };

  async function resendInvite(invite: any) {
    if (!workspaceId) return;
    try {
      const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await updateDoc(
        doc(db, "workspaces", workspaceId, "invites", invite.code),
        { expiresAt: newExpiry, updatedAt: serverTimestamp() }
      );
      showToast(`Invitation resent to ${invite.email}`);
    } catch (err) {
      console.error("[TeamPage] resendInvite error:", err);
      showToast("Failed to resend invite.");
    }
  }

  function copyWorkspaceId() {
    navigator.clipboard.writeText(workspaceId ?? "").then(() => {
      setCopiedWid(true);
      setTimeout(() => setCopiedWid(false), 2000);
      showToast("Workspace ID copied to clipboard");
    });
  }

  // ── Derived stats ─────────────────────────────────────────────────────────

  const activeCount  = members.filter((m) => m.status === "active").length;
  const adminCount   = members.filter((m) => m.role   === "admin").length;
  const pendingCount = pendingInvites.length;
  const plan         = workspaceData?.plan ?? "free";

  const STATS = [
    { label: "Total Members",   value: activeCount,                     icon: Users,  bg: "bg-violet-100",  color: "text-violet-600"  },
    { label: "Admins",          value: adminCount,                      icon: Shield, bg: "bg-blue-100",    color: "text-blue-600"    },
    { label: "Pending Invites", value: pendingCount,                    icon: Clock,  bg: "bg-orange-100",  color: "text-orange-500"  },
    { label: "Workspace Plan",  value: plan === "pro" ? "Pro" : "Free", icon: Star,   bg: "bg-emerald-100", color: "text-emerald-600" },
  ];

  const wsName =
    workspaceData?.name ??
    `${user?.displayName ?? user?.email?.split("@")[0] ?? "My"}'s Workspace`;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="ml-0 bg-[#f4f5f7] min-h-screen overflow-y-auto">
      <div className="max-w-6xl mx-auto px-6 pt-14 pb-10">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Team Members</h1>
            <p className="text-sm text-slate-400 mt-0.5">
              Manage your workspace team and permissions
            </p>
          </div>
          <button
            onClick={() => setShowInvite(true)}
            className="bg-violet-600 text-white hover:bg-violet-700 px-4 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm"
          >
            + Invite Member
          </button>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {STATS.map((s) => (
            <div
              key={s.label}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center gap-4"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${s.bg}`}>
                <s.icon size={20} className={s.color} />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{s.value}</p>
                <p className="text-xs text-slate-400">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Main grid */}
        <div className="flex flex-col lg:flex-row gap-6 items-start">

          {/* LEFT — Members list */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-sm font-semibold text-slate-800">Active Members</h2>
              <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-medium">
                {activeCount}
              </span>
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={15}
              />
              <input
                type="text"
                placeholder="Search members..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-600 focus:outline-none focus:border-violet-400 transition-colors"
              />
            </div>

            {/* Members */}
            {filtered.length === 0 && members.length <= 1 ? (
              <div className="bg-white rounded-2xl border border-slate-200 border-dashed py-20 flex flex-col items-center justify-center gap-3">
                <Users size={48} className="text-violet-200" strokeWidth={1} />
                <p className="text-sm font-medium text-slate-700">Your team is empty</p>
                <p className="text-xs text-slate-400 text-center max-w-xs">
                  Invite teammates to collaborate on projects and tasks together
                </p>
                <button
                  onClick={() => setShowInvite(true)}
                  className="mt-2 px-4 py-2 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 transition-colors"
                >
                  + Invite Your First Member
                </button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 py-12 flex flex-col items-center gap-2">
                <FolderOpen size={36} className="text-slate-300" strokeWidth={1} />
                <p className="text-sm text-slate-400">No members match your search</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((member) => {
                  const isOwnerMember    = member.role === "owner";
                  const isMe             = member.userId === user?.uid;
                  const canAct           = !isOwnerMember && !isMe && canManage(myRole, member.role);
                  const online           = isOnline(member.lastActive);
                  const initials         = (member.displayName || member.email || "?")[0].toUpperCase();
                  const bgColor          = member.avatarColor || getAvatarColor(member.userId || "x");
                  const confirmingRemove = confirmRemove === member.userId;

                  return (
                    <div
                      key={member.userId}
                      className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 hover:shadow-md transition-all"
                    >
                      {/* Row 1 */}
                      <div className="flex items-center gap-3">
                        <div className="relative flex-shrink-0">
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                            style={{ backgroundColor: bgColor }}
                          >
                            {initials}
                          </div>
                          {online && (
                            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">
                            {isOwnerMember && <span className="mr-1">👑</span>}
                            {member.displayName || member.email}
                            {isMe && (
                              <span className="ml-1 text-xs text-slate-400 font-normal">(you)</span>
                            )}
                          </p>
                          <p className="text-xs text-slate-400 truncate">{member.email}</p>
                        </div>

                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize flex-shrink-0 ${
                            ROLE_BADGE[member.role] ?? ROLE_BADGE.member
                          }`}
                        >
                          {member.role}
                        </span>
                      </div>

                      {/* Row 2 */}
                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                        {member.joinedAt && (
                          <span>Joined {timeAgo(member.joinedAt)}</span>
                        )}
                        <span>Last active {timeAgo(member.lastActive)}</span>
                      </div>

                      {/* Row 3 — Actions */}
                      {canAct && !confirmingRemove && (
                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-50">
                          <div className="relative">
                            <button
                              onClick={() =>
                                setRoleMenuFor(
                                  roleMenuFor === member.userId ? null : member.userId
                                )
                              }
                              className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg px-2.5 py-1.5 transition-colors"
                            >
                              Change Role <ChevronDown size={12} />
                            </button>
                            {roleMenuFor === member.userId && (
                              <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 w-36 overflow-hidden">
                                {["admin", "member", "viewer"]
                                  .filter((r) => r !== member.role)
                                  .map((r) => (
                                    <button
                                      key={r}
                                      onClick={() =>
                                        changeRole(member.userId, member.displayName, r)
                                      }
                                      className="w-full px-4 py-2 text-xs text-left text-slate-700 hover:bg-violet-50 hover:text-violet-700 capitalize transition-colors"
                                    >
                                      {r}
                                    </button>
                                  ))}
                              </div>
                            )}
                          </div>

                          <button
                            onClick={() => setConfirmRemove(member.userId)}
                            className="text-xs text-red-500 hover:text-red-700 border border-red-100 hover:border-red-300 rounded-lg px-2.5 py-1.5 transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      )}

                      {/* Confirm remove */}
                      {confirmingRemove && (
                        <div className="mt-3 pt-3 border-t border-slate-100 bg-red-50 rounded-xl p-3">
                          <p className="text-xs text-slate-700 mb-2">
                            Remove{" "}
                            <span className="font-semibold">{member.displayName}</span>{" "}
                            from the workspace?
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setConfirmRemove(null)}
                              className="flex-1 text-xs py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-white transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => removeMember(member.userId, member.displayName)}
                              className="flex-1 text-xs py-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* RIGHT — Pending Invites + Workspace Info */}
          <div className="w-full lg:w-80 flex-none flex flex-col gap-4">

            {/* Pending Invites */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-800">Pending Invites</h3>
                {pendingCount > 0 && (
                  <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-medium">
                    {pendingCount}
                  </span>
                )}
              </div>

              {cancelError && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-xl text-xs flex items-center justify-between">
                  <span>{cancelError}</span>
                  <button
                    onClick={() => setCancelError(null)}
                    className="text-red-400 hover:text-red-600 ml-2"
                  >
                    ✕
                  </button>
                </div>
              )}

              {pendingInvites.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 gap-2">
                  <div className="text-2xl">📭</div>
                  <p className="text-xs text-slate-400">No pending invites</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingInvites.map((inv) => {
                    const expired      = isExpired(inv.expiresAt);
                    const isCancelling = cancellingCode === inv.code;

                    return (
                      <div
                        key={inv.code}
                        className="border border-slate-100 rounded-xl p-3 flex flex-col gap-2"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold text-slate-700 truncate mr-2">
                            {inv.email}
                          </p>
                          {expired ? (
                            <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium flex-shrink-0">
                              Expired
                            </span>
                          ) : (
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 capitalize ${
                                ROLE_BADGE[inv.role] ?? ROLE_BADGE.member
                              }`}
                            >
                              {inv.role}
                            </span>
                          )}
                        </div>

                        <p className="text-[10px] text-slate-400">
                          Sent {timeAgo(inv.createdAt)} · Code:{" "}
                          <span className="font-mono">{inv.inviteCode || inv.code}</span>
                        </p>

                        <div className="flex gap-2 mt-1">
                          <button
                            onClick={() => resendInvite(inv)}
                            disabled={!!cancellingCode}
                            className="flex-1 text-[10px] py-1.5 rounded-lg text-violet-600 hover:bg-violet-50 transition-colors font-medium disabled:opacity-50"
                          >
                            Resend
                          </button>
                          <button
                            onClick={() => handleCancelInvite(inv.code)}
                            disabled={!!cancellingCode}
                            className={`flex-1 text-[10px] py-1.5 rounded-lg border font-medium transition-colors flex items-center justify-center gap-1 ${
                              isCancelling
                                ? "border-slate-200 text-slate-400 bg-slate-50 cursor-wait"
                                : "border-red-200 text-red-500 hover:bg-red-50 disabled:opacity-50"
                            }`}
                          >
                            {isCancelling ? (
                              <>
                                <svg
                                  className="animate-spin h-3 w-3 text-slate-400"
                                  xmlns="http://www.w3.org/2000/svg"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                >
                                  <circle
                                    className="opacity-25"
                                    cx="12" cy="12" r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                  />
                                  <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                  />
                                </svg>
                                Cancelling...
                              </>
                            ) : (
                              "Cancel"
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Workspace Info */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-slate-800 mb-4">Workspace Info</h3>
              <div className="space-y-3">

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-400">Workspace ID</p>
                    <p className="text-sm font-mono font-bold text-violet-700">{workspaceId}</p>
                  </div>
                  <button
                    onClick={copyWorkspaceId}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                    title="Copy workspace ID"
                  >
                    {copiedWid
                      ? <Check size={15} className="text-emerald-500" />
                      : <Copy  size={15} />
                    }
                  </button>
                </div>

                <div>
                  <p className="text-xs text-slate-400">Workspace Name</p>
                  <p className="text-sm font-medium text-slate-700">{wsName}</p>
                </div>

                <div>
                  <p className="text-xs text-slate-400">Owner</p>
                  <p className="text-sm font-medium text-slate-700">
                    {members.find((m) => m.role === "owner")?.displayName
                      ?? workspaceData?.ownerEmail
                      ?? user?.displayName
                      ?? user?.email}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-400">Member Limit</p>
                  <p className="text-sm font-medium text-slate-700">
                    {activeCount} / {plan === "pro" ? "∞" : "10"} members{" "}
                    <span className="text-slate-400 font-normal">
                      ({plan === "pro" ? "Pro" : "Free"} plan)
                    </span>
                  </p>
                </div>

                {plan !== "pro" && (
                  <button
                    className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
                    style={{ background: "linear-gradient(135deg, #8b5cf6, #6d28d9)" }}
                  >
                    ✨ Upgrade to Pro
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Invite Modal */}
      {showInvite && workspaceId && (
        <InviteMemberModal
          onClose={() => setShowInvite(false)}
          workspaceId={workspaceId}
          workspaceName={wsName}
          members={members}
          pendingInvites={pendingInvites}
        />
      )}

      {/* Toast */}
      {toast && <Toast msg={toast} onDone={() => setToast("")} />}

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
      `}</style>
    </div>
  );
}
