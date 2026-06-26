"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/layout/header";
import type { Journey, JourneyTemplate } from "@/types";
import { truncate } from "@/lib/utils";
import { toast } from "sonner";
import { Plus, Search, Workflow, Loader2, Layers, Copy, ExternalLink, Trash2 } from "lucide-react";

const TEMPLATE_CATEGORIES = [
  { value: "all", label: "All Templates" },
  { value: "acquisition", label: "Acquisition" },
  { value: "winback", label: "Winback" },
  { value: "renewal", label: "Renewal" },
  { value: "upsell", label: "Upsell" },
  { value: "seasonal", label: "Seasonal" },
];

const CATEGORY_COLORS: Record<string, string> = {
  acquisition: "bg-blue-50 text-blue-700",
  winback: "bg-orange-50 text-orange-700",
  renewal: "bg-green-50 text-green-700",
  upsell: "bg-purple-50 text-purple-700",
  seasonal: "bg-amber-50 text-amber-700",
  other: "bg-gray-100 text-gray-700",
};

export default function JourneysPage() {
  const { operatorSlug } = useParams<{ operatorSlug: string }>();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"journeys" | "templates">("journeys");
  const [templateCategory, setTemplateCategory] = useState("all");
  const qc = useQueryClient();

  const { data: journeys = [], isLoading: jLoading } = useQuery<Journey[]>({
    queryKey: ["journeys", operatorSlug],
    queryFn: () => api.getJourneys(operatorSlug),
    enabled: tab === "journeys",
  });

  const { data: templates = [], isLoading: tLoading } = useQuery<JourneyTemplate[]>({
    queryKey: ["journey-templates", operatorSlug, templateCategory],
    queryFn: () => api.getJourneyTemplates(operatorSlug, templateCategory === "all" ? undefined : templateCategory),
    enabled: tab === "templates",
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteJourney(operatorSlug, id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["journeys", operatorSlug] }); toast.success("Journey deleted"); },
    onError: () => toast.error("Failed to delete journey"),
  });

  async function handleCloneTemplate(template: JourneyTemplate) {
    try {
      const journey = await api.cloneTemplate(operatorSlug, template.id, `${template.name} (Copy)`);
      toast.success("Journey created from template");
      qc.invalidateQueries({ queryKey: ["journeys", operatorSlug] });
      router.push(`/${operatorSlug}/journeys/${journey.id}`);
    } catch {
      toast.error("Failed to clone template");
    }
  }

  async function handleNewJourney() {
    try {
      const journey = await api.createJourney(operatorSlug, { name: "Untitled Journey", nodes: [], edges: [] });
      router.push(`/${operatorSlug}/journeys/${journey.id}`);
    } catch {
      toast.error("Failed to create journey");
    }
  }

  const filteredJourneys = journeys.filter((j) => !search || j.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Journey Builder"
        description="Build and manage visual customer journey flows"
        actions={
          <button
            onClick={handleNewJourney}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#0A7EA4]"
          >
            <Plus size={15} />
            New Journey
          </button>
        }
      />

      <div className="flex border-b border-[#D6E1EE]">
        {[
          { key: "journeys" as const, label: "My Journeys", icon: Workflow },
          { key: "templates" as const, label: "Templates", icon: Layers },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${
              tab === key
                ? "border-[#0A7EA4] text-[#0A7EA4]"
                : "border-transparent text-[#607080] hover:text-[#0D1B2E]"
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {tab === "journeys" && (
        <>
          <div className="relative w-56">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9EB0C1]" />
            <input
              type="text" placeholder="Search journeys…" value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-4 py-2 text-sm rounded-lg border border-[#D6E1EE] bg-white outline-none focus:border-[#0A7EA4]/50 w-full"
            />
          </div>

          {jLoading ? (
            <div className="flex items-center justify-center h-48"><Loader2 className="animate-spin text-[#0A7EA4]" size={24} /></div>
          ) : filteredJourneys.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-[#D6E1EE]">
              <Workflow size={36} className="mx-auto text-[#D6E1EE] mb-3" />
              <p className="font-semibold text-[#0D1B2E]">No journeys yet</p>
              <p className="text-sm text-[#9EB0C1] mt-1">Start from scratch or use a template</p>
              <div className="flex justify-center gap-2 mt-4">
                <button onClick={handleNewJourney} className="px-4 py-2 text-sm font-semibold text-white bg-[#0A7EA4] rounded-lg">
                  Create Journey
                </button>
                <button onClick={() => setTab("templates")} className="px-4 py-2 text-sm font-medium border border-[#D6E1EE] rounded-lg text-[#607080]">
                  Browse Templates
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredJourneys.map((journey) => (
                <div
                  key={journey.id}
                  className="bg-white rounded-xl border border-[#D6E1EE] p-5 hover:border-[#0A7EA4]/40 hover:shadow-sm transition-all cursor-pointer group"
                  onClick={() => router.push(`/${operatorSlug}/journeys/${journey.id}`)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-[#0D1B2E] text-sm truncate">{journey.name}</h3>
                      {journey.description && <p className="text-xs text-[#607080] truncate mt-0.5">{truncate(journey.description, 70)}</p>}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <ExternalLink size={13} className="text-[#D6E1EE] group-hover:text-[#0A7EA4] transition-colors mt-0.5" />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Delete "${journey.name}"?`)) deleteMutation.mutate(journey.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-md flex items-center justify-center hover:bg-red-50 text-[#9EB0C1] hover:text-red-500 transition-all"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-[#9EB0C1]">
                    <span>{journey.nodes.length} nodes · {journey.edges.length} connections</span>
                    <span className={`px-2 py-0.5 rounded-full font-medium text-[10px] ${
                      journey.status === "active" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
                    }`}>{journey.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === "templates" && (
        <>
          <div className="flex items-center gap-2 flex-wrap">
            {TEMPLATE_CATEGORIES.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setTemplateCategory(value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  templateCategory === value ? "bg-[#0A7EA4] text-white" : "bg-white border border-[#D6E1EE] text-[#607080]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {tLoading ? (
            <div className="flex items-center justify-center h-48"><Loader2 className="animate-spin text-[#0A7EA4]" size={24} /></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {templates.map((template) => (
                <div key={template.id} className="bg-white rounded-xl border border-[#D6E1EE] p-5 hover:shadow-sm transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-[#0D1B2E] text-sm">{template.name}</h3>
                      {template.description && <p className="text-xs text-[#607080] mt-0.5 line-clamp-2">{template.description}</p>}
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ml-2 ${CATEGORY_COLORS[template.category] || CATEGORY_COLORS.other}`}>
                      {template.category}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1 mb-3">
                    {template.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-[#EFF3F8] text-[#607080]">{tag}</span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#9EB0C1]">{template.nodes.length} nodes · Used {template.usage_count}×</span>
                    <button
                      onClick={() => handleCloneTemplate(template)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#0A7EA4] bg-[#EBF7FC] hover:bg-[#D0EDF7] rounded-lg transition-colors"
                    >
                      <Copy size={11} />
                      Use Template
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
