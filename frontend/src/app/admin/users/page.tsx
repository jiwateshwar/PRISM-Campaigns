"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Loader2, ArrowLeft, User, Shield, Mail } from "lucide-react";
import Link from "next/link";

interface UserRecord {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  is_super_admin: boolean;
  created_at?: string;
}

interface Operator {
  id: string;
  name: string;
  slug: string;
}

export default function AdminUsersPage() {
  const { user } = useAuthStore();
  const router = useRouter();

  if (user && !user.is_super_admin) {
    router.replace("/operators");
    return null;
  }

  return <UsersContent />;
}

function UsersContent() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [assigningUser, setAssigningUser] = useState<UserRecord | null>(null);

  const { data: users = [], isLoading } = useQuery<UserRecord[]>({
    queryKey: ["admin-users"],
    queryFn: () => api.getUsers(),
  });

  const { data: operators = [] } = useQuery<Operator[]>({
    queryKey: ["operators"],
    queryFn: () => api.getOperators(),
  });

  return (
    <div className="min-h-screen bg-[#F4F7FA] p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/admin/operators" className="w-8 h-8 rounded-lg flex items-center justify-center bg-white border border-[#D6E1EE] hover:bg-[#EFF3F8] transition-colors">
            <ArrowLeft size={15} className="text-[#607080]" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-[#0D1B2E]">User Management</h1>
            <p className="text-sm text-[#9EB0C1]">Super admin · Create users and assign operator access</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="ml-auto flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#0A7EA4] rounded-lg">
            <Plus size={15} />
            New User
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-48"><Loader2 className="animate-spin text-[#0A7EA4]" size={24} /></div>
        ) : (
          <div className="bg-white rounded-xl border border-[#D6E1EE] overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#EAF0F7] bg-[#F9FBFD]">
                  {["User", "Email", "Role", "Status", "Actions"].map((h) => (
                    <th key={h} className="text-left text-[10px] font-bold text-[#9EB0C1] uppercase tracking-wide px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-[#EAF0F7] last:border-0 hover:bg-[#F9FBFD] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#0A7EA4]/20 flex items-center justify-center text-xs font-bold text-[#0A7EA4]">
                          {u.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <span className="font-semibold text-sm text-[#0D1B2E]">{u.full_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-[#607080]">{u.email}</td>
                    <td className="px-4 py-3">
                      {u.is_super_admin ? (
                        <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 w-fit">
                          <Shield size={9} /> Super Admin
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#EBF7FC] text-[#0A7EA4]">Operator User</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${u.is_active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {u.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setAssigningUser(u)}
                        className="px-2.5 py-1.5 text-[10px] font-semibold text-[#0A7EA4] bg-[#EBF7FC] hover:bg-[#D0EDF7] rounded-md transition-colors"
                      >
                        Assign Operator
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && (
              <div className="text-center py-12 text-[#9EB0C1] text-sm">
                No users yet. Create the first user to get started.
              </div>
            )}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { qc.invalidateQueries({ queryKey: ["admin-users"] }); setShowCreate(false); }}
        />
      )}

      {assigningUser && (
        <AssignOperatorModal
          user={assigningUser}
          operators={operators}
          onClose={() => setAssigningUser(null)}
          onAssigned={() => { setAssigningUser(null); toast.success("Role assigned"); }}
        />
      )}
    </div>
  );
}

function CreateUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    if (!email.trim() || !fullName.trim() || !password.trim()) {
      toast.error("All fields are required");
      return;
    }
    setLoading(true);
    try {
      await api.createUser({ email, full_name: fullName, password, is_super_admin: isSuperAdmin });
      toast.success("User created");
      onCreated();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      toast.error(err?.response?.data?.detail || "Failed to create user");
    } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl border shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-base font-bold text-[#0D1B2E] mb-4">New User</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#607080] mb-1.5">Full Name *</label>
            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Jane Smith" autoFocus
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-[#D6E1EE] outline-none focus:border-[#0A7EA4]/60 transition-colors" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#607080] mb-1.5">Email *</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="e.g. jane@company.com"
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-[#D6E1EE] outline-none focus:border-[#0A7EA4]/60 transition-colors" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#607080] mb-1.5">Password *</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimum 8 characters"
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-[#D6E1EE] outline-none focus:border-[#0A7EA4]/60 transition-colors" />
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={isSuperAdmin} onChange={(e) => setIsSuperAdmin(e.target.checked)}
              className="w-4 h-4 rounded border-[#D6E1EE] accent-[#0A7EA4]" />
            <span className="text-xs font-medium text-[#3D4F63]">Super Admin (full system access)</span>
          </label>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm font-medium rounded-lg border border-[#D6E1EE] text-[#607080]">Cancel</button>
          <button onClick={handleCreate} disabled={loading} className="flex-1 py-2.5 text-sm font-semibold text-white rounded-lg bg-[#0A7EA4] disabled:opacity-50">
            {loading ? "Creating…" : "Create User"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AssignOperatorModal({ user, operators, onClose, onAssigned }: {
  user: UserRecord; operators: Operator[]; onClose: () => void; onAssigned: () => void;
}) {
  const [operatorId, setOperatorId] = useState(operators[0]?.id ?? "");
  const [role, setRole] = useState("VIEWER");
  const [loading, setLoading] = useState(false);

  async function handleAssign() {
    if (!operatorId) { toast.error("Select an operator"); return; }
    setLoading(true);
    try {
      await api.assignOperatorRole({ user_id: user.id, operator_id: operatorId, role });
      onAssigned();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      toast.error(err?.response?.data?.detail || "Failed to assign role");
    } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl border shadow-xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-base font-bold text-[#0D1B2E] mb-1">Assign Operator Access</h2>
        <p className="text-xs text-[#9EB0C1] mb-4">for {user.full_name}</p>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#607080] mb-1.5">Operator</label>
            <select value={operatorId} onChange={(e) => setOperatorId(e.target.value)}
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-[#D6E1EE] outline-none focus:border-[#0A7EA4]/60 bg-white">
              {operators.map((op) => <option key={op.id} value={op.id}>{op.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#607080] mb-1.5">Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-[#D6E1EE] outline-none focus:border-[#0A7EA4]/60 bg-white">
              <option value="VIEWER">Viewer — read only</option>
              <option value="PLANNER">Planner — create & edit</option>
              <option value="OPERATOR_ADMIN">Operator Admin — full access</option>
            </select>
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm font-medium rounded-lg border border-[#D6E1EE] text-[#607080]">Cancel</button>
          <button onClick={handleAssign} disabled={loading} className="flex-1 py-2.5 text-sm font-semibold text-white rounded-lg bg-[#0A7EA4] disabled:opacity-50">
            {loading ? "Assigning…" : "Assign Role"}
          </button>
        </div>
      </div>
    </div>
  );
}
