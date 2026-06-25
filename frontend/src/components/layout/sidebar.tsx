"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";
import { getInitials } from "@/lib/utils";
import type { Operator } from "@/types";
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

export function Sidebar({ operator }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const nav = buildNav(operator.slug);

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
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg mb-1">
          <div className="w-7 h-7 rounded-full bg-[#0A7EA4]/30 border border-[#0A7EA4]/50 flex items-center justify-center text-xs font-bold text-[#7DD3F0] flex-shrink-0">
            {user ? getInitials(user.full_name) : "?"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-white/90 truncate">{user?.full_name}</div>
            <div className="text-[10px] text-blue-300/50 truncate">{user?.email}</div>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-blue-300/70 hover:text-white hover:bg-white/5 transition-all"
        >
          <LogOut size={14} className="flex-shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
