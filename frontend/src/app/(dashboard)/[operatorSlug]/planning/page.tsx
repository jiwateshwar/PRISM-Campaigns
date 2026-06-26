"use client";

import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/layout/header";
import type { MonthlyPlan, Campaign } from "@/types";
import { formatMonth, formatNumber } from "@/lib/utils";
import { CAMPAIGN_STATUS_COLORS, CAMPAIGN_STATUS_LABELS } from "@/types";
import { toast } from "sonner";
import { Plus, CalendarDays, Loader2, ChevronRight, Pencil, Trash2 } from "lucide-react";

function PlanCard({
  plan,
  operatorSlug,
  onEdit,
  onDelete,
}: {
  plan: MonthlyPlan;
  operatorSlug: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { data: campaigns = [] } = useQuery<Campaign[]>({
    queryKey: ["campaigns", operatorSlug, plan.id],
    queryFn: () => api.getCampaigns(operatorSlug, { monthly_plan_id: plan.id }),
  });

  const totalForecastActivations = campaigns.reduce(
    (s, c) => s + ((c.forecast?.expected_activations as number) || 0),
    0
  );

  const statusCounts = campaigns.reduce<Record<string, number>>((acc, c) => {
    acc[c.status] = (acc[c.status] || 0) + 1;
    return acc;
  }, {});

  const activationPct =
    plan.target_activations > 0
      ? Math.min((totalForecastActivations / plan.target_activations) * 100, 100)
      : 0;

  return (
    <div className="bg-white rounded-xl border border-[#D6E1EE] p-5 hover:border-[#0A7EA4]/40 hover:shadow-sm transition-all group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <CalendarDays size={14} className="text-[#0A7EA4]" />
            <span className="text-xs font-semibold text-[#0A7EA4]">{formatMonth(plan.month)}</span>
          </div>
          <h3 className="font-bold text-[#0D1B2E] text-sm truncate">{plan.name}</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
              plan.status === "active" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
            }`}
          >
            {plan.status}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-md flex items-center justify-center hover:bg-[#EFF3F8] text-[#9EB0C1] hover:text-[#0A7EA4] transition-all"
          >
            <Pencil size={11} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-md flex items-center justify-center hover:bg-red-50 text-[#9EB0C1] hover:text-red-500 transition-all"
          >
            <Trash2 size={11} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-lg bg-[#EFF3F8] p-2.5 text-center">
          <div className="text-sm font-bold text-[#0D1B2E] tabular-nums">{campaigns.length}</div>
          <div className="text-[10px] text-[#9EB0C1]">Campaigns</div>
        </div>
        <div className="rounded-lg bg-[#EFF3F8] p-2.5 text-center">
          <div className="text-sm font-bold text-[#0D1B2E] tabular-nums">
            {formatNumber(totalForecastActivations)}
          </div>
          <div className="text-[10px] text-[#9EB0C1]">Forecast Activations</div>
        </div>
      </div>

      {plan.target_activations > 0 && (
        <div className="mb-3">
          <div className="flex justify-between text-[10px] mb-1">
            <span className="text-[#607080]">Activation Target Progress</span>
            <span className="font-semibold text-[#0D1B2E] tabular-nums">{Math.round(activationPct)}%</span>
          </div>
          <div className="h-1.5 bg-[#EAF0F7] rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-[#0A7EA4]" style={{ width: `${activationPct}%` }} />
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-1 pt-2 border-t border-[#EAF0F7]">
        {Object.entries(statusCounts)
          .slice(0, 4)
          .map(([status, count]) => (
            <span
              key={status}
              className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                CAMPAIGN_STATUS_COLORS[status as keyof typeof CAMPAIGN_STATUS_COLORS]
              }`}
            >
              {CAMPAIGN_STATUS_LABELS[status as keyof typeof CAMPAIGN_STATUS_LABELS]}: {count}
            </span>
          ))}
      </div>
    </div>
  );
}

