"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/layout/header";
import {
  Campaign, CAMPAIGN_STATUS_LABELS, CAMPAIGN_STATUS_COLORS,
  PRIORITY_LABELS, PRIORITY_COLORS, CHANNEL_LABELS,
} from "@/types";
import { formatDate, formatNumber, truncate } from "@/lib/utils";
import { toast } from "sonner";
import {
  Plus, Search, Megaphone, Calendar, Users, Loader2, Trash2, Pencil,
} from "lucide-react";

const STATUS_OPTIONS = ["all", "draft", "planned", "ready", "scheduled", "executing", "completed", "results_imported", "closed"];
const ALL_CHANNELS = ["sms", "whatsapp", "ussd", "obd", "ivr", "push", "email"];

function CampaignCard({
  campaign, operatorSlug, onEdit, onDelete,
}: {
  campaign: Campaign; operatorSlug: string; onEdit: () => void; onDelete: () => void;
}) {
  const router = useRouter();
  const statusColor = CAMPAIGN_STATUS_COLORS[campaign.status] || "bg-gray-100 text-gray-600";
  const statusLabel = CAMPAIGN_STATUS_LABELS[campaign.status] || campaign.status;
  const priorityColor = PRIORITY_COLORS[campaign.priority] || "";
  const priorityLabel = PRIORITY_LABELS[campaign.priority] || "";

  return (
    <div
      className="bg-white rounded-xl border border-[#D6E1EE] p-5 hover:border-[#0A7EA4]/40 hover:shadow-sm transition-all cursor-pointer group"
      onClick={() => router.push(`/${operatorSlug}/campaigns/${campaign.id}`)}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-[#0D1B2E] text-sm truncate">{campaign.name}</h3>
          {campaign.description && (
            <p className="text-xs text-[#607080] mt-0.5 truncate">{truncate(campaign.description, 80)}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusColor}`}>
            {statusLabel}
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
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {campaign.channels.slice(0, 4).map((ch) => (
          <span key={ch} className="text-[10px] font-medium px-2 py-0.5 rounded bg-[#EBF7FC] text-[#0A7EA4] border border-[#D0EDF7]">
            {CHANNEL_LABELS[ch] || ch}
          </span>
        ))}
        {campaign.channels.length > 4 && (
          <span className="text-[10px] text-[#9EB0C1]">+{campaign.channels.length - 4}</span>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-[#9EB0C1]">
        <div className="flex items-center gap-3">
          {campaign.planned_start_date && (
            <span className="flex items-center gap-1">
              <Calendar size={11} />
              {formatDate(campaign.planned_start_date)}
            </span>
          )}
          {campaign.forecast?.expected_activations ? (
            <span className="flex items-center gap-1">
              <Users size={11} />
              {formatNumber(campaign.forecast.expected_activations as number)} activations
            </span>
          ) : null}
        </div>
        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${priorityColor}`}>
          {priorityLabel}
        </span>
      </div>
    </div>
  );
}

export default function CampaignsPage() {
  const { operatorSlug } = useParams<{ operatorSlug: string }>();
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editCampaign, setEditCampaign] = useState<Campaign | null>(null);
  const qc = useQueryClient();

  const { data: campaigns = [], isLoading } = useQuery<Campaign[]>({
    queryKey: ["campaigns", operatorSlug, statusFilter],
    queryFn: () => api.getCampaigns(operatorSlug, statusFilter !== "all" ? { status: statusFilter } : {}),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteCampaign(operatorSlug, id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["campaigns", operatorSlug] }); toast.success("Campaign deleted"); },
    onError: () => toast.error("Failed to delete campaign"),
  });

  const filtered = campaigns.filter((c) => !search || c.name.toLowerCase().includes(search.toLowerCase()));

  const grouped = filtered.reduce<Record<string, Campaign[]>>((acc, c) => {
    acc[c.status] = acc[c.status] || [];
    acc[c.status].push(c);
    return acc;
  }, {});

  function invalidate() { qc.invalidateQueries({ queryKey: ["campaigns", operatorSlug] }); }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Campaigns"
        description="Manage all marketing campaigns for this operator"
        actions={
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#0A7EA4] hover:bg-[#0A7EA4]/90 transition-colors"
          >
            <Plus size={15} />
            New Campaign
          </button>
        }
      />

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9EB0C1]" />
          <input
            type="text" placeholder="Search campaigns…" value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 pr-4 py-2 text-sm rounded-lg border border-[#D6E1EE] bg-white outline-none focus:border-[#0A7EA4]/50 transition-colors w-56"
          />
        </div>
        <div className="flex items-center gap-1 bg-white border border-[#D6E1EE] rounded-lg p-1 overflow-x-auto">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all whitespace-nowrap ${
                statusFilter === s ? "bg-[#0A7EA4] text-white" : "text-[#607080] hover:bg-[#EFF3F8]"
              }`}
            >
              {s === "all" ? "All" : CAMPAIGN_STATUS_LABELS[s as keyof typeof CAMPAIGN_STATUS_LABELS]}
              {s !== "all" && campaigns.filter((c) => c.status === s).length > 0 && (
                <span className="ml-1 opacity-70">({campaigns.filter((c) => c.status === s).length})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="animate-spin text-[#0A7EA4]" size={24} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-[#D6E1EE]">
          <Megaphone size={36} className="mx-auto text-[#D6E1EE] mb-3" />
          <p className="font-semibold text-[#0D1B2E]">No campaigns found</p>
          <p className="text-sm text-[#9EB0C1] mt-1">
            {search ? "Try a different search term" : "Create your first campaign to get started"}
          </p>
          <button onClick={() => setShowCreate(true)} className="mt-4 px-4 py-2 text-sm font-semibold text-white bg-[#0A7EA4] rounded-lg">
            Create Campaign
          </button>
        </div>
      ) : statusFilter === "all" ? (
        <div className="space-y-6">
          {Object.entries(grouped).map(([status, items]) => (
            <div key={status}>
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${CAMPAIGN_STATUS_COLORS[status as keyof typeof CAMPAIGN_STATUS_COLORS]}`}>
                  {CAMPAIGN_STATUS_LABELS[status as keyof typeof CAMPAIGN_STATUS_LABELS] || status}
                </span>
                <span className="text-xs text-[#9EB0C1]">{items.length} campaign{items.length !== 1 ? "s" : ""}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {items.map((campaign) => (
                  <CampaignCard
                    key={campaign.id}
                    campaign={campaign}
                    operatorSlug={operatorSlug}
                    onEdit={() => setEditCampaign(campaign)}
                    onDelete={() => { if (confirm(`Delete "${campaign.name}"?`)) deleteMutation.mutate(campaign.id); }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              operatorSlug={operatorSlug}
              onEdit={() => setEditCampaign(campaign)}
              onDelete={() => { if (confirm(`Delete "${campaign.name}"?`)) deleteMutation.mutate(campaign.id); }}
            />
          ))}
        </div>
      )}

      {showCreate && (
        <CampaignFormModal
          operatorSlug={operatorSlug}
          onClose={() => setShowCreate(false)}
          onSaved={() => { invalidate(); setShowCreate(false); }}
        />
      )}

      {editCampaign && (
        <CampaignFormModal
          operatorSlug={operatorSlug}
          campaign={editCampaign}
          onClose={() => setEditCampaign(null)}
          onSaved={() => { invalidate(); setEditCampaign(null); }}
        />
      )}
    </div>
  );
}

