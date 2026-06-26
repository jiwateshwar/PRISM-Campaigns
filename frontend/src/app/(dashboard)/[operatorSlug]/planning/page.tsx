"use client";

import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import type { MonthlyPlan, Campaign, BusinessObjective } from "@/types";
import { CAMPAIGN_STATUS_COLORS, CAMPAIGN_STATUS_LABELS, CHANNEL_LABELS } from "@/types";
import { formatNumber, formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import {
  Plus, CalendarDays, Loader2, Pencil, Trash2,
  Target, TrendingUp, Users, ChevronDown,
  BarChart2, CheckCircle2, Circle, ArrowRight,
} from "lucide-react";
import Link from "next/link";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function safeYear(month: string | null | undefined): number {
  if (!month) return new Date().getFullYear();
  try {
    const parts = month.split("-");
    const y = parseInt(parts[0], 10);
    return isNaN(y) ? new Date().getFullYear() : y;
  } catch {
    return new Date().getFullYear();
  }
}

function safeFormatMonth(month: string | null | undefined): string {
  if (!month) return "—";
  try {
    const parts = month.split("-");
    const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const m = parseInt(parts[1], 10) - 1;
    const y = parts[0];
    return `${monthNames[m] ?? "?"} ${y}`;
  } catch {
    return month;
  }
}

const PLAN_STATUSES = ["draft", "active", "completed", "archived"] as const;
const PLAN_STATUS_STYLES: Record<string, string> = {
  draft:     "bg-slate-100 text-slate-700",
  active:    "bg-green-100 text-green-700",
  completed: "bg-blue-100 text-blue-700",
  archived:  "bg-gray-100 text-gray-500",
};

const OBJ_TYPES = [
  { value: "acquisition",     label: "Acquisition" },
  { value: "retention",       label: "Retention" },
  { value: "churn_reduction", label: "Churn Reduction" },
  { value: "revenue",         label: "Revenue" },
  { value: "upsell",          label: "Upsell" },
  { value: "custom",          label: "Custom" },
];

// ─── Plan Detail Panel ────────────────────────────────────────────────────────

function PlanDetailPanel({
  plan, operatorSlug, onEdit, onDelete, onStatusChange,
}: {
  plan: MonthlyPlan; operatorSlug: string;
  onEdit: () => void; onDelete: () => void;
  onStatusChange: (status: string) => void;
}) {
  const qc = useQueryClient();
  const [showAddObjective, setShowAddObjective] = useState(false);
  const [objForm, setObjForm] = useState({
    name: "", objective_type: "acquisition", target_value: "", target_unit: "count", weight: "1",
  });

  const { data: campaigns = [], isLoading: campaignsLoading } = useQuery<Campaign[]>({
    queryKey: ["campaigns", operatorSlug, "plan", plan.id],
    queryFn: () => api.getCampaigns(operatorSlug, { monthly_plan_id: plan.id }),
  });

  const { data: objectives = [], isLoading: objLoading } = useQuery<BusinessObjective[]>({
    queryKey: ["objectives", operatorSlug, plan.id],
    queryFn: () => api.getPlanObjectives(operatorSlug, plan.id),
  });

  const createObjective = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.createObjective(operatorSlug, plan.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["objectives", operatorSlug, plan.id] });
      toast.success("Objective added");
      setObjForm({ name: "", objective_type: "acquisition", target_value: "", target_unit: "count", weight: "1" });
      setShowAddObjective(false);
    },
    onError: () => toast.error("Failed to add objective"),
  });

  function handleAddObjective() {
    if (!objForm.name.trim() || !objForm.target_value) {
      toast.error("Name and target value are required"); return;
    }
    createObjective.mutate({
      name: objForm.name,
      objective_type: objForm.objective_type,
      target_value: parseFloat(objForm.target_value),
      target_unit: objForm.target_unit,
      weight: parseInt(objForm.weight) || 1,
    });
  }

  // Aggregate campaign forecasts
  const totalForecastActivations = campaigns.reduce(
    (s, c) => s + (Number((c.forecast as Record<string, unknown>)?.expected_activations) || 0), 0
  );
  const totalForecastRevenue = campaigns.reduce(
    (s, c) => s + (Number((c.forecast as Record<string, unknown>)?.expected_revenue) || 0), 0
  );
  const totalActualActivations = campaigns.reduce(
    (s, c) => s + (Number(c.actuals?.actual_activations) || 0), 0
  );
  const totalActualRevenue = campaigns.reduce(
    (s, c) => s + (Number(c.actuals?.actual_revenue) || 0), 0
  );

  const actPct = plan.target_activations > 0
    ? Math.min((totalForecastActivations / plan.target_activations) * 100, 100) : 0;
  const revPct = plan.target_revenue > 0
    ? Math.min((totalForecastRevenue / plan.target_revenue) * 100, 100) : 0;

  const statusGroups = campaigns.reduce<Record<string, number>>((acc, c) => {
    const s = c.status ?? "unknown";
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="flex-1 overflow-y-auto bg-[#F4F7FA]">
      {/* Plan header */}
      <div className="bg-white border-b border-[#D6E1EE] px-6 py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <CalendarDays size={13} className="text-[#0A7EA4]" />
              <span className="text-xs font-semibold text-[#0A7EA4]">{safeFormatMonth(plan.month)}</span>
            </div>
            <h2 className="text-lg font-bold text-[#0D1B2E]">{plan.name}</h2>
            {plan.notes && <p className="text-xs text-[#9EB0C1] mt-0.5">{plan.notes}</p>}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Status dropdown */}
            <div className="relative group">
              <button className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg ${PLAN_STATUS_STYLES[plan.status] || "bg-gray-100 text-gray-600"}`}>
                {plan.status}
                <ChevronDown size={10} />
              </button>
              <div className="absolute right-0 top-full mt-1 bg-white border border-[#D6E1EE] rounded-lg shadow-lg py-1 w-32 z-20 hidden group-hover:block">
                {PLAN_STATUSES.map((s) => (
                  <button key={s} onClick={() => onStatusChange(s)}
                    className="w-full text-left px-3 py-1.5 text-xs hover:bg-[#EFF3F8] transition-colors">
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={onEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-[#D6E1EE] rounded-lg hover:bg-[#EFF3F8] text-[#607080] transition-colors">
              <Pencil size={11} /> Edit
            </button>
            <button onClick={onDelete}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-red-200 rounded-lg hover:bg-red-50 text-red-500 transition-colors">
              <Trash2 size={11} /> Delete
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* KPI summary cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-[#D6E1EE] p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-[#EBF7FC] flex items-center justify-center">
                <Users size={13} className="text-[#0A7EA4]" />
              </div>
              <span className="text-[10px] font-bold text-[#9EB0C1] uppercase tracking-wide">Activations</span>
            </div>
            <div className="text-xl font-bold text-[#0D1B2E] tabular-nums">
              {formatNumber(totalForecastActivations)}
            </div>
            <div className="text-[10px] text-[#9EB0C1] mb-2">
              forecast of {formatNumber(plan.target_activations)} target
            </div>
            <div className="h-1.5 bg-[#EAF0F7] rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-[#0A7EA4] transition-all" style={{ width: `${actPct}%` }} />
            </div>
            <div className="flex justify-between text-[10px] mt-1">
              <span className="text-[#9EB0C1]">{Math.round(actPct)}% of target</span>
              {totalActualActivations > 0 && (
                <span className="text-green-600 font-medium">Actual: {formatNumber(totalActualActivations)}</span>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[#D6E1EE] p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-[#EBF7FC] flex items-center justify-center">
                <TrendingUp size={13} className="text-[#0A7EA4]" />
              </div>
              <span className="text-[10px] font-bold text-[#9EB0C1] uppercase tracking-wide">Revenue</span>
            </div>
            <div className="text-xl font-bold text-[#0D1B2E] tabular-nums">
              {formatCurrency(totalForecastRevenue)}
            </div>
            <div className="text-[10px] text-[#9EB0C1] mb-2">
              forecast of {formatCurrency(plan.target_revenue)} target
            </div>
            <div className="h-1.5 bg-[#EAF0F7] rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-[#0A7EA4] transition-all" style={{ width: `${revPct}%` }} />
            </div>
            <div className="flex justify-between text-[10px] mt-1">
              <span className="text-[#9EB0C1]">{Math.round(revPct)}% of target</span>
              {totalActualRevenue > 0 && (
                <span className="text-green-600 font-medium">Actual: {formatCurrency(totalActualRevenue)}</span>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[#D6E1EE] p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-[#EBF7FC] flex items-center justify-center">
                <BarChart2 size={13} className="text-[#0A7EA4]" />
              </div>
              <span className="text-[10px] font-bold text-[#9EB0C1] uppercase tracking-wide">Campaigns</span>
            </div>
            <div className="text-xl font-bold text-[#0D1B2E] tabular-nums">{campaigns.length}</div>
            <div className="text-[10px] text-[#9EB0C1] mb-2">linked to this plan</div>
            <div className="flex flex-wrap gap-1 mt-1">
              {Object.entries(statusGroups).map(([s, n]) => (
                <span key={s} className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${CAMPAIGN_STATUS_COLORS[s as keyof typeof CAMPAIGN_STATUS_COLORS] || "bg-gray-100 text-gray-600"}`}>
                  {CAMPAIGN_STATUS_LABELS[s as keyof typeof CAMPAIGN_STATUS_LABELS] || s}: {n}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Business Objectives */}
        <div className="bg-white rounded-xl border border-[#D6E1EE] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#EAF0F7]">
            <div className="flex items-center gap-2">
              <Target size={14} className="text-[#0A7EA4]" />
              <span className="text-sm font-bold text-[#0D1B2E]">Business Objectives</span>
              {objectives.length > 0 && (
                <span className="text-[10px] font-semibold text-[#9EB0C1] bg-[#EFF3F8] px-1.5 py-0.5 rounded-full">
                  {objectives.length}
                </span>
              )}
            </div>
            <button onClick={() => setShowAddObjective(!showAddObjective)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#0A7EA4] rounded-lg hover:bg-[#0A7EA4]/90 transition-colors">
              <Plus size={11} /> Add Objective
            </button>
          </div>

          {showAddObjective && (
            <div className="border-b border-[#EAF0F7] px-5 py-4 bg-[#F9FBFD]">
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="col-span-2">
                  <label className="block text-[10px] font-semibold text-[#607080] mb-1">Objective Name *</label>
                  <input type="text" value={objForm.name} onChange={(e) => setObjForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Increase CallerTunez subscribers"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#D6E1EE] outline-none focus:border-[#0A7EA4]/60" />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-[#607080] mb-1">Type</label>
                  <select value={objForm.objective_type} onChange={(e) => setObjForm((f) => ({ ...f, objective_type: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#D6E1EE] outline-none focus:border-[#0A7EA4]/60 bg-white">
                    {OBJ_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-[#607080] mb-1">Target Value *</label>
                    <input type="number" value={objForm.target_value} onChange={(e) => setObjForm((f) => ({ ...f, target_value: e.target.value }))}
                      placeholder="e.g. 50000"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-[#D6E1EE] outline-none focus:border-[#0A7EA4]/60" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-[#607080] mb-1">Unit</label>
                    <input type="text" value={objForm.target_unit} onChange={(e) => setObjForm((f) => ({ ...f, target_unit: e.target.value }))}
                      placeholder="count / pct"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-[#D6E1EE] outline-none focus:border-[#0A7EA4]/60" />
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowAddObjective(false)}
                  className="px-3 py-1.5 text-xs font-medium border border-[#D6E1EE] rounded-lg text-[#607080] hover:bg-[#EFF3F8]">
                  Cancel
                </button>
                <button onClick={handleAddObjective} disabled={createObjective.isPending}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-[#0A7EA4] rounded-lg disabled:opacity-50">
                  {createObjective.isPending ? "Adding…" : "Add"}
                </button>
              </div>
            </div>
          )}

          {objLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="animate-spin text-[#0A7EA4]" size={18} />
            </div>
          ) : objectives.length === 0 ? (
            <div className="text-center py-8 text-[#9EB0C1] text-xs">
              No objectives yet. Add one to track business targets.
            </div>
          ) : (
            <div className="divide-y divide-[#EAF0F7]">
              {objectives.map((obj) => {
                const pct = obj.target_value > 0
                  ? Math.min((obj.current_value / obj.target_value) * 100, 100) : 0;
                return (
                  <div key={obj.id} className="px-5 py-3.5">
                    <div className="flex items-start justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        {pct >= 100
                          ? <CheckCircle2 size={14} className="text-green-500 flex-shrink-0" />
                          : <Circle size={14} className="text-[#D6E1EE] flex-shrink-0" />
                        }
                        <span className="text-sm font-semibold text-[#0D1B2E]">{obj.name}</span>
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[#EFF3F8] text-[#607080]">
                          {OBJ_TYPES.find((t) => t.value === obj.objective_type)?.label || obj.objective_type}
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-[#0D1B2E] tabular-nums flex-shrink-0">
                        {formatNumber(obj.current_value)} / {formatNumber(obj.target_value)} {obj.target_unit}
                      </span>
                    </div>
                    <div className="pl-5.5">
                      <div className="h-1.5 bg-[#EAF0F7] rounded-full overflow-hidden ml-[22px]">
                        <div className="h-full rounded-full bg-[#0A7EA4] transition-all"
                          style={{ width: `${pct}%`, background: pct >= 100 ? "#16A34A" : "#0A7EA4" }} />
                      </div>
                      <p className="text-[10px] text-[#9EB0C1] mt-0.5 ml-[22px]">{Math.round(pct)}% complete · weight {obj.weight}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Campaigns in Plan */}
        <div className="bg-white rounded-xl border border-[#D6E1EE] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#EAF0F7]">
            <div className="flex items-center gap-2">
              <BarChart2 size={14} className="text-[#0A7EA4]" />
              <span className="text-sm font-bold text-[#0D1B2E]">Campaigns</span>
              {campaigns.length > 0 && (
                <span className="text-[10px] font-semibold text-[#9EB0C1] bg-[#EFF3F8] px-1.5 py-0.5 rounded-full">
                  {campaigns.length}
                </span>
              )}
            </div>
            <Link href={`/${operatorSlug}/campaigns`}
              className="flex items-center gap-1 text-xs font-medium text-[#0A7EA4] hover:underline">
              View all <ArrowRight size={11} />
            </Link>
          </div>

          {campaignsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="animate-spin text-[#0A7EA4]" size={18} />
            </div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-8 text-[#9EB0C1] text-xs">
              No campaigns linked to this plan yet. Set the monthly plan when creating a campaign.
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-[#F9FBFD] border-b border-[#EAF0F7]">
                  {["Campaign", "Status", "Channels", "Forecast Act.", "Forecast Rev."].map((h) => (
                    <th key={h} className="text-left text-[9px] font-bold text-[#9EB0C1] uppercase tracking-wide px-4 py-2.5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => {
                  const fAct = Number((c.forecast as Record<string, unknown>)?.expected_activations) || 0;
                  const fRev = Number((c.forecast as Record<string, unknown>)?.expected_revenue) || 0;
                  return (
                    <tr key={c.id} className="border-b border-[#EAF0F7] last:border-0 hover:bg-[#F9FBFD] transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/${operatorSlug}/campaigns/${c.id}`}
                          className="text-sm font-semibold text-[#0D1B2E] hover:text-[#0A7EA4] transition-colors truncate block max-w-[200px]">
                          {c.name}
                        </Link>
                        {c.planned_start_date && (
                          <span className="text-[10px] text-[#9EB0C1]">
                            {c.planned_start_date?.slice(0, 10)} → {c.planned_end_date?.slice(0, 10) || "…"}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${CAMPAIGN_STATUS_COLORS[c.status as keyof typeof CAMPAIGN_STATUS_COLORS] || "bg-gray-100 text-gray-600"}`}>
                          {CAMPAIGN_STATUS_LABELS[c.status as keyof typeof CAMPAIGN_STATUS_LABELS] || c.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(c.channels || []).slice(0, 3).map((ch) => (
                            <span key={ch} className="text-[9px] font-medium bg-[#EFF3F8] text-[#607080] px-1.5 py-0.5 rounded">
                              {CHANNEL_LABELS[ch] || ch}
                            </span>
                          ))}
                          {c.channels.length > 3 && (
                            <span className="text-[9px] text-[#9EB0C1]">+{c.channels.length - 3}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-[#3D4F63] tabular-nums">{fAct > 0 ? formatNumber(fAct) : "—"}</td>
                      <td className="px-4 py-3 text-sm text-[#3D4F63] tabular-nums">{fRev > 0 ? formatCurrency(fRev) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Plan Form Modal ──────────────────────────────────────────────────────────

function PlanFormModal({
  operatorSlug, plan, onClose, onSaved,
}: {
  operatorSlug: string; plan?: MonthlyPlan; onClose: () => void; onSaved: () => void;
}) {
  const editing = !!plan;
  const [name, setName] = useState(plan?.name ?? "");
  const [month, setMonth] = useState(() => {
    if (plan?.month) {
      const m = String(plan.month);
      return m.length >= 7 ? m.slice(0, 7) : m;
    }
    return new Date().toISOString().slice(0, 7);
  });
  const [targetActivations, setTargetActivations] = useState(String(plan?.target_activations ?? ""));
  const [targetRevenue, setTargetRevenue] = useState(String(plan?.target_revenue ?? ""));
  const [targetChurnReduction, setTargetChurnReduction] = useState(String(plan?.target_churn_reduction ?? ""));
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
        target_churn_reduction: parseFloat(targetChurnReduction) || 0,
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
        <h2 className="text-base font-bold text-[#0D1B2E] mb-4">{editing ? "Edit Plan" : "New Monthly Plan"}</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#607080] mb-1.5">Plan Name *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="e.g. CallerTunez June 2025 Plan" autoFocus
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-[#D6E1EE] outline-none focus:border-[#0A7EA4]/60 transition-colors" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#607080] mb-1.5">Month *</label>
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)}
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-[#D6E1EE] outline-none focus:border-[#0A7EA4]/60 transition-colors bg-white" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#607080] mb-1.5">Activation Target</label>
              <input type="number" value={targetActivations} onChange={(e) => setTargetActivations(e.target.value)}
                placeholder="50000"
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-[#D6E1EE] outline-none focus:border-[#0A7EA4]/60 transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#607080] mb-1.5">Revenue Target</label>
              <input type="number" value={targetRevenue} onChange={(e) => setTargetRevenue(e.target.value)}
                placeholder="75000"
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-[#D6E1EE] outline-none focus:border-[#0A7EA4]/60 transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#607080] mb-1.5">Churn Reduction %</label>
              <input type="number" value={targetChurnReduction} onChange={(e) => setTargetChurnReduction(e.target.value)}
                placeholder="5"
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-[#D6E1EE] outline-none focus:border-[#0A7EA4]/60 transition-colors" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#607080] mb-1.5">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Planning notes…"
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-[#D6E1EE] outline-none focus:border-[#0A7EA4]/60 transition-colors resize-none" />
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm font-medium rounded-lg border border-[#D6E1EE] text-[#607080]">Cancel</button>
          <button onClick={handleSave} disabled={loading} className="flex-1 py-2.5 text-sm font-semibold text-white rounded-lg bg-[#0A7EA4] disabled:opacity-50">
            {loading ? (editing ? "Saving…" : "Creating…") : (editing ? "Save Changes" : "Create Plan")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PlanningPage() {
  const { operatorSlug } = useParams<{ operatorSlug: string }>();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editPlan, setEditPlan] = useState<MonthlyPlan | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  const { data: plans = [], isLoading } = useQuery<MonthlyPlan[]>({
    queryKey: ["plans", operatorSlug],
    queryFn: () => api.getPlans(operatorSlug),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deletePlan(operatorSlug, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plans"] });
      toast.success("Plan deleted");
      setSelectedPlanId(null);
    },
    onError: () => toast.error("Failed to delete plan"),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.updatePlan(operatorSlug, id, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plans"] });
      toast.success("Status updated");
    },
    onError: () => toast.error("Failed to update status"),
  });

  function invalidate() { qc.invalidateQueries({ queryKey: ["plans"] }); }

  // Group by year using safe year parsing
  const grouped = plans.reduce<Record<number, MonthlyPlan[]>>((acc, p) => {
    const year = safeYear(p.month);
    acc[year] = acc[year] || [];
    acc[year].push(p);
    return acc;
  }, {});
  const years = Object.keys(grouped).map(Number).sort((a, b) => b - a);

  const selectedPlan = plans.find((p) => p.id === selectedPlanId) || null;

  // Auto-select first plan
  if (!selectedPlanId && plans.length > 0) {
    setSelectedPlanId(plans[0].id);
  }

  const activePlans = plans.filter((p) => p.status === "active").length;

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem-48px)] -mx-6 -my-6">
      {/* Top bar */}
      <div className="bg-white border-b border-[#D6E1EE] px-6 py-3.5 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-lg font-bold text-[#0D1B2E]">Monthly Planning</h1>
          <p className="text-xs text-[#9EB0C1]">
            {plans.length} plans total · {activePlans} active
          </p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#0A7EA4]">
          <Plus size={15} /> New Plan
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center flex-1">
          <Loader2 className="animate-spin text-[#0A7EA4]" size={24} />
        </div>
      ) : plans.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <CalendarDays size={40} className="mx-auto text-[#D6E1EE] mb-3" />
            <p className="font-semibold text-[#0D1B2E]">No monthly plans yet</p>
            <p className="text-sm text-[#9EB0C1] mt-1 mb-4">Create your first monthly marketing plan</p>
            <button onClick={() => setShowCreate(true)}
              className="px-4 py-2 text-sm font-semibold text-white bg-[#0A7EA4] rounded-lg">
              Create Plan
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          {/* Left: Plan List */}
          <div className="w-72 flex-shrink-0 bg-white border-r border-[#D6E1EE] overflow-y-auto">
            {years.map((year) => (
              <div key={year}>
                <div className="sticky top-0 px-4 py-2 bg-[#F9FBFD] border-b border-[#EAF0F7] z-10">
                  <span className="text-[10px] font-bold text-[#9EB0C1] uppercase tracking-wide">{year}</span>
                </div>
                {grouped[year].map((plan) => (
                  <button
                    key={plan.id}
                    onClick={() => setSelectedPlanId(plan.id)}
                    className={`w-full text-left px-4 py-3.5 border-b border-[#EAF0F7] transition-all hover:bg-[#EFF3F8] ${
                      selectedPlanId === plan.id ? "bg-[#EBF7FC] border-l-2 border-l-[#0A7EA4]" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-[#0A7EA4]">{safeFormatMonth(plan.month)}</span>
                      <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${PLAN_STATUS_STYLES[plan.status] || "bg-gray-100 text-gray-600"}`}>
                        {plan.status}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-[#0D1B2E] truncate">{plan.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {plan.target_activations > 0 && (
                        <span className="text-[10px] text-[#9EB0C1]">
                          Target: {formatNumber(plan.target_activations)} act
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ))}
          </div>

          {/* Right: Plan Detail */}
          {selectedPlan ? (
            <PlanDetailPanel
              key={selectedPlan.id}
              plan={selectedPlan}
              operatorSlug={operatorSlug}
              onEdit={() => setEditPlan(selectedPlan)}
              onDelete={() => {
                if (confirm(`Delete "${selectedPlan.name}"?`)) deleteMutation.mutate(selectedPlan.id);
              }}
              onStatusChange={(status) => updateStatusMutation.mutate({ id: selectedPlan.id, status })}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center bg-[#F4F7FA]">
              <p className="text-sm text-[#9EB0C1]">Select a plan to see details</p>
            </div>
          )}
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
