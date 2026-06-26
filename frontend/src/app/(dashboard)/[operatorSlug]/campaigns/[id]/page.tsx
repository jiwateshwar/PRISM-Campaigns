"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import type { Campaign, Segment, Offer, Creative, Journey, SupportTask, MonthlyPlan } from "@/types";
import { formatDate, formatNumber, formatCurrency, formatPercent } from "@/lib/utils";
import { CAMPAIGN_STATUS_LABELS, CAMPAIGN_STATUS_COLORS, CHANNEL_LABELS, PRIORITY_LABELS } from "@/types";
import { toast } from "sonner";
import {
  ArrowLeft, Save, Loader2, Target, TrendingUp, Users, Calendar,
  CheckSquare, Plus, Trash2, ExternalLink, UploadCloud, AlertTriangle
} from "lucide-react";
import Link from "next/link";

const STATUS_FLOW: Record<string, string> = {
  draft: "planned", planned: "ready", ready: "scheduled", scheduled: "executing",
  executing: "completed", completed: "results_imported", results_imported: "closed",
};

export default function CampaignDetailPage() {
  const { operatorSlug, id } = useParams<{ operatorSlug: string; id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const { data: campaign, isLoading } = useQuery<Campaign>({
    queryKey: ["campaign", id],
    queryFn: () => fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/${operatorSlug}/campaigns/${id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
    }).then((r) => r.json()),
  });

  const [tab, setTab] = useState<"details" | "forecast" | "tasks" | "actuals">("details");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<Campaign>>({});

  useEffect(() => { if (campaign) setForm(campaign); }, [campaign]);

  const { data: segments = [] } = useQuery<Segment[]>({ queryKey: ["segments", operatorSlug], queryFn: () => api.getSegments(operatorSlug, false) });
  const { data: offers = [] } = useQuery<Offer[]>({ queryKey: ["offers", operatorSlug], queryFn: () => api.getOffers(operatorSlug) });
  const { data: creatives = [] } = useQuery<Creative[]>({ queryKey: ["creatives", operatorSlug], queryFn: () => api.getCreatives(operatorSlug) });
  const { data: journeys = [] } = useQuery<Journey[]>({ queryKey: ["journeys", operatorSlug], queryFn: () => api.getJourneys(operatorSlug) });
  const { data: plans = [] } = useQuery<MonthlyPlan[]>({ queryKey: ["plans", operatorSlug], queryFn: () => api.getPlans(operatorSlug) });
  const { data: tasks = [] } = useQuery<SupportTask[]>({
    queryKey: ["tasks", id],
    queryFn: () => fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/${operatorSlug}/campaigns/${id}/tasks`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
    }).then((r) => r.json()),
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Campaign>) => api.updateCampaign(operatorSlug, id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["campaign", id] }); toast.success("Campaign updated"); setEditing(false); },
    onError: () => toast.error("Failed to update campaign"),
  });

  const advanceMutation = useMutation({
    mutationFn: (status: string) => api.updateCampaign(operatorSlug, id, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["campaign", id] }); toast.success("Status updated"); },
  });

  if (isLoading || !campaign) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-[#0A7EA4]" size={28} /></div>;
  }

  const nextStatus = STATUS_FLOW[campaign.status];
  const canAdvance = !!nextStatus;
  const selectedSegment = segments.find((s) => s.id === (form.segment_id || campaign.segment_id));
  const selectedOffer = offers.find((o) => o.id === (form.offer_id || campaign.offer_id));

  function setField<K extends keyof Campaign>(k: K, v: Campaign[K]) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  const TABS = [
    { key: "details" as const, label: "Details" },
    { key: "forecast" as const, label: "Forecast & KPIs" },
    { key: "tasks" as const, label: `Tasks (${tasks.length})` },
    { key: "actuals" as const, label: "Actuals" },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="bg-white rounded-xl border border-[#D6E1EE] p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href={`/${operatorSlug}/campaigns`} className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-[#EFF3F8] transition-colors">
              <ArrowLeft size={15} className="text-[#607080]" />
            </Link>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${CAMPAIGN_STATUS_COLORS[campaign.status as keyof typeof CAMPAIGN_STATUS_COLORS]}`}>
                  {CAMPAIGN_STATUS_LABELS[campaign.status as keyof typeof CAMPAIGN_STATUS_LABELS]}
                </span>
                <span className="text-[10px] text-[#9EB0C1]">Priority: {PRIORITY_LABELS[campaign.priority as keyof typeof PRIORITY_LABELS]}</span>
              </div>
              {editing ? (
                <input value={form.name || ""} onChange={(e) => setField("name", e.target.value)}
                  className="text-lg font-bold text-[#0D1B2E] border-b border-[#0A7EA4] outline-none bg-transparent" />
              ) : (
                <h1 className="text-lg font-bold text-[#0D1B2E]">{campaign.name}</h1>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canAdvance && !editing && (
              <button onClick={() => advanceMutation.mutate(nextStatus)} disabled={advanceMutation.isPending}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#EBF7FC] text-[#0A7EA4] hover:bg-[#D0EDF7] transition-colors disabled:opacity-50">
                → {CAMPAIGN_STATUS_LABELS[nextStatus as keyof typeof CAMPAIGN_STATUS_LABELS]}
              </button>
            )}
            {editing ? (
              <>
                <button onClick={() => setEditing(false)} className="px-3 py-1.5 text-xs font-medium rounded-lg border border-[#D6E1EE] text-[#607080]">Cancel</button>
                <button onClick={() => updateMutation.mutate(form)} disabled={updateMutation.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#0A7EA4] rounded-lg disabled:opacity-50">
                  {updateMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                  Save
                </button>
              </>
            ) : (
              <button onClick={() => setEditing(true)} className="px-3 py-1.5 text-xs font-semibold text-[#607080] border border-[#D6E1EE] rounded-lg hover:bg-[#EFF3F8] transition-colors">
                Edit
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#D6E1EE]">
        {TABS.map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${tab === key ? "border-[#0A7EA4] text-[#0A7EA4]" : "border-transparent text-[#607080] hover:text-[#0D1B2E]"}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Details tab */}
      {tab === "details" && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <div className="bg-white rounded-xl border border-[#D6E1EE] p-5 space-y-4">
            <h3 className="text-sm font-bold text-[#0D1B2E]">Campaign Configuration</h3>

            <div>
              <label className="block text-[10px] font-semibold text-[#9EB0C1] uppercase tracking-wide mb-1.5">Description</label>
              {editing ? (
                <textarea value={form.description || ""} onChange={(e) => setField("description", e.target.value)} rows={2}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[#D6E1EE] outline-none focus:border-[#0A7EA4]/60 resize-none" />
              ) : (
                <p className="text-sm text-[#3D4F63]">{campaign.description || "—"}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-semibold text-[#9EB0C1] uppercase tracking-wide mb-1.5">Segment</label>
                {editing ? (
                  <select value={form.segment_id || ""} onChange={(e) => setField("segment_id", e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#D6E1EE] outline-none focus:border-[#0A7EA4]/60 bg-white">
                    <option value="">None</option>
                    {segments.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                ) : (
                  <p className="text-sm font-medium text-[#0D1B2E]">{selectedSegment?.name || "—"}</p>
                )}
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-[#9EB0C1] uppercase tracking-wide mb-1.5">Offer</label>
                {editing ? (
                  <select value={form.offer_id || ""} onChange={(e) => setField("offer_id", e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#D6E1EE] outline-none focus:border-[#0A7EA4]/60 bg-white">
                    <option value="">None</option>
                    {offers.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                ) : (
                  <p className="text-sm font-medium text-[#0D1B2E]">{offers.find((o) => o.id === campaign.offer_id)?.name || "—"}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-semibold text-[#9EB0C1] uppercase tracking-wide mb-1.5">Creative</label>
                {editing ? (
                  <select value={form.creative_id || ""} onChange={(e) => setField("creative_id", e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#D6E1EE] outline-none focus:border-[#0A7EA4]/60 bg-white">
                    <option value="">None</option>
                    {creatives.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                ) : (
                  <p className="text-sm font-medium text-[#0D1B2E]">{creatives.find((c) => c.id === campaign.creative_id)?.name || "—"}</p>
                )}
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-[#9EB0C1] uppercase tracking-wide mb-1.5">Journey</label>
                {editing ? (
                  <select value={form.journey_id || ""} onChange={(e) => setField("journey_id", e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#D6E1EE] outline-none focus:border-[#0A7EA4]/60 bg-white">
                    <option value="">None</option>
                    {journeys.map((j) => <option key={j.id} value={j.id}>{j.name}</option>)}
                  </select>
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-[#0D1B2E]">{journeys.find((j) => j.id === campaign.journey_id)?.name || "—"}</p>
                    {campaign.journey_id && (
                      <Link href={`/${operatorSlug}/journeys/${campaign.journey_id}`} className="text-[#0A7EA4] hover:text-[#0A7EA4]/80">
                        <ExternalLink size={12} />
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-semibold text-[#9EB0C1] uppercase tracking-wide mb-1.5">Planned Start</label>
                {editing ? (
                  <input type="date" value={(form.planned_start_date || "").slice(0, 10)} onChange={(e) => setField("planned_start_date", e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#D6E1EE] outline-none focus:border-[#0A7EA4]/60 bg-white" />
                ) : (
                  <p className="text-sm text-[#3D4F63]">{campaign.planned_start_date ? formatDate(campaign.planned_start_date) : "—"}</p>
                )}
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-[#9EB0C1] uppercase tracking-wide mb-1.5">Planned End</label>
                {editing ? (
                  <input type="date" value={(form.planned_end_date || "").slice(0, 10)} onChange={(e) => setField("planned_end_date", e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#D6E1EE] outline-none focus:border-[#0A7EA4]/60 bg-white" />
                ) : (
                  <p className="text-sm text-[#3D4F63]">{campaign.planned_end_date ? formatDate(campaign.planned_end_date) : "—"}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-[#9EB0C1] uppercase tracking-wide mb-1.5">Channels</label>
              <div className="flex flex-wrap gap-1.5">
                {(campaign.channels || []).map((ch) => (
                  <span key={ch} className="text-xs px-2 py-0.5 rounded-full bg-[#EBF7FC] text-[#0A7EA4] font-medium">
                    {CHANNEL_LABELS[ch as keyof typeof CHANNEL_LABELS] || ch}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {/* Audience summary */}
            {selectedSegment && (
              <div className="bg-white rounded-xl border border-[#D6E1EE] p-5">
                <h3 className="text-sm font-bold text-[#0D1B2E] mb-3">Audience</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-[#EFF3F8] p-3">
                    <div className="text-[10px] text-[#9EB0C1] mb-0.5">Estimated Reach</div>
                    <div className="text-base font-bold text-[#0D1B2E] tabular-nums">{formatNumber(selectedSegment.estimated_audience_size)}</div>
                  </div>
                  <div className="rounded-lg bg-[#EFF3F8] p-3">
                    <div className="text-[10px] text-[#9EB0C1] mb-0.5">Eligible</div>
                    <div className="text-base font-bold text-[#0D1B2E] tabular-nums">{formatNumber(selectedSegment.eligible_audience_size)}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="bg-white rounded-xl border border-[#D6E1EE] p-5">
              <h3 className="text-sm font-bold text-[#0D1B2E] mb-3">Notes</h3>
              {editing ? (
                <textarea value={form.notes || ""} onChange={(e) => setField("notes", e.target.value)} rows={4} placeholder="Campaign notes…"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[#D6E1EE] outline-none focus:border-[#0A7EA4]/60 resize-none" />
              ) : (
                <p className="text-sm text-[#3D4F63] whitespace-pre-wrap">{campaign.notes || "No notes"}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Forecast tab */}
      {tab === "forecast" && (
        <div className="bg-white rounded-xl border border-[#D6E1EE] p-5">
          <h3 className="text-sm font-bold text-[#0D1B2E] mb-4">KPI Forecast</h3>
          <p className="text-xs text-[#9EB0C1] mb-5">Forecasts auto-calculate from segment reach × offer conversion rate × ARPU</p>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            {[
              { label: "Forecast Reach", value: formatNumber(campaign.forecast?.estimated_reach || selectedSegment?.estimated_audience_size || 0), icon: Users },
              { label: "Forecast Activations", value: formatNumber(campaign.forecast?.expected_activations || 0), icon: Target },
              { label: "Conversion Rate", value: formatPercent(campaign.forecast?.expected_conversion_pct || selectedOffer?.expected_conversion_rate || 0), icon: TrendingUp },
              { label: "Forecast Revenue", value: formatCurrency(campaign.forecast?.expected_revenue || 0, "USD"), icon: TrendingUp },
            ].map((kpi, i) => (
              <div key={i} className="rounded-xl bg-[#EFF3F8] p-4">
                <div className="text-[10px] text-[#9EB0C1] uppercase tracking-wide mb-1">{kpi.label}</div>
                <div className="text-lg font-bold text-[#0D1B2E] tabular-nums">{kpi.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tasks tab */}
      {tab === "tasks" && (
        <div className="bg-white rounded-xl border border-[#D6E1EE] p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-[#0D1B2E]">Support Tasks</h3>
            <AddTaskInline campaignId={id} operatorSlug={operatorSlug} />
          </div>
          {tasks.length === 0 ? (
            <div className="text-center py-12 text-sm text-[#9EB0C1]">No tasks yet. Add support requirements for this campaign.</div>
          ) : (
            <div className="space-y-2">
              {tasks.map((task) => (
                <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg border border-[#EAF0F7] hover:bg-[#F9FBFD] transition-colors">
                  <CheckSquare size={16} className={task.status === "completed" ? "text-green-500" : "text-[#9EB0C1]"} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#0D1B2E] truncate">{task.title}</p>
                    <div className="flex items-center gap-3 text-[10px] text-[#9EB0C1] mt-0.5">
                      <span>{task.team}</span>
                      {task.owner && <span>· {task.owner}</span>}
                      {task.due_date && <span>· Due {formatDate(task.due_date)}</span>}
                    </div>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${task.status === "completed" ? "bg-green-50 text-green-700" : task.status === "in_progress" ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-500"}`}>
                    {task.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actuals tab */}
      {tab === "actuals" && (
        <ActualsSection campaign={campaign} operatorSlug={operatorSlug} onImported={() => qc.invalidateQueries({ queryKey: ["campaign", id] })} />
      )}
    </div>
  );
}

function AddTaskInline({ campaignId, operatorSlug }: { campaignId: string; operatorSlug: string }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [team, setTeam] = useState("");
  const qc = useQueryClient();

  async function add() {
    if (!title || !team) { toast.error("Title and team are required"); return; }
    await api.createSupportTask(operatorSlug, campaignId, { title, team, status: "pending" });
    qc.invalidateQueries({ queryKey: ["tasks", campaignId] });
    toast.success("Task added");
    setTitle(""); setTeam(""); setOpen(false);
  }

  if (!open) return (
    <button onClick={() => setOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#0A7EA4] bg-[#EBF7FC] rounded-lg hover:bg-[#D0EDF7] transition-colors">
      <Plus size={12} /> Add Task
    </button>
  );

  return (
    <div className="flex items-center gap-2">
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task title" autoFocus
        className="px-2.5 py-1.5 text-xs rounded-lg border border-[#D6E1EE] outline-none focus:border-[#0A7EA4]/60 w-40" />
      <input value={team} onChange={(e) => setTeam(e.target.value)} placeholder="Team"
        className="px-2.5 py-1.5 text-xs rounded-lg border border-[#D6E1EE] outline-none focus:border-[#0A7EA4]/60 w-28" />
      <button onClick={add} className="px-2.5 py-1.5 text-xs font-semibold text-white bg-[#0A7EA4] rounded-lg">Add</button>
      <button onClick={() => setOpen(false)} className="px-2.5 py-1.5 text-xs text-[#607080] border border-[#D6E1EE] rounded-lg">×</button>
    </div>
  );
}

function ActualsSection({ campaign, operatorSlug, onImported }: { campaign: Campaign; operatorSlug: string; onImported: () => void }) {
  const [reach, setReach] = useState("");
  const [activations, setActivations] = useState("");
  const [revenue, setRevenue] = useState("");
  const [convRate, setConvRate] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleImport() {
    if (!activations) { toast.error("Actual activations is required"); return; }
    setLoading(true);
    try {
      await api.importActuals(operatorSlug, campaign.id, {
        actual_reach: parseInt(reach) || 0,
        actual_activations: parseInt(activations) || 0,
        actual_revenue: parseFloat(revenue) || 0,
        actual_conversion_rate: parseFloat(convRate) || 0,
      });
      toast.success("Actuals imported — campaign moved to results_imported");
      onImported();
    } catch { toast.error("Failed to import actuals"); }
    finally { setLoading(false); }
  }

  const hasActuals = !!campaign.actuals;

  return (
    <div className="bg-white rounded-xl border border-[#D6E1EE] p-5">
      <h3 className="text-sm font-bold text-[#0D1B2E] mb-4">Actual Results</h3>
      {hasActuals ? (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { label: "Actual Reach", value: formatNumber(campaign.actuals?.actual_reach || 0) },
            { label: "Actual Activations", value: formatNumber(campaign.actuals?.actual_activations || 0) },
            { label: "Actual Revenue", value: formatCurrency(campaign.actuals?.actual_revenue || 0, "USD") },
            { label: "Actual Conv. Rate", value: formatPercent(campaign.actuals?.actual_conversion_rate || 0) },
          ].map((kpi, i) => (
            <div key={i} className="rounded-xl bg-green-50 p-4">
              <div className="text-[10px] text-green-600 uppercase tracking-wide mb-1">{kpi.label}</div>
              <div className="text-lg font-bold text-green-800 tabular-nums">{kpi.value}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-center gap-2 text-xs text-amber-800">
            <AlertTriangle size={14} className="text-amber-500 flex-shrink-0" />
            Importing actuals will advance this campaign to <strong>results_imported</strong> status.
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Actual Reach", val: reach, set: setReach, placeholder: "Subscribers reached" },
              { label: "Actual Activations *", val: activations, set: setActivations, placeholder: "Successful activations" },
              { label: "Actual Revenue", val: revenue, set: setRevenue, placeholder: "Total revenue" },
              { label: "Actual Conv. Rate (%)", val: convRate, set: setConvRate, placeholder: "e.g. 14.2" },
            ].map(({ label, val, set, placeholder }) => (
              <div key={label}>
                <label className="block text-[10px] font-semibold text-[#607080] uppercase tracking-wide mb-1.5">{label}</label>
                <input type="number" value={val} onChange={(e) => set(e.target.value)} placeholder={placeholder}
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-[#D6E1EE] outline-none focus:border-[#0A7EA4]/60 transition-colors" />
              </div>
            ))}
          </div>
          <button onClick={handleImport} disabled={loading} className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#0A7EA4] rounded-lg disabled:opacity-50">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={14} />}
            Import Actuals
          </button>
        </div>
      )}
    </div>
  );
}