export default function PlanningPage() {
  const { operatorSlug } = useParams<{ operatorSlug: string }>();
  const [showCreate, setShowCreate] = useState(false);
  const [editPlan, setEditPlan] = useState<MonthlyPlan | null>(null);
  const qc = useQueryClient();

  const { data: plans = [], isLoading } = useQuery<MonthlyPlan[]>({
    queryKey: ["plans", operatorSlug],
    queryFn: () => api.getPlans(operatorSlug),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deletePlan(operatorSlug, id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["plans"] }); toast.success("Plan deleted"); },
    onError: () => toast.error("Failed to delete plan"),
  });

  const grouped = plans.reduce<Record<number, MonthlyPlan[]>>((acc, p) => {
    const year = new Date(p.month).getFullYear();
    acc[year] = acc[year] || [];
    acc[year].push(p);
    return acc;
  }, {});

  const years = Object.keys(grouped).map(Number).sort((a, b) => b - a);

  function invalidate() { qc.invalidateQueries({ queryKey: ["plans"] }); }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Monthly Planning"
        description="Create and track monthly marketing plans by product"
        actions={
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#0A7EA4]"
          >
            <Plus size={15} />
            New Plan
          </button>
        }
      />

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="animate-spin text-[#0A7EA4]" size={24} />
        </div>
      ) : plans.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-[#D6E1EE]">
          <CalendarDays size={36} className="mx-auto text-[#D6E1EE] mb-3" />
          <p className="font-semibold text-[#0D1B2E]">No monthly plans yet</p>
          <p className="text-sm text-[#9EB0C1] mt-1">Create your first monthly marketing plan</p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-4 px-4 py-2 text-sm font-semibold text-white bg-[#0A7EA4] rounded-lg"
          >
            Create Plan
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {years.map((year) => (
            <div key={year}>
              <h2 className="text-sm font-bold text-[#3D4F63] mb-3">{year}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {grouped[year].map((plan) => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    operatorSlug={operatorSlug}
                    onEdit={() => setEditPlan(plan)}
                    onDelete={() => {
                      if (confirm(`Delete "${plan.name}"?`)) deleteMutation.mutate(plan.id);
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <PlanFormModal
          operatorSlug={operatorSlug}
          onClose={() => setShowCreate(false)}
          onSaved={() => { invalidate(); setShowCreate(false); }}
        />
      )}

      {editPlan && (
        <PlanFormModal
          operatorSlug={operatorSlug}
          plan={editPlan}
          onClose={() => setEditPlan(null)}
          onSaved={() => { invalidate(); setEditPlan(null); }}
        />
      )}
    </div>
  );
}

function PlanFormModal({
  operatorSlug,
  plan,
  onClose,
  onSaved,
}: {
  operatorSlug: string;
  plan?: MonthlyPlan;
  onClose: () => void;
  onSaved: () => void;
}) {
  const editing = !!plan;
  const [name, setName] = useState(plan?.name ?? "");
  const [month, setMonth] = useState(plan?.month ? plan.month.slice(0, 7) : new Date().toISOString().slice(0, 7));
  const [targetActivations, setTargetActivations] = useState(String(plan?.target_activations ?? ""));
  const [targetRevenue, setTargetRevenue] = useState(String(plan?.target_revenue ?? ""));
  const [notes, setNotes] = useState(plan?.notes ?? "");
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    if (!name.trim()) { toast.error("Plan name is required"); return; }
    setLoading(true);
    try {
      const payload = {
        name,
        month: month + "-01",
        target_activations: parseInt(targetActivations) || 0,
        target_revenue: parseFloat(targetRevenue) || 0,
        notes,
      };
      if (editing) {
        await api.updatePlan(operatorSlug, plan!.id, payload);
        toast.success("Plan updated");
      } else {
        await api.createPlan(operatorSlug, payload);
        toast.success("Plan created");
      }
      onSaved();
    } catch {
      toast.error(editing ? "Failed to update plan" : "Failed to create plan");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl border shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-base font-bold text-[#0D1B2E] mb-4">
          {editing ? "Edit Plan" : "New Monthly Plan"}
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#607080] mb-1.5">Plan Name *</label>
            <input
              type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="e.g. CallerTunez June 2025 Plan" autoFocus
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-[#D6E1EE] outline-none focus:border-[#0A7EA4]/60 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#607080] mb-1.5">Month *</label>
            <input
              type="month" value={month} onChange={(e) => setMonth(e.target.value)}
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-[#D6E1EE] outline-none focus:border-[#0A7EA4]/60 transition-colors bg-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#607080] mb-1.5">Activation Target</label>
              <input
                type="number" value={targetActivations} onChange={(e) => setTargetActivations(e.target.value)}
                placeholder="e.g. 50000"
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-[#D6E1EE] outline-none focus:border-[#0A7EA4]/60 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#607080] mb-1.5">Revenue Target</label>
              <input
                type="number" value={targetRevenue} onChange={(e) => setTargetRevenue(e.target.value)}
                placeholder="e.g. 75000"
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-[#D6E1EE] outline-none focus:border-[#0A7EA4]/60 transition-colors"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#607080] mb-1.5">Notes</label>
            <textarea
              value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              placeholder="Planning notes…"
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-[#D6E1EE] outline-none focus:border-[#0A7EA4]/60 transition-colors resize-none"
            />
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm font-medium rounded-lg border border-[#D6E1EE] text-[#607080]">
            Cancel
          </button>
          <button onClick={handleSave} disabled={loading} className="flex-1 py-2.5 text-sm font-semibold text-white rounded-lg bg-[#0A7EA4] disabled:opacity-50">
            {loading ? (editing ? "Saving…" : "Creating…") : (editing ? "Save Changes" : "Create Plan")}
          </button>
        </div>
      </div>
    </div>
  );
}
