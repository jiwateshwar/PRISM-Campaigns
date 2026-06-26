"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";
import { getInitials } from "@/lib/utils";
import type { Operator } from "@/types";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useState } from "react";
import {
  LayoutDashboard,
  CalendarDays,
  Megaphone,
  Users,
  Tag,
  Palette,
  Workflow,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  Radio,
  Zap,
  UserCog,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

interface SidebarProps {
  operator: Operator;
  collapsed?: boolean;
}

function buildNav(slug: string): NavItem[] {
  const base = `/${slug}`;
  return [
    { href: `${base}/dashboard`, label: "Dashboard", icon: LayoutDashboard },
    { href: `${base}/planning`, label: "Monthly Planning", icon: CalendarDays },
    { href: `${base}/campaigns`, label: "Campaigns", icon: Megaphone },
    { href: `${base}/journeys`, label: "Journey Builder", icon: Workflow },
    { href: `${base}/segments`, label: "Segment Library", icon: Users },
    { href: `${base}/offers`, label: "Offer Library", icon: Tag },
    { href: `${base}/creatives`, label: "Creative Library", icon: Palette },
    { href: `${base}/analytics`, label: "Analytics", icon: BarChart3 },
    { href: `${base}/settings`, label: "Settings", icon: Settings },
  ];
}

function ProfileModal({ onClose }: { onClose: () => void }) {
  const { user, setUser } = useAuthStore();
  const [tab, setTab] = useState<"profile" | "password">("profile");
  const [fullName, setFullName] = useState(user?.full_name ?? "");
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSaveProfile() {
    if (!fullName.trim()) { toast.error("Name cannot be empty"); return; }
    setLoading(true);
    try {
      const updated = await api.updateMe({ full_name: fullName });
      if (setUser) setUser(updated);
      toast.success("Profile updated");
      onClose();
    } catch { toast.error("Failed to update profile"); }
    finally { setLoading(false); }
  }

  async function handleChangePassword() {
    if (!currentPw || !newPw) { toast.error("Fill in all password fields"); return; }
    if (newPw !== confirmPw) { toast.error("New passwords do not match"); return; }
    if (newPw.length < 8) { toast.error("New password must be at least 8 characters"); return; }
    setLoading(true);
    try {
      await api.changePassword(currentPw, newPw);
      toast.success("Password changed successfully");
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
      onClose();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      toast.error(err?.response?.data?.detail || "Failed to change password");
    } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl border shadow-xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-[#0A7EA4]/20 flex items-center justify-center text-sm font-bold text-[#0A7EA4]">
            {user ? getInitials(user.full_name) : "?"}
          </div>
          <div>
            <div className="font-semibold text-sm text-[#0D1B2E]">{user?.full_name}</div>
            <div className="text-xs text-[#9EB0C1]">{user?.email}</div>
          </div>
        </div>

        <div className="flex border-b border-[#EAF0F7] mb-4">
          {(["profile", "password"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-xs font-medium border-b-2 transition-all ${tab === t ? "border-[#0A7EA4] text-[#0A7EA4]" : "border-transparent text-[#9EB0C1]"}`}>
              {t === "profile" ? "Profile" : "Change Password"}
            </button>
          ))}
        </div>

        {tab === "profile" ? (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#607080] mb-1.5">Full Name</label>
              <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-[#D6E1EE] outline-none focus:border-[#0A7EA4]/60 transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#607080] mb-1.5">Email</label>
              <input type="email" value={user?.email ?? ""} disabled
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-[#D6E1EE] bg-[#F9FBFD] text-[#9EB0C1] cursor-not-allowed" />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={onClose} className="flex-1 py-2.5 text-sm font-medium rounded-lg border border-[#D6E1EE] text-[#607080]">Cancel</button>
              <button onClick={handleSaveProfile} disabled={loading} className="flex-1 py-2.5 text-sm font-semibold text-white rounded-lg bg-[#0A7EA4] disabled:opacity-50">
                {loading ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-[#607080] mb-1.5">Current Password</label>
              <input type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} placeholder="Enter current password"
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-[#D6E1EE] outline-none focus:border-[#0A7EA4]/60 transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#607080] mb-1.5">New Password</label>
              <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="At least 8 characters"
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-[#D6E1EE] outline-none focus:border-[#0A7EA4]/60 transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#607080] mb-1.5">Confirm New Password</label>
              <input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} placeholder="Repeat new password"
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-[#D6E1EE] outline-none focus:border-[#0A7EA4]/60 transition-colors" />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={onClose} className="flex-1 py-2.5 text-sm font-medium rounded-lg border border-[#D6E1EE] text-[#607080]">Cancel</button>
              <button onClick={handleChangePassword} disabled={loading} className="flex-1 py-2.5 text-sm font-semibold text-white rounded-lg bg-[#0A7EA4] disabled:opacity-50">
                {loading ? "Saving…" : "Change Password"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function Sidebar({ operator }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const nav = buildNav(operator.slug);
  const [showProfile, setShowProfile] = useState(false);

  return (
    <aside className="w-60 flex-shrink-0 flex flex-col h-full bg-[#0D1B2E] text-white">
      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b border-white/10">
        <Link href="/operators" className="flex items-center gap-3 group">
          <div className="w-8 h-8 rounded-lg bg-[#0A7EA4] flex items-center justify-center flex-shrink-0">
            <Zap size={16} className="text-white" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-white truncate">Prism Campaigns</div>
            <div className="text-[10px] text-blue-300/70 truncate uppercase tracking-wide">Ops Platform</div>
          </div>
        </Link>
      </div>

      {/* Operator chip */}
      <div className="px-4 py-3 border-b border-white/10">
        <Link href="/operators" className="flex items-center gap-2.5 group">
          <div
            className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 text-xs font-bold text-white"
            style={{ background: operator.primary_color || "#0A7EA4" }}
          >
            {getInitials(operator.name)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-white/90 truncate">{operator.name}</div>
            <div className="text-[10px] text-blue-300/60 truncate">{operator.country}</div>
          </div>
          <ChevronLeft size={12} className="text-white/30 group-hover:text-white/50 transition-colors rotate-180 flex-shrink-0" />
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-3">
        <div className="space-y-0.5">
          {nav.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                  isActive
                    ? "bg-[#0A7EA4]/20 text-white border border-[#0A7EA4]/30"
                    : "text-blue-200/70 hover:text-white hover:bg-white/5"
                )}
              >
                <Icon
                  size={16}
                  className={cn(
                    "flex-shrink-0",
                    isActive ? "text-[#0A7EA4]" : "text-blue-300/60"
                  )}
                />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* User section */}
      <div className="border-t border-white/10 p-3">
        <button
          onClick={() => setShowProfile(true)}
          className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg mb-1 hover:bg-white/5 transition-colors group"
        >
          <div className="w-7 h-7 rounded-full bg-[#0A7EA4]/30 border border-[#0A7EA4]/50 flex items-center justify-center text-xs font-bold text-[#7DD3F0] flex-shrink-0">
            {user ? getInitials(user.full_name) : "?"}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <div className="text-xs font-semibold text-white/90 truncate">{user?.full_name}</div>
            <div className="text-[10px] text-blue-300/50 truncate">{user?.email}</div>
          </div>
          <UserCog size={12} className="text-white/20 group-hover:text-white/50 transition-colors flex-shrink-0" />
        </button>
        <button
          onClick={logout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-blue-300/70 hover:text-white hover:bg-white/5 transition-all"
        >
          <LogOut size={14} className="flex-shrink-0" />
          Sign out
        </button>
      </div>

      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
    </aside>
  );
}
