"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth";
import { api } from "@/lib/api";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/header";
import type { Operator } from "@/types";
import { Loader2 } from "lucide-react";

export default function OperatorLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const params = useParams();
  const operatorSlug = params.operatorSlug as string;

  useEffect(() => {
    if (!isAuthenticated) router.push("/login");
  }, [isAuthenticated, router]);

  const { data: operators, isLoading } = useQuery<Operator[]>({
    queryKey: ["operators"],
    queryFn: () => api.getOperators(),
    enabled: isAuthenticated,
  });

  const operator = operators?.find((op) => op.slug === operatorSlug);

  if (!isAuthenticated) return null;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#EFF3F8]">
        <Loader2 className="animate-spin text-[#0A7EA4]" size={28} />
      </div>
    );
  }

  if (!operator) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#EFF3F8]">
        <div className="text-center">
          <p className="font-semibold text-[#0D1B2E]">Operator not found</p>
          <button onClick={() => router.push("/operators")} className="text-sm text-[#0A7EA4] mt-2">
            Back to operators
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#EFF3F8]">
      <Sidebar operator={operator} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
