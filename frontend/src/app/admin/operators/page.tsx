"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { useRouter } from "next/navigation";
import type { Operator } from "@/types";
import { toast } from "sonner";
import { Plus, Loader2, Settings, Globe, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function AdminOperatorsPage() {
  const { user } = useAuthStore();
  const router = useRouter();

  if (user && !user.is_super_admin) {
    router.replace("/operators");
    return null;
  }

  return <AdminContent />;
}

function AdminContent() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data: operators = [], isLoading } = useQuery<Operator[]>({
    queryKey: ["operators"],
    queryFn: () => api.getOperators(),
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      api.updateOperator(id, { is_active }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["operators"] }); toast.success("Operator updated"); },
  });

  return (
    <div className="min-h-screen bg-[#F4F7FA] p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/operators" className="w-8 h-8 rounded-lg flex items-center justify-center bg-white border border-[#D6E1EE] hover:bg-[#EFF3F8] transition-colors">
            <ArrowLeft size={15} className="text-[#607080]" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-[#0D1B2E]">Operator Management</h1>
            <p className="text-sm text-[#9EB0C1]">Super admin · Manage all operator tenants</p>
          </div>
          <button onClick={() => setShowForm(true)} className="ml-auto flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#0A7EA4] rounded-lg">
            <Plus size={15} />
            New Operator
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-48"><Loader2 className="animate-spin text-[#0A7EA4]" size={24} /></div>
        ) : (
          <div className="bg-white rounded-xl border border-[#D6E1EE] overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#EAF0F7] bg-[#F9FBFD]">
                  {["Operator", "Country", "Currency", "Slug", "Status", "Actions"].map((h) => (
                    <th key={h} className="text-left text-[10px] font-bold text-[#9EB0C1] uppercase tracking-wide px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {operators.map((op) => (
                  <tr key={op.id} className="border-b border-[#EAF0F7] last:border-0 hover:bg-[#F9FBFD] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                          style={{ background: op.primary_color || "#0A7EA4" }}>
                          {op.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-sm text-[#0D1B2E]">{op.name}</div>
                          <div className="text-[10px] text-[#9EB0C1]">{op.timezone}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-[#3D4F63]">{op.country || "—"}</td>
                    <td className="px-4 py-3 text-sm text-[#3D4F63]">{op.currency}</td>
                    <td className="px-4 py-3">
                      <code className="text-xs bg-[#EFF3F8] px-1.5 py-0.5 rounded font-mono text-[#0A7EA4]">{op.slug}</code>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${op.is_active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {op.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link href={`/${op.slug}/dashboard`}
                          className="px-2.5 py-1.5 text-[10px] font-semibold text-[#0A7EA4] bg-[#EBF7FC] hover:bg-[#D0EDF7] rounded-md transition-colors">
                          Open
                        </Link>
                        <button onClick={() => toggleActive.mutate({ id: op.id, is_active: !op.is_active })}
                          className="px-2.5 py-1.5 text-[10px] font-medium text-[#607080] border border-[#D6E1EE] hover:bg-[#EFF3F8] rounded-md transition-colors">
                          {op.is_active ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <OperatorCreateModal
          onClose={() => setShowForm(false)}
          onCreated={() => { qc.invalidateQueries({ queryKey: ["operators"] }); setShowForm(false); }}
        />
      )}
    </div>
  );
}

function OperatorCreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ name: "", slug: "", country: "", timezone: "Africa/Accra", currency: "GHS", primary_color: "#0A7EA4" });
  const [loading, setLoading] = useState(false);

  function setField(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  async function handleCreate() {
    if (!form.name.trim() || !form.slug.trim()) { toast.error("Name and slug are required"); return; }
    setLoading(true);
    try {
      await api.createOperator(form);
      toast.success("Operator created");
      onCreated();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      toast.error(err?.response?.data?.detail || "Failed to create operator");
    } finally { setLoading(false); }
  }

  const Field = ({ label, name, placeholder }: { label: string; name: string; placeholder?: string }) => (
    <div>
      <label className="block text-xs font-semibold text-[#607080] mb-1.5">{label}</label>
      <input value={(form as Record<string, string>)[name]} onChange={(e) => setField(name, e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-2.5 text-sm rounded-lg border border-[#D6E1EE] outline-none focus:border-[#0A7EA4]/60 transition-colors" />
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl border shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-base font-bold text-[#0D1B2E] mb-4">New Operator</h2>
        <div className="space-y-4">
          <Field label="Operator Name *" name="name" placeholder="e.g. Airtel Ghana" />
          <Field label="Slug * (URL-safe, unique)" name="slug" placeholder="e.g. airtel-ghana" />
          <Field label="Country" name="country" placeholder="e.g. Ghana" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Timezone" name="timezone" placeholder="Africa/Accra" />
            <Field label="Currency" name="currency" placeholder="GHS" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#607080] mb-1.5">Brand Color</label>
            <div className="flex items-center gap-2">
              <input type="color" value={form.primary_color} onChange={(e) => setField("primary_color", e.target.value)}
                className="w-9 h-9 rounded cursor-pointer border border-[#D6E1EE]" />
              <input value={form.primary_color} onChange={(e) => setField("primary_color", e.target.value)}
                className="flex-1 px-3 py-2.5 text-sm rounded-lg border border-[#D6E1EE] outline-none focus:border-[#0A7EA4]/60 font-mono" />
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm font-medium rounded-lg border border-[#D6E1EE] text-[#607080]">Cancel</button>
          <button onClick={handleCreate} disabled={loading} className="flex-1 py-2.5 text-sm font-semibold text-white rounded-lg bg-[#0A7EA4] disabled:opacity-50">
            {loading ? "Creating…" : "Create Operator"}
          </button>
        </div>
      </div>
    </div>
  );
}
