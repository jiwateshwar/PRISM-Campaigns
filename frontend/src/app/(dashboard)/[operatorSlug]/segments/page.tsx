"use client";

import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/layout/header";
import type { Segment } from "@/types";
import { formatNumber, truncate } from "@/lib/utils";
import { toast } from "sonner";
import { Plus, Search, Users, Shield, Loader2, Trash2, Pencil } from "lucide-react";

function SegmentCard({ segment, onEdit, onDelete }: {
  segment: Segment; onEdit: () => void; onDelete: () => void;
}) {
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
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${segment.is_active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
            {segment.is_active ? "Active" : "Inactive"}
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
  const [showCreate, setShowCreate] = useState(false);
  const [editSegment, setEditSegment] = useState<Segment | null>(null);
  const qc = useQueryClient();

  const { data: segments = [], isLoading } = useQuery<Segment[]>({
    queryKey: ["segments", operatorSlug],
    queryFn: () => api.getSegments(operatorSlug, false),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => api.updateSegment(operatorSlug, id, { is_active: false }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["segments"] }); toast.success("Segment deactivated"); },
    onError: () => toast.error("Failed to deactivate segment"),
  });

  const filtered = segments.filter(
    (s) => !search || s.name.toLowerCase().includes(search.toLowerCase())
  );

  function invalidate() { qc.invalidateQueries({ queryKey: ["segments"] }); }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Segment Library"
        description="Business-defined audience segments — no customer identities stored"
        actions={
          <button
            onClick={() => setShowCreate(true)}
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
          <button onClick={() => setShowCreate(true)} className="mt-4 px-4 py-2 text-sm font-semibold text-white bg-[#0A7EA4] rounded-lg">
            Create Segment
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((segment) => (
            <SegmentCard
              key={segment.id}
              segment={segment}
              onEdit={() => setEditSegment(segment)}
              onDelete={() => {
                if (confirm(`Deactivate "${segment.name}"?`)) deactivateMutation.mutate(segment.id);
              }}
            />
          ))}
        </div>
      )}

      {showCreate && (
        <SegmentFormModal
          operatorSlug={operatorSlug}
          onClose={() => setShowCreate(false)}
          onSaved={() => { invalidate(); setShowCreate(false); }}
        />
      )}

      {editSegment && (
        <SegmentFormModal
          operatorSlug={operatorSlug}
          segment={editSegment}
          onClose={() => setEditSegment(null)}
          onSaved={() => { invalidate(); setEditSegment(null); }}
        />
      )}
    </div>
  );
}

// ─── Business Rules Editor ────────────────────────────────────────────────────

type Rule = { field: string; operator: string; value: string };
const OPERATORS = ["equals", "not_equals", "greater_than", "less_than", "in", "not_in", "contains"];

function parseRules(businessRules: Record<string, unknown>): Rule[] {
  const arr = businessRules?.rules;
  if (!Array.isArray(arr)) return [];
  return arr.filter((r): r is Rule => r && typeof r === "object" && "field" in r);
}

// ─── Segment Form Modal ───────────────────────────────────────────────────────

