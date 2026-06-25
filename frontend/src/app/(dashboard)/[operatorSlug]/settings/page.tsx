"use client";

import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/layout/header";
import type { ChannelCapacity, Product } from "@/types";
import { formatNumber } from "@/lib/utils";
import { toast } from "sonner";
import { Settings, Layers, Radio, Plus, Save, Loader2, AlertTriangle } from "lucide-react";

const CHANNELS = ["sms", "whatsapp", "ussd", "obd", "ivr", "push", "email"];

const CHANNEL_LABELS: Record<string, string> = {
  sms: "SMS", whatsapp: "WhatsApp", ussd: "USSD", obd: "OBD", ivr: "IVR", push: "Push Notification", email: "Email",
};

function CapacityRow({ cap, onChange }: { cap: ChannelCapacity; onChange: (id: string, field: string, val: number) => void }) {
  const utilPct = cap.monthly_capacity > 0 ? Math.round((cap.allocated / cap.monthly_capacity) * 100) : 0;
  const overCapacity = cap.allocated > cap.monthly_capacity;

  return (
    <tr className="border-b border-[#EAF0F7] last:border-0">
      <td className="py-3 pr-4">
        <span className="text-sm font-medium text-[#0D1B2E]">{CHANNEL_LABELS[cap.channel] || cap.channel.toUpperCase()}</span>
      </td>
      <td className="py-3 pr-4">
        <input type="number" value={cap.daily_capacity} onChange={(e) => onChange(cap.id, "daily_capacity", parseInt(e.target.value) || 0)}
          className="w-28 px-2.5 py-1.5 text-sm rounded-lg border border-[#D6E1EE] outline-none focus:border-[#0A7EA4]/60 transition-colors tabular-nums" />
      </td>
      <td className="py-3 pr-4">
        <input type="number" value={cap.monthly_capacity} onChange={(e) => onChange(cap.id, "monthly_capacity", parseInt(e.target.value) || 0)}
          className="w-28 px-2.5 py-1.5 text-sm rounded-lg border border-[#D6E1EE] outline-none focus:border-[#0A7EA4]/60 transition-colors tabular-nums" />
      </td>
      <td className="py-3 pr-4">
        <div className="flex items-center gap-2">
          <div className="w-24 h-1.5 bg-[#EAF0F7] rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${overCapacity ? "bg-red-500" : utilPct > 80 ? "bg-amber-400" : "bg-[#0A7EA4]"}`}
              style={{ width: `${Math.min(utilPct, 100)}%` }} />
          </div>
          <span className={`text-xs font-semibold tabular-nums ${overCapacity ? "text-red-500" : utilPct > 80 ? "text-amber-600" : "text-[#607080]"}`}>
            {utilPct}%
          </span>
          {overCapacity && <AlertTriangle size={12} className="text-red-500" />}
        </div>
      </td>
    </tr>
  );
}

type Tab = "capacity" | "products";

export default function SettingsPage() {
  const { operatorSlug } = useParams<{ operatorSlug: string }>();
  const [tab, setTab] = useState<Tab>("capacity");
  const [capEdits, setCapEdits] = useState<Record<string, Partial<ChannelCapacity>>>({});
  const [saving, setSaving] = useState(false);
  const [addingCap, setAddingCap] = useState(false);
  const [newChannel, setNewChannel] = useState("sms");
  const [newMonth, setNewMonth] = useState(new Date().toISOString().slice(0, 7));
  const [newDaily, setNewDaily] = useState("");
  const [newMonthly, setNewMonthly] = useState("");
  const qc = useQueryClient();

  const { data: capacities = [], isLoading: capLoading } = useQuery<ChannelCapacity[]>({
    queryKey: ["capacity", operatorSlug],
    queryFn: () => api.getChannelCapacities(operatorSlug),
  });

  const { data: products = [], isLoading: prodLoading } = useQuery<Product[]>({
    queryKey: ["products", operatorSlug],
    queryFn: () => api.getProducts(operatorSlug),
  });

  function handleCapChange(id: string, field: string, val: number) {
    setCapEdits((prev) => ({ ...prev, [id]: { ...prev[id], [field]: val } }));
  }

  const mergedCapacities = capacities.map((c) => ({ ...c, ...(capEdits[c.id] || {}) }));

  async function saveCapacities() {
    setSaving(true);
    try {
      await Promise.all(
        Object.entries(capEdits).map(([id, changes]) => api.updateChannelCapacity(operatorSlug, id, changes))
      );
      setCapEdits({});
      qc.invalidateQueries({ queryKey: ["capacity"] });
      toast.success("Capacity settings saved");
    } catch { toast.error("Failed to save capacity settings"); }
    finally { setSaving(false); }
  }

  async function handleAddCapacity() {
    if (!newChannel || !newMonthly) { toast.error("Select channel and set monthly capacity"); return; }
    try {
      await api.createChannelCapacity(operatorSlug, {
        channel: newChannel,
        month: newMonth + "-01",
        daily_capacity: parseInt(newDaily) || 0,
        monthly_capacity: parseInt(newMonthly) || 0,
        allocated: 0,
      });
      qc.invalidateQueries({ queryKey: ["capacity"] });
      toast.success("Capacity slot added");
      setAddingCap(false);
      setNewMonthly(""); setNewDaily("");
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      toast.error(err?.response?.data?.detail || "Failed to add capacity slot");
    }
  }

  const TABS = [
    { key: "capacity" as Tab, label: "Channel Capacity", icon: Radio },
    { key: "products" as Tab, label: "Products", icon: Layers },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Settings" description="Operator configuration, channel capacity and products" />

      <div className="flex border-b border-[#D6E1EE]">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${tab === key ? "border-[#0A7EA4] text-[#0A7EA4]" : "border-transparent text-[#607080] hover:text-[#0D1B2E]"}`}>
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {tab === "capacity" && (
        <div className="bg-white rounded-xl border border-[#D6E1EE] p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-[#0D1B2E]">Channel Capacity Slots</h3>
              <p className="text-xs text-[#9EB0C1] mt-0.5">Monthly allocation limits per communication channel</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setAddingCap(!addingCap)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#0A7EA4] bg-[#EBF7FC] hover:bg-[#D0EDF7] rounded-lg transition-colors">
                <Plus size={12} />
                Add Slot
              </button>
              {Object.keys(capEdits).length > 0 && (
                <button onClick={saveCapacities} disabled={saving} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#0A7EA4] rounded-lg disabled:opacity-50">
                  {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                  Save Changes
                </button>
              )}
            </div>
          </div>

          {addingCap && (
            <div className="mb-4 p-4 rounded-lg bg-[#EFF3F8] border border-[#D6E1EE] flex items-end gap-3 flex-wrap">
              <div>
                <label className="block text-[10px] font-semibold text-[#607080] mb-1.5 uppercase tracking-wide">Channel</label>
                <select value={newChannel} onChange={(e) => setNewChannel(e.target.value)}
                  className="px-2.5 py-2 text-sm rounded-lg border border-[#D6E1EE] bg-white outline-none focus:border-[#0A7EA4]/60">
                  {CHANNELS.map((ch) => <option key={ch} value={ch}>{CHANNEL_LABELS[ch]}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-[#607080] mb-1.5 uppercase tracking-wide">Month</label>
                <input type="month" value={newMonth} onChange={(e) => setNewMonth(e.target.value)}
                  className="px-2.5 py-2 text-sm rounded-lg border border-[#D6E1EE] bg-white outline-none focus:border-[#0A7EA4]/60" />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-[#607080] mb-1.5 uppercase tracking-wide">Daily Capacity</label>
                <input type="number" value={newDaily} onChange={(e) => setNewDaily(e.target.value)} placeholder="100000"
                  className="w-28 px-2.5 py-2 text-sm rounded-lg border border-[#D6E1EE] bg-white outline-none focus:border-[#0A7EA4]/60" />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-[#607080] mb-1.5 uppercase tracking-wide">Monthly Capacity *</label>
                <input type="number" value={newMonthly} onChange={(e) => setNewMonthly(e.target.value)} placeholder="3000000"
                  className="w-32 px-2.5 py-2 text-sm rounded-lg border border-[#D6E1EE] bg-white outline-none focus:border-[#0A7EA4]/60" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setAddingCap(false)} className="px-3 py-2 text-xs font-medium text-[#607080] border border-[#D6E1EE] rounded-lg bg-white">Cancel</button>
                <button onClick={handleAddCapacity} className="px-3 py-2 text-xs font-semibold text-white bg-[#0A7EA4] rounded-lg">Add</button>
              </div>
            </div>
          )}

          {capLoading ? (
            <div className="flex items-center justify-center h-32"><Loader2 className="animate-spin text-[#0A7EA4]" size={20} /></div>
          ) : mergedCapacities.length === 0 ? (
            <div className="text-center py-12 text-sm text-[#9EB0C1]">No capacity slots configured. Click "Add Slot" to get started.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#EAF0F7]">
                    {["Channel", "Daily Capacity", "Monthly Capacity", "Utilisation"].map((h) => (
                      <th key={h} className="text-left text-[10px] font-bold text-[#9EB0C1] uppercase tracking-wide py-2 pr-4">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mergedCapacities.map((cap) => (
                    <CapacityRow key={cap.id} cap={cap} onChange={handleCapChange} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "products" && (
        <div className="bg-white rounded-xl border border-[#D6E1EE] p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-[#0D1B2E]">Operator Products</h3>
              <p className="text-xs text-[#9EB0C1] mt-0.5">Products available to this operator for campaign planning</p>
            </div>
          </div>
          {prodLoading ? (
            <div className="flex items-center justify-center h-32"><Loader2 className="animate-spin text-[#0A7EA4]" size={20} /></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {products.map((product) => (
                <div key={product.id} className={`rounded-xl border p-4 flex items-center gap-3 ${product.is_active ? "border-[#D6E1EE]" : "border-[#EAF0F7] opacity-60"}`}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                    style={{ background: product.color ? `${product.color}20` : "#EFF3F8" }}>
                    {product.icon || "📦"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[#0D1B2E] truncate">{product.name}</span>
                      {!product.is_active && <span className="text-[10px] text-gray-400 font-medium">Inactive</span>}
                    </div>
                    <span className="text-[10px] text-[#9EB0C1]">{product.code} · {product.category}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