function CampaignFormModal({
  operatorSlug, campaign, onClose, onSaved,
}: {
  operatorSlug: string; campaign?: Campaign; onClose: () => void; onSaved: () => void;
}) {
  const editing = !!campaign;
  const [name, setName] = useState(campaign?.name ?? "");
  const [description, setDescription] = useState(campaign?.description ?? "");
  const [priority, setPriority] = useState(campaign?.priority ?? 3);
  const [status, setStatus] = useState<string>(campaign?.status ?? "draft");
  const [channels, setChannels] = useState<string[]>(campaign?.channels ?? []);
  const [startDate, setStartDate] = useState(campaign?.planned_start_date ?? "");
  const [endDate, setEndDate] = useState(campaign?.planned_end_date ?? "");
  const [notes, setNotes] = useState(campaign?.notes ?? "");
  const [loading, setLoading] = useState(false);

  function toggleChannel(ch: string) {
    setChannels((prev) => prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]);
  }

  async function handleSave() {
    if (!name.trim()) { toast.error("Campaign name is required"); return; }
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        name, description, priority, status, channels,
        planned_start_date: startDate || null,
        planned_end_date: endDate || null,
        notes,
      };
      if (editing) {
        await api.updateCampaign(operatorSlug, campaign!.id, payload);
        toast.success("Campaign updated");
      } else {
        await api.createCampaign(operatorSlug, payload);
        toast.success("Campaign created");
      }
      onSaved();
    } catch {
      toast.error(editing ? "Failed to update campaign" : "Failed to create campaign");
    } finally {
      setLoading(false);
    }
  }

  const CHANNEL_LABELS_LOCAL: Record<string, string> = {
    sms: "SMS", whatsapp: "WhatsApp", ussd: "USSD",
    obd: "OBD", ivr: "IVR", push: "Push", email: "Email",
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl border shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-base font-bold text-[#0D1B2E] mb-4">
          {editing ? "Edit Campaign" : "New Campaign"}
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#607080] mb-1.5">Campaign Name *</label>
            <input
              type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="e.g. RBT June Activation Drive" autoFocus
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-[#D6E1EE] outline-none focus:border-[#0A7EA4]/60 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#607080] mb-1.5">Description</label>
            <textarea
              value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
              placeholder="Brief description of campaign objective…"
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-[#D6E1EE] outline-none focus:border-[#0A7EA4]/60 transition-colors resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#607080] mb-1.5">Priority</label>
              <select
                value={priority} onChange={(e) => setPriority(Number(e.target.value))}
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-[#D6E1EE] outline-none focus:border-[#0A7EA4]/60 transition-colors bg-white"
              >
                <option value={1}>Critical</option>
                <option value={2}>High</option>
                <option value={3}>Medium</option>
                <option value={4}>Low</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#607080] mb-1.5">Status</label>
              <select
                value={status} onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-[#D6E1EE] outline-none focus:border-[#0A7EA4]/60 transition-colors bg-white"
              >
                {["draft", "planned", "ready", "scheduled", "executing", "completed", "results_imported", "closed"].map((s) => (
                  <option key={s} value={s}>{CAMPAIGN_STATUS_LABELS[s as keyof typeof CAMPAIGN_STATUS_LABELS] || s}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#607080] mb-1.5">Channels</label>
            <div className="flex flex-wrap gap-2">
              {ALL_CHANNELS.map((ch) => (
                <button
                  key={ch}
                  type="button"
                  onClick={() => toggleChannel(ch)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    channels.includes(ch)
                      ? "bg-[#EBF7FC] text-[#0A7EA4] border-[#0A7EA4]"
                      : "bg-white border-[#D6E1EE] text-[#607080]"
                  }`}
                >
                  {CHANNEL_LABELS_LOCAL[ch]}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#607080] mb-1.5">Start Date</label>
              <input
                type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-[#D6E1EE] outline-none focus:border-[#0A7EA4]/60 transition-colors bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#607080] mb-1.5">End Date</label>
              <input
                type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-[#D6E1EE] outline-none focus:border-[#0A7EA4]/60 transition-colors bg-white"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#607080] mb-1.5">Notes</label>
            <textarea
              value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              placeholder="Additional notes…"
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-[#D6E1EE] outline-none focus:border-[#0A7EA4]/60 transition-colors resize-none"
            />
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm font-medium rounded-lg border border-[#D6E1EE] text-[#607080] hover:bg-[#EFF3F8] transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} disabled={loading} className="flex-1 py-2.5 text-sm font-semibold text-white rounded-lg bg-[#0A7EA4] hover:bg-[#0A7EA4]/90 transition-colors disabled:opacity-50">
            {loading ? (editing ? "Saving…" : "Creating…") : (editing ? "Save Changes" : "Create Campaign")}
          </button>
        </div>
      </div>
    </div>
  );
}
