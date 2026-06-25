"use client";

import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/layout/header";
import type { Segment } from "@/types";
import { formatDate, formatNumber, truncate } from "@/lib/utils";
import { toast } from "sonner";
import { Plus, Search, Users, Shield, GitBranch, Loader2, Trash2 } from "lucide-react";

function SegmentCard({ segment, onDelete }: { segment: Segment; onDelete: () => void }) {
  const reachPct = segment.estimated_audience_size > 0
    ? Math.round((segment.eligible_audience_size / segment.estimated_audience_size) * 100)
    : 0;

  return (
    <div className="bg-white rounded-xl border border-[#D6E1EE] p-5 hover:border-[#0A7EA4]/40 hover:shadow-sm transition-all group">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="font-semibold text-[#0D1B2E] text-sm truncate">{segment.name}</h3>
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#EBF7FC] text-[#0A7EA4] flex-shrink-0">
              v{segment.current_version}
            </span>
          </div>
          {segment.description && (
            <p className="text-xs text-[#607080] truncate">{truncate(segment.description, 80)}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${segment.is_active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
            {segment.is_active ? "Active" : "Inactive"}
          </span>
          <button
            onClick={onDelete}
            className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-md flex items-center justify-center hover:bg-red-50 text-[#9EB0C1] hover:text-red-500 transition-all"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="rounded-lg bg-[#EFF3F8] p-2.5">
          <div className="text-[10px] text-[#9EB0C1] font-medium uppercase tracking-wide mb-0.5">Est. Audience</div>
          <div className="text-sm font-bold text-[#0D1B2E] tabular-nums">{formatNumber(segment.estimated_audience_size)}</div>
        </div>
        <div className="rounded-lg bg-[#EFF3F8] p-2.5">
          <div className="text-[10px] text-[#9EB0C1] font-medium uppercase tracking-wide mb-0.5">Eligible</div>
          <div className="text-sm font-bold text-[#0D1B2E] tabular-nums">{formatNumber(segment.eligible_audience_size)}</div>
        </div>
      </div>

      <div className="mb-2">
        <div className="flex justify-between text-[10px] text-[#9EB0C1] mb-1">
          <span>Eligibility Rate</span>
          <span className="font-semibold">{reachPct}%</span>
        </div>
        <div className="h-1.5 bg-[#EAF0F7] rounded-full">
          <div className="h-full bg-[#0A7EA4] rounded-full" style={{ width: `${reachPct}%` }} />
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-[#9EB0C1] pt-2 border-t border-[#EAF0F7]">
        <span className="flex items-center gap-1">
          <Shield size={10} />
          No PII stored
        </span>
        <span>{segment.owner || "Unassigned"}</span>
      </div>
    </div>
  );
}

export default function SegmentsPage() {
  const { operatorSlug } = useParams<{ operatorSlug: string }>();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const qc = useQueryClient();

  const { data: segments = [], isLoading } = useQuery<Segment[]>({
    queryKey: ["segments", operatorSlug],
    queryFn: () => api.getSegments(operatorSlug, false),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.updateSegment(operatorSlug, id, { is_active: false }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["segments"] }); toast.success("Segment deactivated"); },
  });

  const filtered = segments.filter(
    (s) => !search || s.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Segment Library"
        description="Business-defined audience segments — no customer identities stored"
        actions={
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#0A7EA4] hover:bg-[#0A7EA4]/90 transition-colors"
          >
            <Plus size={15} />
            New Segment
          </button>
        }
      />

      <div className="bg-[#EBF7FC] border border-[#D0EDF7] rounded-lg px-4 py-3 flex items-center gap-3">
        <Shield size={16} className="text-[#0A7EA4] flex-shrink-0" />
        <p className="text-xs text-[#065F80]">
          <strong>Privacy first:</strong> This library stores only business rules and audience estimates.
          No MSISDNs, phone numbers, or customer identifiers are ever stored in Prism Campaigns.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9EB0C1]" />
          <input
            type="text"
            placeholder="Search segments…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 pr-4 py-2 text-sm rounded-lg border border-[#D6E1EE] bg-white outline-none focus:border-[#0A7EA4]/50 transition-colors w-56"
          />
        </div>
        <div className="text-xs text-[#9EB0C1]">{filtered.length} segment{filtered.length !== 1 ? "s" : ""}</div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48"><Loader2 className="animate-spin text-[#0A7EA4]" size={24} /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-[#D6E1EE]">
          <Users size={36} className="mx-auto text-[#D6E1EE] mb-3" />
          <p className="font-semibold text-[#0D1B2E]">No segments yet</p>
          <p className="text-sm text-[#9EB0C1] mt-1">Define your first audience segment</p>
          <button onClick={() => setShowForm(true)} className="mt-4 px-4 py-2 text-sm font-semibold text-white bg-[#0A7EA4] rounded-lg">
            Create Segment
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((segment) => (
            <SegmentCard
              key={segment.id}
              segment={segment}
              onDelete={() => deleteMutation.mutate(segment.id)}
            />
          ))}
        </div>
      )}

      {showForm && (
        <SegmentCreateModal
          operatorSlug={operatorSlug}
          onClose={() => setShowForm(false)}
          onCreated={() => { qc.invalidateQueries({ queryKey: ["segments"] }); setShowForm(false); }}
        />
      )}
    </div>
  );
}

function SegmentCreateModal({ operatorSlug, onClose, onCreated }: {
  operatorSlug: string; onClose: () => void; onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [owner, setOwner] = useState("");
  const [estSize, setEstSize] = useState("");
  const [eligSize, setEligSize] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    if (!name.trim()) { toast.error("Segment name is required"); return; }
    setLoading(true);
    try {
      await api.createSegment(operatorSlug, {
        name,
        description,
        owner,
        business_rules: {},
        estimated_audience_size: parseInt(estSize) || 0,
        eligible_audience_size: parseInt(eligSize) || 0,
        notes,
      });
      toast.success("Segment created");
      onCreated();
    } catch {
      toast.error("Failed to create segment");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl border border-[#D6E1EE] shadow-xl w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-base font-bold text-[#0D1B2E] mb-4">New Audience Segment</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#607080] mb-1.5">Segment Name *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. High Value Subscribers" autoFocus
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-[#D6E1EE] outline-none focus:border-[#0A7EA4]/60 transition-colors" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#607080] mb-1.5">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Business description of who this segment includes…"
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-[#D6E1EE] outline-none focus:border-[#0A7EA4]/60 transition-colors resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#607080] mb-1.5">Estimated Audience Size</label>
              <input type="number" value={estSize} onChange={(e) => setEstSize(e.target.value)} placeholder="e.g. 250000"
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-[#D6E1EE] outline-none focus:border-[#0A7EA4]/60 transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#607080] mb-1.5">Eligible Audience Size</label>
              <input type="number" value={eligSize} onChange={(e) => setEligSize(e.target.value)} placeholder="e.g. 220000"
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-[#D6E1EE] outline-none focus:border-[#0A7EA4]/60 transition-colors" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#607080] mb-1.5">Owner</label>
            <input type="text" value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="e.g. Marketing Team"
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-[#D6E1EE] outline-none focus:border-[#0A7EA4]/60 transition-colors" />
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm font-medium rounded-lg border border-[#D6E1EE] text-[#607080]">Cancel</button>
          <button onClick={handleCreate} disabled={loading} className="flex-1 py-2.5 text-sm font-semibold text-white rounded-lg bg-[#0A7EA4] disabled:opacity-50">
            {loading ? "Creating…" : "Create Segment"}
          </button>
        </div>
      </div>
    </div>
  );
}
