"use client";

import { cn } from "@/lib/utils";
import { Bell, Search } from "lucide-react";
import { useAuthStore } from "@/store/auth";

interface HeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, actions, className }: HeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-4 mb-6", className)}>
      <div>
        <h1 className="text-xl font-bold text-foreground tracking-tight">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </div>
  );
}

export function TopBar() {
  const { user } = useAuthStore();
  return (
    <header className="h-14 border-b bg-card flex items-center px-6 gap-4 flex-shrink-0">
      <div className="flex-1 relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search campaigns, segments, offers…"
          className="w-full max-w-sm pl-9 pr-4 py-1.5 text-sm rounded-md border bg-muted/50 text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/40 transition-all"
        />
      </div>
      <div className="flex items-center gap-2">
        <button className="w-8 h-8 rounded-md flex items-center justify-center hover:bg-muted transition-colors relative">
          <Bell size={15} className="text-muted-foreground" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-primary" />
        </button>
      </div>
    </header>
  );
}