function SegmentFormModal({ operatorSlug, segment, onClose, onSaved }: {
  operatorSlug: string; segment?: Segment; onClose: () => void; onSaved: () => void;
}) {
  const editing = !!segment;
  const [name,        setName]        = useState(segment?.name ?? "");
  const [description, setDescription] = useState(segment?.description ?? "");
  const [owner,       setOwner]       = useState(segment?.owner ?? "");
  const [estSize,     setEstSize]     = useState(String(segment?.estimated_audience_size ?? ""));
  const [eligSize,    setEligSize]    = useState(String(segment?.eligible_audience_size ?? ""));
  const [notes,       setNotes]       = useState(segment?.notes ?? "");
  const [rules,       setRules]       = useState<Rule[]>(parseRules(segment?.business_rules ?? {}));
  const [logic,       setLogic]       = useState<string>((segment?.business_rules as { logic?: string })?.logic ?? "AND");
  const [loading,     setLoading]     = useState(false);

  function addRule()                                        { setRules((r) => [...r, { field: "", operator: "equals", value: "" }]); }
  function removeRule(i: number)                            { setRules((r) => r.filter((_, idx) => idx !== i)); }
  function updateRule(i: number, key: keyof Rule, val: string) {
    setRules((r) => r.map((rule, idx) => idx === i ? { ...rule, [key]: val } : rule));
  }

  async function handleSave() {
    if (!name.trim()) { toast.error("Segment name is required"); return; }
    setLoading(true);
    try {
      const payload = {
        name, description, owner,
        business_rules: rules.length > 0 ? { rules, logic } : {},
        estimated_audience_size: parseInt(estSize) || 0,
        eligible_audience_size:  parseInt(eligSize) || 0,
        notes,
      };
      if (editing) {
        await api.updateSegment(operatorSlug, segment!.id, payload);
        toast.success("Segment updated");
      } else {
        await api.createSegment(operatorSlug, payload);
        toast.success("Segment created");
      }
      onSaved();
    } catch {
      toast.error(editing ? "Failed to update segment" : "Failed to create segment");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl border border-[#D6E1EE] shadow-xl w-full max-w-xl flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-[#EAF0F7] flex-shrink-0">
          <h2 className="text-base font-bold text-[#0D1B2E]">{editing ? "Edit Segment" : "New Audience Segment"}</h2>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#607080] mb-1.5">Segment Name *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="e.g. High Value Subscribers" autoFocus
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-[#D6E1EE] outline-none focus:border-[#0A7EA4]/60" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#607080] mb-1.5">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
              placeholder="Business description of who this segment includes…"
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-[#D6E1EE] outline-none focus:border-[#0A7EA4]/60 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#607080] mb-1.5">Estimated Audience Size</label>
              <input type="number" value={estSize} onChange={(e) => setEstSize(e.target.value)} placeholder="e.g. 250000"
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-[#D6E1EE] outline-none focus:border-[#0A7EA4]/60" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#607080] mb-1.5">Eligible Audience Size</label>
              <input type="number" value={eligSize} onChange={(e) => setEligSize(e.target.value)} placeholder="e.g. 220000"
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-[#D6E1EE] outline-none focus:border-[#0A7EA4]/60" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#607080] mb-1.5">Owner</label>
            <input type="text" value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="e.g. Marketing Team"
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-[#D6E1EE] outline-none focus:border-[#0A7EA4]/60" />
          </div>

          {/* Business Rules section */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-[10px] font-bold text-[#9EB0C1] uppercase tracking-widest">Business Rules</span>
              <div className="flex-1 h-px bg-[#EAF0F7]" />
              {rules.length > 1 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-[#9EB0C1]">Logic:</span>
                  {(["AND", "OR"] as const).map((l) => (
                    <button key={l} onClick={() => setLogic(l)}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded transition-all ${logic === l ? "bg-[#0A7EA4] text-white" : "bg-[#EFF3F8] text-[#607080]"}`}>
                      {l}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <p className="text-[10px] text-[#9EB0C1] mb-3">
              Define who qualifies. No customer data is stored — these are business criteria only.
            </p>

            {rules.length === 0 ? (
              <div className="text-center py-4 bg-[#F9FBFD] rounded-lg border border-dashed border-[#D6E1EE]">
                <p className="text-xs text-[#9EB0C1] mb-2">No rules defined yet</p>
                <button onClick={addRule} className="text-xs font-semibold text-[#0A7EA4] hover:underline">+ Add first rule</button>
              </div>
            ) : (
              <div className="space-y-2 mb-2">
                {rules.map((rule, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input type="text" value={rule.field} onChange={(e) => updateRule(i, "field", e.target.value)}
                      placeholder="field" className="flex-1 px-2.5 py-2 text-xs rounded-lg border border-[#D6E1EE] outline-none focus:border-[#0A7EA4]/60 min-w-0" />
                    <select value={rule.operator} onChange={(e) => updateRule(i, "operator", e.target.value)}
                      className="px-2 py-2 text-xs rounded-lg border border-[#D6E1EE] outline-none focus:border-[#0A7EA4]/60 bg-white">
                      {OPERATORS.map((op) => <option key={op} value={op}>{op.replace("_", " ")}</option>)}
                    </select>
                    <input type="text" value={rule.value} onChange={(e) => updateRule(i, "value", e.target.value)}
                      placeholder="value" className="flex-1 px-2.5 py-2 text-xs rounded-lg border border-[#D6E1EE] outline-none focus:border-[#0A7EA4]/60 min-w-0" />
                    <button onClick={() => removeRule(i)}
                      className="w-7 h-7 rounded-md flex items-center justify-center text-[#9EB0C1] hover:bg-red-50 hover:text-red-500 transition-all flex-shrink-0">
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {rules.length > 0 && (
              <button onClick={addRule} className="text-xs font-semibold text-[#0A7EA4] hover:underline mt-1">+ Add rule</button>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#607080] mb-1.5">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              placeholder="Additional context…"
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-[#D6E1EE] outline-none focus:border-[#0A7EA4]/60 resize-none" />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-[#EAF0F7] flex gap-2 flex-shrink-0">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm font-medium rounded-lg border border-[#D6E1EE] text-[#607080]">Cancel</button>
          <button onClick={handleSave} disabled={loading} className="flex-1 py-2.5 text-sm font-semibold text-white rounded-lg bg-[#0A7EA4] disabled:opacity-50">
            {loading ? (editing ? "Saving…" : "Creating…") : (editing ? "Save Changes" : "Create Segment")}
          </button>
        </div>
      </div>
    </div>
  );
}
