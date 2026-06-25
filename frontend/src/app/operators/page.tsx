"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth";
import { api } from "@/lib/api";
import type { Operator } from "@/types";
import { getInitials } from "@/lib/utils";
import { MapPin, Zap, ChevronRight, Plus, Users2 } from "lucide-react";

export default function OperatorsPage() {
  const { isAuthenticated, user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) router.push("/login");
  }, [isAuthenticated, router]);

  const { data: operators = [], isLoading } = useQuery<Operator[]>({
    queryKey: ["operators"],
    queryFn: () => api.getOperators(),
    enabled: isAuthenticated,
  });

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen" style={{ background: "#EFF3F8" }}>
      {/* Top nav */}
      <header className="bg-[#0D1B2E] border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#0A7EA4] flex items-center justify-center">
              <Zap size={16} className="text-white" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">Prism Campaigns</div>
              <div className="text-[10px] text-blue-300/70 uppercase tracking-wide">Operator Select</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-xs text-blue-200/70">{user?.full_name}</div>
            {user?.is_super_admin && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#0A7EA4]/30 text-[#7DD3F0] border border-[#0A7EA4]/30">
                Super Admin
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#0D1B2E]">Select an Operator</h1>
          <p className="text-[#607080] mt-1 text-sm">
            Choose a telecom operator to access its marketing planning workspace
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-36 rounded-xl bg-white/60 animate-pulse border border-[#D6E1EE]" />
            ))}
          </div>
        ) : operators.length === 0 ? (
          <div className="text-center py-20">
            <Users2 size={40} className="mx-auto text-[#9EB0C1] mb-4" />
            <p className="text-[#607080] font-medium">No operators assigned yet</p>
            <p className="text-sm text-[#9EB0C1] mt-1">Ask your administrator to assign you to an operator</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {operators.map((op) => (
              <button
                key={op.id}
                onClick={() => router.push(`/${op.slug}/dashboard`)}
                className="group text-left bg-white rounded-xl border border-[#D6E1EE] p-5 hover:border-[#0A7EA4]/50 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                    style={{ background: op.primary_color || "#0A7EA4" }}
                  >
                    {getInitials(op.name)}
                  </div>
                  <ChevronRight
                    size={16}
                    className="text-[#D6E1EE] group-hover:text-[#0A7EA4] transition-colors mt-1"
                  />
                </div>
                <h3 className="font-bold text-[#0D1B2E] text-base">{op.name}</h3>
                <div className="flex items-center gap-1.5 mt-1">
                  <MapPin size={11} className="text-[#9EB0C1]" />
                  <span className="text-xs text-[#607080]">{op.country}</span>
                  <span className="text-[#D6E1EE] mx-1">·</span>
                  <span className="text-xs text-[#607080]">{op.currency}</span>
                </div>
                <div className="mt-3 flex items-center gap-1">
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{
                      background: op.is_active ? "#DCFCE7" : "#F1F5F9",
                      color: op.is_active ? "#15803D" : "#94A3B8",
                    }}
                  >
                    {op.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
              </button>
            ))}

            {user?.is_super_admin && (
              <button
                onClick={() => router.push("/admin/operators/new")}
                className="text-left rounded-xl border-2 border-dashed border-[#D6E1EE] p-5 hover:border-[#0A7EA4]/50 hover:bg-[#EBF7FC]/50 transition-all flex flex-col items-center justify-center gap-2 min-h-[144px]"
              >
                <Plus size={24} className="text-[#9EB0C1]" />
                <span className="text-sm font-medium text-[#607080]">Add Operator</span>
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
