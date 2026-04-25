import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  collection, query, where, getDocs,
  doc, setDoc, updateDoc, serverTimestamp, Timestamp,
} from "firebase/firestore";
import { db } from "../lib/firebase/config";
import { useAuth } from "../context/AuthContext";

const AVATAR_COLORS = [
  "#8b5cf6","#3b82f6","#10b981","#f59e0b",
  "#ef4444","#ec4899","#06b6d4","#84cc16",
];
function getAvatarColor(uid: string) {
  return AVATAR_COLORS[uid.charCodeAt(0) % AVATAR_COLORS.length];
}

type FlowState = "loading" | "valid" | "invalid" | "joining" | "done";

export default function JoinWorkspacePage() {
  const { inviteCode }  = useParams<{ inviteCode: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [state, setState]   = useState<FlowState>("loading");
  const [invite, setInvite] = useState<any>(null);
  const [error, setError]   = useState("");
  const [joining, setJoining] = useState(false);

  // ── Fetch invite from global invites collection ───────────────────────────
  useEffect(() => {
    if (!inviteCode) { setState("invalid"); return; }
    if (authLoading)  return;

    async function fetchInvite() {
      try {
        const q = query(
          collection(db, "invites"),
          where("inviteCode", "==", inviteCode),
          where("status",     "==", "pending")
        );
        const snap = await getDocs(q);
        if (snap.empty) { setState("invalid"); return; }

        const data = { id: snap.docs[0].id, ...snap.docs[0].data() } as any;

        // Check expiry
        if (data.expiresAt) {
          const expMs = typeof data.expiresAt?.toMillis === "function"
            ? data.expiresAt.toMillis()
            : data.expiresAt.seconds * 1000;
          if (expMs < Date.now()) { setState("invalid"); return; }
        }

        setInvite(data);
        setState("valid");
      } catch (err) {
        console.error(err);
        setState("invalid");
      }
    }

    fetchInvite();
  }, [inviteCode, authLoading]);

  // ── Accept invite ─────────────────────────────────────────────────────────
  async function acceptInvite() {
    if (!user || !invite) return;
    setJoining(true);
    try {
      const { workspaceId, role } = invite;

      // Add user to workspace members
      await setDoc(
        doc(db, "workspaces", workspaceId, "members", user.uid),
        {
          userId:      user.uid,
          email:       user.email ?? "",
          displayName: user.displayName ?? user.email?.split("@")[0] ?? "Member",
          avatar:      (user.displayName ?? user.email ?? "M")[0].toUpperCase(),
          avatarColor: getAvatarColor(user.uid),
          role:        role ?? "member",
          status:      "active",
          joinedAt:    serverTimestamp(),
          invitedBy:   invite.invitedBy ?? "",
          lastActive:  serverTimestamp(),
          permissions: {
            canCreateProjects: role !== "viewer",
            canDeleteProjects: role === "admin",
            canInviteMembers:  role === "admin",
            canManageTasks:    role !== "viewer",
          },
        }
      );

      // Mark invite as accepted in workspace sub-collection
      const wsInviteQ = query(
        collection(db, "workspaces", workspaceId, "invites"),
        where("inviteCode", "==", inviteCode)
      );
      const wsSnap = await getDocs(wsInviteQ);
      wsSnap.docs.forEach(async (d) => {
        await updateDoc(d.ref, {
          status:     "accepted",
          acceptedAt: serverTimestamp(),
        });
      });

      // Mark global invite as accepted
      const globalQ = query(
        collection(db, "invites"),
        where("inviteCode", "==", inviteCode)
      );
      const globalSnap = await getDocs(globalQ);
      globalSnap.docs.forEach(async (d) => {
        await updateDoc(d.ref, {
          status:     "accepted",
          acceptedAt: serverTimestamp(),
        });
      });

      // Update user's doc with the new workspaceId
      await updateDoc(doc(db, "users", user.uid), {
        workspaceId,
        updatedAt: serverTimestamp(),
      });

      setState("done");
      setTimeout(() => navigate("/"), 1500);
    } catch (err: any) {
      console.error(err);
      setError("Failed to join workspace. Please try again.");
    } finally {
      setJoining(false);
    }
  }

  function storeCodeAndGo(path: string) {
    if (inviteCode) localStorage.setItem("pendingInviteCode", inviteCode);
    navigate(path);
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-600 to-violet-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">

        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-9 h-9 bg-violet-600 rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-sm">W</span>
          </div>
          <span className="text-2xl tracking-tight">
            <span className="font-extrabold text-slate-900">Wurk</span>
            <span className="font-light text-slate-900">fine</span>
          </span>
        </div>

        {/* Loading */}
        {(state === "loading" || authLoading) && (
          <div className="text-center py-8">
            <div className="w-10 h-10 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm text-slate-500">Verifying your invitation...</p>
          </div>
        )}

        {/* Invalid */}
        {state === "invalid" && (
          <div className="text-center py-4">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">❌</div>
            <h2 className="text-lg font-bold text-slate-800 mb-2">Invalid Invitation</h2>
            <p className="text-sm text-slate-500 mb-2">This invitation is invalid or has expired.</p>
            <p className="text-xs text-slate-400 mb-6">
              Please ask your workspace admin to send a new invitation.
            </p>
            <button
              onClick={() => navigate("/login")}
              className="w-full py-2.5 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 transition-colors"
            >
              Go to Login
            </button>
          </div>
        )}

        {/* Valid */}
        {state === "valid" && invite && (
          <div>
            <div className="text-center mb-6">
              <div className="text-3xl mb-3">🎉</div>
              <h2 className="text-xl font-bold text-slate-800 mb-1">You've been invited!</h2>
              <p className="text-sm text-slate-500">
                <span className="font-medium text-slate-700">{invite.invitedByName}</span> invited you to join{" "}
                <span className="font-medium text-violet-700">{invite.workspaceId}</span> as a{" "}
                <span className="font-medium text-slate-700 capitalize">{invite.role}</span>
              </p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 mb-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Workspace</span>
                <span className="font-medium text-slate-700">{invite.workspaceName || invite.workspaceId}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Your role</span>
                <span className="font-medium text-slate-700 capitalize">{invite.role}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Invited by</span>
                <span className="font-medium text-slate-700">{invite.invitedByName}</span>
              </div>
            </div>

            {invite.message && (
              <p className="text-sm italic text-slate-500 text-center bg-slate-50 rounded-xl p-3 mb-4">
                "{invite.message}"
              </p>
            )}

            {error && (
              <p className="text-xs text-red-500 text-center mb-3">{error}</p>
            )}

            {/* Not logged in */}
            {!user ? (
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => storeCodeAndGo("/login")}
                  className="w-full py-3 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 transition-colors"
                >
                  Sign In to Accept
                </button>
                <button
                  onClick={() => storeCodeAndGo("/login")}
                  className="w-full py-3 border border-violet-300 text-violet-700 rounded-xl text-sm font-semibold hover:bg-violet-50 transition-colors"
                >
                  Create Account
                </button>
              </div>
            ) : (
              /* Logged in */
              <button
                onClick={acceptInvite}
                disabled={joining}
                className="w-full py-3 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {joining ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Joining...
                  </>
                ) : (
                  "Accept Invitation →"
                )}
              </button>
            )}
          </div>
        )}

        {/* Done */}
        {state === "done" && (
          <div className="text-center py-6">
            <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">✅</div>
            <h2 className="text-lg font-bold text-slate-800 mb-1">Welcome to the team!</h2>
            <p className="text-sm text-slate-500">Redirecting you to the dashboard...</p>
          </div>
        )}
      </div>
    </div>
  );
}
