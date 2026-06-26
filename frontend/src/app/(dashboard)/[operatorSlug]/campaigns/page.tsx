"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/layout/header";
import {
  Campaign, Segment, Offer, Creative, MonthlyPlan, Product,
  CAMPAIGN_STATUS_LABELS, CAMPAIGN_STATUS_COLORS,
  PRIORITY_LABELS, PRIORITY_COLORS, CHANNEL_LABELS,
} from "@/types";
import { formatDate, formatNumber, formatCurrency, truncate } from "@/lib/utils";
import { toast } from "sonner";
import {
  Plus, Search, Megaphone, Calendar, Loader2, Trash2, Pencil,
  Users, Tag, Palette, Target, TrendingUp,
} from "lucide-react";

const STATUS_OPTIONS = ["all", "draft", "planned", "ready", "scheduled", "executing", "completed", "results_imported", "closed"];
const ALL_CHANNELS = ["sms", "whatsapp", "ussd", "obd", "ivr", "push", "email"];

function safeFormatMonth(month: string | null | undefined): string {
  if (!month) return "—";
  try {
    const parts = String(month).split("-");
    const names = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${names[(parseInt(parts[1], 10) - 1)] ?? "?"} ${parts[0]}`;
  } catch { return String(month); }
}

interface Lookups {
  segments: Record<string, Segment>;
  offers: Record<string, Offer>;
  creatives: Record<string, Creative>;
  plans: Record<string, MonthlyPlan>;
}

// ─── Campaign Card ────────────────────────────────────────────────────────────

function CampaignCard({
  campaign, operatorSlug, lookups, onEdit, onDelete,
}: {
  campaign: Campaign; operatorSlug: string; lookups: Lookups;
  onEdit: () => void; onDelete: () => void;
}) {
  const router = useRouter();
  const statusColor = CAMPAIGN_STATUS_COLORS[campaign.status] || "bg-gray-100 text-gray-600";
  const statusLabel = CAMPAIGN_STATUS_LABELS[campaign.status] || campaign.status;
  const priorityColor = PRIORITY_COLORS[campaign.priority] || "";
  const priorityLabel = PRIORITY_LABELS[campaign.priority] || "";

  const segment  = campaign.segment_id      ? lookups.segments[campaign.segment_id]   : null;
  const offer    = campaign.offer_id        ? lookups.offers[campaign.offer_id]       : null;
  const creative = campaign.creative_id     ? lookups.creatives[campaign.creative_id] : null;
  const plan     = campaign.monthly_plan_id ? lookups.plans[campaign.monthly_plan_id] : null;

  return (
    <div
      className="bg-white rounded-xl border border-[#D6E1EE] p-5 hover:border-[#0A7EA4]/40 hover:shadow-sm transition-all cursor-pointer group"
      onClick={() => router.push(`/${operatorSlug}/campaigns/${campaign.id}`)}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-[#0D1B2E] text-sm truncate">{campaign.name}</h3>
          {campaign.description && (
            <p className="text-xs text-[#607080] mt-0.5 truncate">{truncate(campaign.description, 70)}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusColor}`}>{statusLabel}</span>
          <button onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-md flex items-center justify-center hover:bg-[#EFF3F8] text-[#9EB0C1] hover:text-[#0A7EA4] transition-all">
            <Pencil size={11} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-md flex items-center justify-center hover:bg-red-50 text-[#9EB0C1] hover:text-red-500 transition-all">
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Linked resources row */}
      {(plan || segment || offer || creative) && (
        <div className="flex flex-wrap gap-1 mb-2.5">
          {plan && (
            <span className="flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded bg-purple-50 text-purple-700">
              <Calendar size={8} />{safeFormatMonth(plan.month)}
            </span>
          )}
          {segment && (
            <span className="flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">
              <Users size={8} />{truncate(segment.name, 20)}
            </span>
          )}
          {offer && (
            <span className="flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">
              <Tag size={8} />{truncate(offer.name, 20)}
            </span>
          )}
          {creative && (
            <span className="flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded bg-pink-50 text-pink-700">
              <Palette size={8} />{truncate(creative.name, 20)}
            </span>
          )}
        </div>
      )}

      {/* Channels */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {campaign.channels.slice(0, 4).map((ch) => (
          <span key={ch} className="text-[10px] font-medium px-2 py-0.5 rounded bg-[#EBF7FC] text-[#0A7EA4] border border-[#D0EDF7]">
            {CHANNEL_LABELS[ch] || ch}
          </span>
        ))}
        {campaign.channels.length > 4 && <span className="text-[10px] text-[#9EB0C1]">+{campaign.channels.length - 4}</span>}
      </div>

      <div className="flex items-center justify-between text-xs text-[#9EB0C1]">
        <div className="flex items-center gap-3">
          {campaign.planned_start_date && (
            <span className="flex items-center gap-1"><Calendar size={11} />{formatDate(campaign.planned_start_date)}</span>
          )}
          {(campaign.forecast?.expected_activations ?? 0) > 0 && (
            <span className="flex items-center gap-1">
              <Target size={11} />{formatNumber(campaign.forecast!.expected_activations as number)} act.
            </span>
          )}
        </div>
        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${priorityColor}`}>{priorityLabel}</span>
      </div>
    </div>
  );
}

// ─── Campaigns Page ───────────────────────────────────────────────────────────

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

  // Lookup data fetched once for cards + form
  const { data: segments  = [] } = useQuery<Segment[]>     ({ queryKey: ["segments",  operatorSlug], queryFn: () => api.getSegments(operatorSlug, false) });
  const { data: offers    = [] } = useQuery<Offer[]>       ({ queryKey: ["offers",    operatorSlug], queryFn: () => api.getOffers(operatorSlug) });
  const { data: creatives = [] } = useQuery<Creative[]>    ({ queryKey: ["creatives", operatorSlug], queryFn: () => api.getCreatives(operatorSlug) });
  const { data: plans     = [] } = useQuery<MonthlyPlan[]> ({ queryKey: ["plans",     operatorSlug], queryFn: () => api.getPlans(operatorSlug) });
  const { data: products  = [] } = useQuery<Product[]>     ({ queryKey: ["products",  operatorSlug], queryFn: () => api.getProducts(operatorSlug) });

  const lookups: Lookups = {
    segments:  Object.fromEntries(segments.map((s) => [s.id, s])),
    offers:    Object.fromEntries(offers.map((o) => [o.id, o])),
    creatives: Object.fromEntries(creatives.map((c) => [c.id, c])),
    plans:     Object.fromEntries(plans.map((p) => [p.id, p])),
  };

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteCampaign(operatorSlug, id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["campaigns", operatorSlug] }); toast.success("Campaign deleted"); },
    onError: () => toast.error("Failed to delete campaign"),
  });

  const filtered = campaigns.filter((c) => !search || c.name.toLowerCase().includes(search.toLowerCase()));
  const grouped  = filtered.reduce<Record<string, Campaign[]>>((acc, c) => {
    acc[c.status] = acc[c.status] || [];
    acc[c.status].push(c);
    return acc;
  }, {});

  function invalidate() { qc.invalidateQueries({ queryKey: ["campaigns", operatorSlug] }); }

  const cardProps = (campaign: Campaign) => ({
    campaign, operatorSlug, lookups,
    onEdit: () => setEditCampaign(campaign),
    onDelete: () => { if (confirm(`Delete "${campaign.name}"?`)) deleteMutation.mutate(campaign.id); },
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Campaigns"
        description="Manage all marketing campaigns for this operator"
        actions={
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#0A7EA4] hover:bg-[#0A7EA4]/90 transition-colors">
            <Plus size={15} /> New Campaign
          </button>
        }
      />

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9EB0C1]" />
          <input type="text" placeholder="Search campaigns…" value={search} onChange={(e) => setSearch(e.target.value)}
            className="pl-8 pr-4 py-2 text-sm rounded-lg border border-[#D6E1EE] bg-white outline-none focus:border-[#0A7EA4]/50 transition-colors w-56" />
        </div>
        <div className="flex items-center gap-1 bg-white border border-[#D6E1EE] rounded-lg p-1 overflow-x-auto">
          {STATUS_OPTIONS.map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all whitespace-nowrap ${statusFilter === s ? "bg-[#0A7EA4] text-white" : "text-[#607080] hover:bg-[#EFF3F8]"}`}>
              {s === "all" ? "All" : CAMPAIGN_STATUS_LABELS[s as keyof typeof CAMPAIGN_STATUS_LABELS]}
              {s !== "all" && campaigns.filter((c) => c.status === s).length > 0 && (
                <span className="ml-1 opacity-70">({campaigns.filter((c) => c.status === s).length})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48"><Loader2 className="animate-spin text-[#0A7EA4]" size={24} /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-[#D6E1EE]">
          <Megaphone size={36} className="mx-auto text-[#D6E1EE] mb-3" />
          <p className="font-semibold text-[#0D1B2E]">No campaigns found</p>
          <p className="text-sm text-[#9EB0C1] mt-1">{search ? "Try a different search term" : "Create your first campaign"}</p>
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
                {items.map((c) => <CampaignCard key={c.id} {...cardProps(c)} />)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((c) => <CampaignCard key={c.id} {...cardProps(c)} />)}
        </div>
      )}

      {showCreate && (
        <CampaignFormModal operatorSlug={operatorSlug} segments={segments} offers={offers}
          creatives={creatives} plans={plans} products={products}
          onClose={() => setShowCreate(false)} onSaved={() => { invalidate(); setShowCreate(false); }} />
      )}
      {editCampaign && (
        <CampaignFormModal operatorSlug={operatorSlug} campaign={editCampaign}
          segments={segments} offers={offers} creatives={creatives} plans={plans} products={products}
          onClose={() => setEditCampaign(null)} onSaved={() => { invalidate(); setEditCampaign(null); }} />
      )}
    </div>
  );
}

// ─── Campaign Form Modal ──────────────────────────────────────────────────────

function CampaignFormModal({
  operatorSlug, campaign, segments, offers, creatives, plans, products, onClose, onSaved,
}: {
  operatorSlug: string; campaign?: Campaign;
  segments: Segment[]; offers: Offer[]; creatives: Creative[]; plans: MonthlyPlan[]; products: Product[];
  onClose: () => void; onSaved: () => void;
}) {
  const editing = !!campaign;

  // Basic
  const [name,        setName]        = useState(campaign?.name ?? "");
  const [description, setDescription] = useState(campaign?.description ?? "");
  const [priority,    setPriority]    = useState(campaign?.priority ?? 3);
  const [status,      setStatus]      = useState(campaign?.status ?? "draft");
  const [channels,    setChannels]    = useState<string[]>(campaign?.channels ?? []);
  const [startDate,   setStartDate]   = useState(campaign?.planned_start_date?.slice(0, 10) ?? "");
  const [endDate,     setEndDate]     = useState(campaign?.planned_end_date?.slice(0, 10) ?? "");
  const [notes,       setNotes]       = useState(campaign?.notes ?? "");

  // Linkages
  const [monthlyPlanId, setMonthlyPlanId] = useState(campaign?.monthly_plan_id ?? "");
  const [productId,     setProductId]     = useState(campaign?.product_id ?? "");
  const [segmentId,     setSegmentId]     = useState(campaign?.segment_id ?? "");
  const [offerId,       setOfferId]       = useState(campaign?.offer_id ?? "");
  const [creativeId,    setCreativeId]    = useState(campaign?.creative_id ?? "");

  // Forecast inputs
  const [fReach,   setFReach]   = useState(String(campaign?.forecast?.estimated_reach ?? ""));
  const [fConvPct, setFConvPct] = useState(String(campaign?.forecast?.expected_conversion_pct ?? ""));
  const [fArpu,    setFArpu]    = useState(String(campaign?.forecast?.monthly_arpu ?? ""));

  const [loading, setLoading] = useState(false);

  const selectedSegment = segments.find((s) => s.id === segmentId) ?? null;
  const selectedOffer   = offers.find((o) => o.id === offerId) ?? null;

  // Auto-fill forecast from segment/offer on first select (create only)
  useEffect(() => {
    if (!editing && selectedSegment) {
      const reach = selectedSegment.eligible_audience_size || selectedSegment.estimated_audience_size;
      if (reach) setFReach(String(reach));
    }
  }, [segmentId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!editing && selectedOffer) {
      if (selectedOffer.expected_conversion_rate) setFConvPct(String(selectedOffer.expected_conversion_rate));
      if (selectedOffer.expected_monthly_arpu)    setFArpu(String(selectedOffer.expected_monthly_arpu));
    }
  }, [offerId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Live forecast calculation
  const reach       = parseFloat(fReach)   || 0;
  const convPct     = parseFloat(fConvPct) || 0;
  const arpu        = parseFloat(fArpu)    || 0;
  const activations = Math.round(reach * convPct / 100);
  const revenue     = activations * arpu;

  function toggleChannel(ch: string) {
    setChannels((prev) => prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]);
  }

  // Filter creatives to those compatible with selected channels
  const compatibleCreatives = channels.length > 0
    ? creatives.filter((c) => c.channels.some((ch) => channels.includes(ch)))
    : creatives;

  async function handleSave() {
    if (!name.trim()) { toast.error("Campaign name is required"); return; }
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        name, description, priority, status, channels,
        planned_start_date: startDate || null,
        planned_end_date:   endDate || null,
        notes,
        monthly_plan_id: monthlyPlanId || null,
        product_id:      productId || null,
        segment_id:      segmentId || null,
        offer_id:        offerId || null,
        creative_id:     creativeId || null,
        forecast: {
          estimated_reach:          reach,
          expected_conversion_pct:  convPct,
          monthly_arpu:             arpu,
          expected_activations:     activations,
          expected_revenue:         revenue,
        },
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

  const SectionLabel = ({ label }: { label: string }) => (
    <div className="flex items-center gap-3 mb-3">
      <span className="text-[10px] font-bold text-[#9EB0C1] uppercase tracking-widest">{label}</span>
      <div className="flex-1 h-px bg-[#EAF0F7]" />
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl border shadow-xl w-full max-w-2xl flex flex-col max-h-[92vh]" onClick={(e) => e.stopPropagation()}>
        {/* Sticky header */}
        <div className="px-6 py-4 border-b border-[#EAF0F7] flex-shrink-0">
          <h2 className="text-base font-bold text-[#0D1B2E]">{editing ? "Edit Campaign" : "New Campaign"}</h2>
          <p className="text-xs text-[#9EB0C1] mt-0.5">Fill out all sections to fully configure this campaign</p>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">

          {/* ── Basics ── */}
          <div>
            <SectionLabel label="Basics" />
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#607080] mb-1.5">Campaign Name *</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. RBT June Activation Drive" autoFocus
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-[#D6E1EE] outline-none focus:border-[#0A7EA4]/60" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#607080] mb-1.5">Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
                  placeholder="Brief description of campaign objective…"
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-[#D6E1EE] outline-none focus:border-[#0A7EA4]/60 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#607080] mb-1.5">Priority</label>
                  <select value={priority} onChange={(e) => setPriority(Number(e.target.value))}
                    className="w-full px-3 py-2.5 text-sm rounded-lg border border-[#D6E1EE] outline-none focus:border-[#0A7EA4]/60 bg-white">
                    <option value={1}>Critical</option><option value={2}>High</option>
                    <option value={3}>Medium</option><option value={4}>Low</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#607080] mb-1.5">Status</label>
                  <select value={status} onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm rounded-lg border border-[#D6E1EE] outline-none focus:border-[#0A7EA4]/60 bg-white">
                    {["draft","planned","ready","scheduled","executing","completed","results_imported","closed"].map((s) => (
                      <option key={s} value={s}>{CAMPAIGN_STATUS_LABELS[s as keyof typeof CAMPAIGN_STATUS_LABELS] || s}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* ── Planning Context ── */}
          <div>
            <SectionLabel label="Planning Context" />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#607080] mb-1.5">Monthly Plan</label>
                <select value={monthlyPlanId} onChange={(e) => setMonthlyPlanId(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-[#D6E1EE] outline-none focus:border-[#0A7EA4]/60 bg-white">
                  <option value="">Not assigned to a plan</option>
                  {plans.map((p) => <option key={p.id} value={p.id}>{safeFormatMonth(p.month)} — {p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#607080] mb-1.5">Product</label>
                <select value={productId} onChange={(e) => setProductId(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-[#D6E1EE] outline-none focus:border-[#0A7EA4]/60 bg-white">
                  <option value="">No product</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* ── Audience ── */}
          <div>
            <SectionLabel label="Audience" />
            <div>
              <label className="block text-xs font-semibold text-[#607080] mb-1.5">Target Segment</label>
              <select value={segmentId} onChange={(e) => setSegmentId(e.target.value)}
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-[#D6E1EE] outline-none focus:border-[#0A7EA4]/60 bg-white">
                <option value="">No segment selected</option>
                {segments.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              {selectedSegment && (
                <div className="flex items-center gap-3 mt-2 px-3 py-2 bg-blue-50 rounded-lg border border-blue-100">
                  <Users size={13} className="text-blue-500 flex-shrink-0" />
                  <span className="text-xs text-blue-700">
                    Estimated reach: <strong>{formatNumber(selectedSegment.estimated_audience_size)}</strong>
                    {" · "}Eligible: <strong>{formatNumber(selectedSegment.eligible_audience_size)}</strong>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ── Offer & Creative ── */}
          <div>
            <SectionLabel label="Offer & Creative" />
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#607080] mb-1.5">Offer</label>
                <select value={offerId} onChange={(e) => setOfferId(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-[#D6E1EE] outline-none focus:border-[#0A7EA4]/60 bg-white">
                  <option value="">No offer selected</option>
                  {offers
                    .filter((o) => o.status === "active" || o.id === offerId)
                    .map((o) => <option key={o.id} value={o.id}>{o.name} — {o.currency} {o.price}</option>)}
                </select>
                {selectedOffer && (
                  <div className="flex items-center gap-3 mt-2 px-3 py-2 bg-amber-50 rounded-lg border border-amber-100">
                    <Tag size={13} className="text-amber-500 flex-shrink-0" />
                    <span className="text-xs text-amber-700">
                      ARPU: <strong>{formatCurrency(selectedOffer.expected_monthly_arpu)}</strong>
                      {" · "}Conv. rate: <strong>{selectedOffer.expected_conversion_rate}%</strong>
                      {" · "}Validity: <strong>{selectedOffer.validity_days}d</strong>
                    </span>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#607080] mb-1.5">
                  Creative
                  {channels.length > 0 && compatibleCreatives.length < creatives.length && (
                    <span className="ml-1 font-normal text-[#9EB0C1]">
                      ({compatibleCreatives.length} of {creatives.length} match selected channels)
                    </span>
                  )}
                </label>
                <select value={creativeId} onChange={(e) => setCreativeId(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-[#D6E1EE] outline-none focus:border-[#0A7EA4]/60 bg-white">
                  <option value="">No creative selected</option>
                  {compatibleCreatives.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} [{c.channels.join(", ")}]</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* ── Scheduling ── */}
          <div>
            <SectionLabel label="Scheduling & Channels" />
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#607080] mb-1.5">Channels</label>
                <div className="flex flex-wrap gap-2">
                  {ALL_CHANNELS.map((ch) => (
                    <button key={ch} type="button" onClick={() => toggleChannel(ch)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        channels.includes(ch)
                          ? "bg-[#EBF7FC] text-[#0A7EA4] border-[#0A7EA4]"
                          : "bg-white border-[#D6E1EE] text-[#607080] hover:border-[#9EB0C1]"
                      }`}>
                      {CHANNEL_LABELS[ch] || ch}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#607080] mb-1.5">Start Date</label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm rounded-lg border border-[#D6E1EE] outline-none focus:border-[#0A7EA4]/60 bg-white" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#607080] mb-1.5">End Date</label>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm rounded-lg border border-[#D6E1EE] outline-none focus:border-[#0A7EA4]/60 bg-white" />
                </div>
              </div>
            </div>
          </div>

          {/* ── Forecast ── */}
          <div>
            <SectionLabel label="Forecast" />
            <p className="text-[10px] text-[#9EB0C1] -mt-1 mb-3">
              Auto-filled from segment + offer. Activations = Reach × Conv% ÷ 100 · Revenue = Activations × ARPU.
            </p>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div>
                <label className="block text-xs font-semibold text-[#607080] mb-1.5">Estimated Reach</label>
                <input type="number" value={fReach} onChange={(e) => setFReach(e.target.value)} placeholder="e.g. 500000"
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-[#D6E1EE] outline-none focus:border-[#0A7EA4]/60" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#607080] mb-1.5">Conv. Rate (%)</label>
                <input type="number" value={fConvPct} onChange={(e) => setFConvPct(e.target.value)} placeholder="e.g. 12.5"
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-[#D6E1EE] outline-none focus:border-[#0A7EA4]/60" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#607080] mb-1.5">Monthly ARPU</label>
                <input type="number" value={fArpu} onChange={(e) => setFArpu(e.target.value)} placeholder="e.g. 3.50"
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-[#D6E1EE] outline-none focus:border-[#0A7EA4]/60" />
              </div>
            </div>
            {activations > 0 && (
              <div className="flex items-center gap-4 px-4 py-3 bg-[#EBF7FC] rounded-lg border border-[#C8E8F4]">
                <div className="flex items-center gap-2">
                  <Target size={13} className="text-[#0A7EA4]" />
                  <span className="text-xs text-[#0A7EA4]">
                    Expected activations: <strong className="text-sm">{formatNumber(activations)}</strong>
                  </span>
                </div>
                <div className="w-px h-4 bg-[#0A7EA4]/20" />
                <div className="flex items-center gap-2">
                  <TrendingUp size={13} className="text-[#0A7EA4]" />
                  <span className="text-xs text-[#0A7EA4]">
                    Expected revenue: <strong className="text-sm">{formatCurrency(revenue)}</strong>
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* ── Notes ── */}
          <div>
            <SectionLabel label="Notes" />
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Additional notes…"
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-[#D6E1EE] outline-none focus:border-[#0A7EA4]/60 resize-none" />
          </div>
        </div>

        {/* Sticky footer */}
        <div className="px-6 py-4 border-t border-[#EAF0F7] flex gap-2 flex-shrink-0">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm font-medium rounded-lg border border-[#D6E1EE] text-[#607080] hover:bg-[#EFF3F8]">
            Cancel
          </button>
          <button onClick={handleSave} disabled={loading} className="flex-1 py-2.5 text-sm font-semibold text-white rounded-lg bg-[#0A7EA4] hover:bg-[#0A7EA4]/90 disabled:opacity-50">
            {loading ? (editing ? "Saving…" : "Creating…") : (editing ? "Save Changes" : "Create Campaign")}
          </button>
        </div>
      </div>
    </div>
  );
}
