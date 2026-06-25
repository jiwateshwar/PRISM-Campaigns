"use client";

import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/layout/header";
import type { Offer } from "@/types";
import { formatCurrency, formatPercent, truncate } from "@/lib/utils";
import { toast } from "sonner";
import { Plus, Search, Tag, Loader2, Trash2, TrendingUp } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-50 text-green-700",
  inactive: "bg-gray-100 text-gray-500",
  archived: "bg-orange-50 text-orange-700",
};

export default function OffersPage() {
  const { operatorSlug } = useParams<{ operatorSlug: string }>();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const qc = useQueryClient();

  const { data: offers = [], isLoading } = useQuery<Offer[]>({
    queryKey: ["offers", operatorSlug],
    queryFn: () => api.getOffers(operatorSlug),
  });

  const filtered = offers.filter((o) => {
    const matchSearch = !search || o.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Offer Library"
        description="Reusable offer catalogue for campaigns"
        actions={
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#0A7EA4] hover:bg-[#0A7EA4]/90 transition-colors"
          >
            <Plus size={15} />
            New Offer
          </button>
        }
      />

      <div className="flex items-center gap-3">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9EB0C1]" />
          <input
            type="text"
            placeholder="Search offers…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 pr-4 py-2 text-sm rounded-lg border border-[#D6E1EE] bg-white outline-none focus:border-[#0A7EA4]/50 transition-colors w-56"
          />
        </div>
        {["all", "active", "inactive", "archived"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${statusFilter === s ? "bg-[#0A7EA4] text-white" : "bg-white border border-[#D6E1EE] text-[#607080]"}`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48"><Loader2 className="animate-spin text-[#0A7EA4]" size={24} /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-[#D6E1EE]">
          <Tag size={36} className="mx-auto text-[#D6E1EE] mb-3" />
          <p className="font-semibold text-[#0D1B2E]">No offers found</p>
          <button onClick={() => setShowForm(true)} className="mt-4 px-4 py-2 text-sm font-semibold text-white bg-[#0A7EA4] rounded-lg">
            Create Offer
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((offer) => (
            <div key={offer.id} className="bg-white rounded-xl border border-[#D6E1EE] p-5 hover:border-[#0A7EA4]/40 hover:shadow-sm transition-all group">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-[#0D1B2E] text-sm truncate">{offer.name}</h3>
                  {offer.description && <p className="text-xs text-[#607080] truncate mt-0.5">{truncate(offer.description, 80)}</p>}
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${STATUS_COLORS[offer.status]}`}>
                  {offer.status}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="text-center p-2 rounded-lg bg-[#EFF3F8]">
                  <div className="text-sm font-bold text-[#0D1B2E] tabular-nums">{formatCurrency(offer.price, offer.currency)}</div>
                  <div className="text-[10px] text-[#9EB0C1]">Price</div>
                </div>
                <div className="text-center p-2 rounded-lg bg-[#EFF3F8]">
                  <div className="text-sm font-bold text-[#0D1B2E]">{offer.validity_days}d</div>
                  <div className="text-[10px] text-[#9EB0C1]">Validity</div>
                </div>
                <div className="text-center p-2 rounded-lg bg-[#EFF3F8]">
                  <div className="text-sm font-bold text-[#0D1B2E] tabular-nums">{formatPercent(offer.expected_conversion_rate)}</div>
                  <div className="text-[10px] text-[#9EB0C1]">Conv. Rate</div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#EAF0F7] text-xs">
                <span className="flex items-center gap-1 text-[#607080]">
                  <TrendingUp size={11} />
                  ARPU: {formatCurrency(offer.expected_monthly_arpu, offer.currency)}/mo
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <OfferCreateModal
          operatorSlug={operatorSlug}
          onClose={() => setShowForm(false)}
          onCreated={() => { qc.invalidateQueries({ queryKey: ["offers"] }); setShowForm(false); }}
        />
      )}
    </div>
  );
}

function OfferCreateModal({ operatorSlug, onClose, onCreated }: {
  operatorSlug: string; onClose: () => void; onCreated: () => void;
}) {
  const [form, setForm] = useState({ name: "", description: "", price: "", validity_days: "30", expected_monthly_arpu: "", expected_conversion_rate: "", currency: "USD" });
  const [loading, setLoading] = useState(false);

  function setField(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  async function handleCreate() {
    if (!form.name.trim()) { toast.error("Offer name is required"); return; }
    setLoading(true);
    try {
      await api.createOffer(operatorSlug, {
        ...form,
        price: parseFloat(form.price) || 0,
        validity_days: parseInt(form.validity_days) || 30,
        expected_monthly_arpu: parseFloat(form.expected_monthly_arpu) || 0,
        expected_conversion_rate: parseFloat(form.expected_conversion_rate) || 0,
      });
      toast.success("Offer created");
      onCreated();
    } catch { toast.error("Failed to create offer"); }
    finally { setLoading(false); }
  }

  const Field = ({ label, name, type = "text", placeholder = "" }: { label: string; name: string; type?: string; placeholder?: string }) => (
    <div>
      <label className="block text-xs font-semibold text-[#607080] mb-1.5">{label}</label>
      <input type={type} value={(form as Record<string, string>)[name]} onChange={(e) => setField(name, e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-2.5 text-sm rounded-lg border border-[#D6E1EE] outline-none focus:border-[#0A7EA4]/60 transition-colors" />
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl border shadow-xl w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-base font-bold text-[#0D1B2E] mb-4">New Offer</h2>
        <div className="space-y-4">
          <Field label="Offer Name *" name="name" placeholder="e.g. RBT Basic 30 Days" />
          <Field label="Description" name="description" placeholder="Brief offer description" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Price" name="price" type="number" placeholder="1.50" />
            <Field label="Currency" name="currency" placeholder="USD" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Validity (days)" name="validity_days" type="number" placeholder="30" />
            <Field label="Expected ARPU" name="expected_monthly_arpu" type="number" placeholder="1.50" />
          </div>
          <Field label="Expected Conversion Rate (%)" name="expected_conversion_rate" type="number" placeholder="12.5" />
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm font-medium rounded-lg border border-[#D6E1EE] text-[#607080]">Cancel</button>
          <button onClick={handleCreate} disabled={loading} className="flex-1 py-2.5 text-sm font-semibold text-white rounded-lg bg-[#0A7EA4] disabled:opacity-50">
            {loading ? "Creating…" : "Create Offer"}
          </button>
        </div>
      </div>
    </div>
  );
}
