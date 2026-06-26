"use client";

import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/layout/header";
import type { Creative, ChannelType } from "@/types";
import { truncate } from "@/lib/utils";
import { toast } from "sonner";
import { Plus, Search, Image, Globe, Loader2, Trash2, Pencil } from "lucide-react";

const CHANNEL_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  sms: { label: "SMS", color: "#0A7EA4", bg: "#EBF7FC" },
  whatsapp: { label: "WhatsApp", color: "#16A34A", bg: "#DCFCE7" },
  ussd: { label: "USSD", color: "#7C3AED", bg: "#EDE9FE" },
  obd: { label: "OBD", color: "#B45309", bg: "#FEF3C7" },
  ivr: { label: "IVR", color: "#BE185D", bg: "#FCE7F3" },
  push: { label: "Push", color: "#0891B2", bg: "#CFFAFE" },
  email: { label: "Email", color: "#64748B", bg: "#F1F5F9" },
};

type CreativeStatus = "draft" | "approved" | "archived";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-500",
  approved: "bg-green-50 text-green-700",
  archived: "bg-orange-50 text-orange-700",
};

const CHANNELS = Object.keys(CHANNEL_STYLES);

function CreativeCard({ creative, onEdit, onDelete }: { creative: Creative; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="bg-white rounded-xl border border-[#D6E1EE] p-5 hover:border-[#0A7EA4]/40 hover:shadow-sm transition-all group">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="font-semibold text-[#0D1B2E] text-sm truncate">{creative.name}</h3>
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#EBF7FC] text-[#0A7EA4] flex-shrink-0">
              v{creative.current_version}
            </span>
          </div>
          {creative.telco_name && (
            <p className="text-[10px] text-[#9EB0C1]">{creative.telco_name} · {creative.language || "English"}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {creative.is_shared && (
            <span className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-700">
              <Globe size={9} />
              Shared
            </span>
          )}
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[creative.status]}`}>
            {creative.status}
          </span>
          <button
            onClick={onEdit}
            className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-md flex items-center justify-center hover:bg-[#EFF3F8] text-[#9EB0C1] hover:text-[#0A7EA4] transition-all"
          >
            <Pencil size={11} />
          </button>
          <button
            onClick={onDelete}
            className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-md flex items-center justify-center hover:bg-red-50 text-[#9EB0C1] hover:text-red-500 transition-all"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {creative.channels.map((ch) => {
          const style = CHANNEL_STYLES[ch] || { label: ch, color: "#64748B", bg: "#F1F5F9" };
          return (
            <span key={ch} className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ color: style.color, background: style.bg }}>
              {style.label}
            </span>
          );
        })}
      </div>

      {creative.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-2 border-t border-[#EAF0F7]">
          {creative.tags.slice(0, 4).map((tag) => (
            <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-[#EFF3F8] text-[#607080]">{tag}</span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CreativesPage() {
  const { operatorSlug } = useParams<{ operatorSlug: string }>();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [channelFilter, setChannelFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [editCreative, setEditCreative] = useState<Creative | null>(null);
  const qc = useQueryClient();

  const { data: creatives = [], isLoading } = useQuery<Creative[]>({
    queryKey: ["creatives", operatorSlug],
    queryFn: () => api.getCreatives(operatorSlug),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteCreative(operatorSlug, id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["creatives"] }); toast.success("Creative deleted"); },
    onError: () => toast.error("Failed to delete creative"),
  });

  const filtered = creatives.filter((c) => {
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    const matchChannel = channelFilter === "all" || c.channels.includes(channelFilter as ChannelType);
    return matchSearch && matchStatus && matchChannel;
  });

  function invalidate() { qc.invalidateQueries({ queryKey: ["creatives"] }); }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Creative Library"
        description="Multi-channel creative assets shared across campaigns"
        actions={
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#0A7EA4]">
            <Plus size={15} />
            New Creative
          </button>
        }
      />

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9EB0C1]" />
          <input type="text" placeholder="Search creatives…" value={search} onChange={(e) => setSearch(e.target.value)}
            className="pl-8 pr-4 py-2 text-sm rounded-lg border border-[#D6E1EE] bg-white outline-none focus:border-[#0A7EA4]/50 transition-colors w-56" />
        </div>
        {["all", "draft", "active", "archived"].map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${statusFilter === s ? "bg-[#0A7EA4] text-white" : "bg-white border border-[#D6E1EE] text-[#607080]"}`}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
        <div className="h-4 w-px bg-[#D6E1EE]" />
        {Object.entries(CHANNEL_STYLES).map(([key, { label }]) => (
          <button key={key} onClick={() => setChannelFilter(channelFilter === key ? "all" : key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${channelFilter === key ? "bg-[#0D1B2E] text-white" : "bg-white border border-[#D6E1EE] text-[#607080]"}`}>
            {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48"><Loader2 className="animate-spin text-[#0A7EA4]" size={24} /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-[#D6E1EE]">
          <Image size={36} className="mx-auto text-[#D6E1EE] mb-3" />
          <p className="font-semibold text-[#0D1B2E]">No creatives found</p>
          <button onClick={() => setShowCreate(true)} className="mt-4 px-4 py-2 text-sm font-semibold text-white bg-[#0A7EA4] rounded-lg">
            Create Creative
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((creative) => (
            <CreativeCard
              key={creative.id}
              creative={creative}
              onEdit={() => setEditCreative(creative)}
              onDelete={() => { if (confirm(`Delete "${creative.name}"?`)) deleteMutation.mutate(creative.id); }}
            />
          ))}
        </div>
      )}

      {showCreate && (
        <CreativeFormModal
          operatorSlug={operatorSlug}
          onClose={() => setShowCreate(false)}
          onSaved={() => { invalidate(); setShowCreate(false); }}
        />
      )}

      {editCreative && (
        <CreativeFormModal
          operatorSlug={operatorSlug}
          creative={editCreative}
          onClose={() => setEditCreative(null)}
          onSaved={() => { invalidate(); setEditCreative(null); }}
        />
      )}
    </div>
  );
}

function CreativeFormModal({ operatorSlug, creative, onClose, onSaved }: {
  operatorSlug: string; creative?: Creative; onClose: () => void; onSaved: () => void;
}) {
  const editing = !!creative;
  const [name, setName] = useState(creative?.name ?? "");
  const [selectedChannels, setSelectedChannels] = useState<string[]>(creative?.channels ?? []);
  const [telcoName, setTelcoName] = useState(creative?.telco_name ?? "");
  const [language, setLanguage] = useState(creative?.language ?? "English");
  const [status, setStatus] = useState<CreativeStatus>(creative?.status ?? "draft");
  const [isShared, setIsShared] = useState(creative?.is_shared ?? false);
  const [loading, setLoading] = useState(false);

  function toggleChannel(ch: string) {
    setSelectedChannels((prev) => prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]);
  }

  async function handleSave() {
    if (!name.trim()) { toast.error("Creative name is required"); return; }
    if (selectedChannels.length === 0) { toast.error("Select at least one channel"); return; }
    setLoading(true);
    try {
      const payload = { name, channels: selectedChannels, telco_name: telcoName, language, status, is_shared: isShared, content: creative?.content ?? {} };
      if (editing) {
        await api.updateCreative(operatorSlug, creative!.id, payload);
        toast.success("Creative updated");
      } else {
        await api.createCreative(operatorSlug, payload);
        toast.success("Creative created");
      }
      onSaved();
    } catch { toast.error(editing ? "Failed to update creative" : "Failed to create creative"); }
    finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl border shadow-xl w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-base font-bold text-[#0D1B2E] mb-4">{editing ? "Edit Creative" : "New Creative"}</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#607080] mb-1.5">Creative Name *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="e.g. RBT Activation SMS - June" autoFocus
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-[#D6E1EE] outline-none focus:border-[#0A7EA4]/60 transition-colors" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#607080] mb-1.5">Channels *</label>
            <div className="flex flex-wrap gap-2">
              {CHANNELS.map((ch) => {
                const style = CHANNEL_STYLES[ch];
                const selected = selectedChannels.includes(ch);
                return (
                  <button key={ch} onClick={() => toggleChannel(ch)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border-2 transition-all ${selected ? "border-current" : "border-transparent bg-[#EFF3F8] text-[#607080]"}`}
                    style={selected ? { color: style.color, background: style.bg, borderColor: style.color } : {}}>
                    {style.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#607080] mb-1.5">Telco Name</label>
              <input type="text" value={telcoName} onChange={(e) => setTelcoName(e.target.value)} placeholder="e.g. Airtel Ghana"
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-[#D6E1EE] outline-none focus:border-[#0A7EA4]/60 transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#607080] mb-1.5">Language</label>
              <input type="text" value={language} onChange={(e) => setLanguage(e.target.value)} placeholder="e.g. English"
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-[#D6E1EE] outline-none focus:border-[#0A7EA4]/60 transition-colors" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#607080] mb-1.5">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as CreativeStatus)}
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-[#D6E1EE] outline-none focus:border-[#0A7EA4]/60 transition-colors bg-white">
              <option value="draft">Draft</option>
              <option value="approved">Approved</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <div onClick={() => setIsShared(!isShared)}
              className={`w-9 h-5 rounded-full transition-colors flex items-center ${isShared ? "bg-[#0A7EA4]" : "bg-[#D6E1EE]"}`}>
              <div className={`w-4 h-4 rounded-full bg-white shadow-sm ml-0.5 transition-transform ${isShared ? "translate-x-4" : "translate-x-0"}`} />
            </div>
            <span className="text-xs font-medium text-[#3D4F63]">Shared across all operators</span>
          </label>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm font-medium rounded-lg border border-[#D6E1EE] text-[#607080]">Cancel</button>
          <button onClick={handleSave} disabled={loading} className="flex-1 py-2.5 text-sm font-semibold text-white rounded-lg bg-[#0A7EA4] disabled:opacity-50">
            {loading ? (editing ? "Saving…" : "Creating…") : (editing ? "Save Changes" : "Create Creative")}
          </button>
        </div>
      </div>
    </div>
  );
}
