"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useState, useCallback, useEffect } from "react";
import { api } from "@/lib/api";
import type { Journey } from "@/types";
import { toast } from "sonner";
import { Save, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node,
  type Edge,
  type Connection,
  MarkerType,
  Panel,
} from "@xyflow/react";
import type { Campaign } from "@/types";
import "@xyflow/react/dist/style.css";

// ─── Node Type Config ─────────────────────────────────────────────────────────

const NODE_TYPES_CONFIG = [
  { type: "sms",         label: "SMS",         color: "#0A7EA4", bg: "#EBF7FC", icon: "💬" },
  { type: "whatsapp",    label: "WhatsApp",    color: "#16A34A", bg: "#DCFCE7", icon: "📱" },
  { type: "ussd",        label: "USSD",        color: "#7C3AED", bg: "#EDE9FE", icon: "📟" },
  { type: "obd",         label: "OBD",         color: "#B45309", bg: "#FEF3C7", icon: "📞" },
  { type: "ivr",         label: "IVR",         color: "#BE185D", bg: "#FCE7F3", icon: "☎️" },
  { type: "push",        label: "Push",        color: "#0891B2", bg: "#CFFAFE", icon: "🔔" },
  { type: "wait",        label: "Wait",        color: "#64748B", bg: "#F1F5F9", icon: "⏱️" },
  { type: "decision",    label: "Decision",    color: "#CA8A04", bg: "#FEF9C3", icon: "❓" },
  { type: "condition",   label: "Condition",   color: "#DC2626", bg: "#FEE2E2", icon: "⚡" },
  { type: "delay",       label: "Delay",       color: "#9333EA", bg: "#F3E8FF", icon: "⏰" },
  { type: "manual_task", label: "Manual Task", color: "#0D9488", bg: "#CCFBF1", icon: "✅" },
  { type: "exit",        label: "Exit",        color: "#6B7280", bg: "#F9FAFB", icon: "🚪" },
];

const TYPE_MAP = Object.fromEntries(NODE_TYPES_CONFIG.map((n) => [n.type, n]));

function CustomNode({ data }: { data: { label: string; nodeType: string; description?: string } }) {
  const config = TYPE_MAP[data.nodeType] || { color: "#64748B", bg: "#F1F5F9", icon: "▪", label: data.nodeType };
  return (
    <div className="rounded-xl border-2 shadow-sm min-w-[140px] overflow-hidden" style={{ borderColor: config.color, background: "white" }}>
      <div className="px-3 py-2 flex items-center gap-2" style={{ background: config.bg }}>
        <span className="text-sm">{config.icon}</span>
        <span className="text-xs font-bold" style={{ color: config.color }}>{config.label}</span>
      </div>
      {data.label && (
        <div className="px-3 py-2">
          <p className="text-xs font-semibold text-[#0D1B2E] truncate max-w-[160px]">{data.label}</p>
          {data.description && <p className="text-[10px] text-[#9EB0C1] truncate">{data.description}</p>}
        </div>
      )}
    </div>
  );
}

const nodeTypes = { custom: CustomNode };

let nodeIdCounter = 1000;
function createNode(type: string, position: { x: number; y: number }): Node {
  const config = TYPE_MAP[type] || { label: type };
  return {
    id: `node_${++nodeIdCounter}`,
    type: "custom",
    position,
    data: { label: config.label, nodeType: type },
  };
}

// ─── Canvas (must live inside ReactFlowProvider to use useReactFlow) ──────────

interface FlowCanvasProps {
  journey: Journey | undefined;
  operatorSlug: string;
  id: string;
  campaigns: import("@/types").Campaign[];
}

function FlowCanvas({ journey, operatorSlug, id, campaigns }: FlowCanvasProps) {
  const { screenToFlowPosition } = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [journeyName, setJourneyName] = useState(journey?.name ?? "Untitled Journey");
  const [campaignId,  setCampaignId]  = useState(journey?.campaign_id ?? "");
  const [editingName, setEditingName] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!journey) return;
    setJourneyName(journey.name);
    setNodes(
      (journey.nodes || []).map((n: Record<string, unknown>) => ({
        ...n,
        type: "custom",
        data: { ...(n.data as object), nodeType: (n.data as Record<string, unknown>)?.nodeType || "sms" },
      })) as unknown as Node[]
    );
    setEdges((journey.edges || []) as Edge[]);
  }, [journey, setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) =>
        addEdge({ ...params, markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: "#0A7EA4", strokeWidth: 2 } }, eds)
      ),
    [setEdges]
  );

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData("application/prism-node");
      if (!type) return;
      // screenToFlowPosition takes absolute screen coordinates (v12 API)
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      setNodes((nds) => [...nds, createNode(type, position)]);
    },
    [screenToFlowPosition, setNodes]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      await api.updateJourney(operatorSlug, id, {
        name: journeyName,
        nodes, edges,
        campaign_id: campaignId || null,
      });
      toast.success("Journey saved");
    } catch {
      toast.error("Failed to save journey");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem-48px)] -mx-6 -my-6">
      {/* Toolbar */}
      <div className="bg-white border-b border-[#D6E1EE] px-4 py-2.5 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link href={`/${operatorSlug}/journeys`} className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-[#EFF3F8] transition-colors">
            <ArrowLeft size={15} className="text-[#607080]" />
          </Link>
          <div className="h-5 w-px bg-[#D6E1EE]" />
          {editingName ? (
            <input
              type="text" value={journeyName} onChange={(e) => setJourneyName(e.target.value)}
              onBlur={() => setEditingName(false)} onKeyDown={(e) => e.key === "Enter" && setEditingName(false)}
              autoFocus className="text-sm font-semibold text-[#0D1B2E] border-b border-[#0A7EA4] outline-none bg-transparent px-1"
            />
          ) : (
            <button onClick={() => setEditingName(true)} className="text-sm font-semibold text-[#0D1B2E] hover:text-[#0A7EA4] transition-colors">
              {journeyName}
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <select value={campaignId} onChange={(e) => setCampaignId(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-[#D6E1EE] bg-white outline-none focus:border-[#0A7EA4]/60 text-[#607080] max-w-[200px]">
            <option value="">No campaign linked</option>
            {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <span className="text-xs text-[#9EB0C1]">{nodes.length} nodes · {edges.length} connections</span>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold text-white bg-[#0A7EA4] hover:bg-[#0A7EA4]/90 transition-colors disabled:opacity-50">
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            Save
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Node palette */}
        <div className="w-52 flex-shrink-0 bg-white border-r border-[#D6E1EE] overflow-y-auto">
          <div className="px-3 py-3">
            <p className="text-[10px] font-bold text-[#9EB0C1] uppercase tracking-wide mb-1">Node Types</p>
            <p className="text-[10px] text-[#9EB0C1] mb-3">Drag nodes onto the canvas</p>
            <div className="space-y-1">
              {NODE_TYPES_CONFIG.map((cfg) => (
                <div
                  key={cfg.type} draggable
                  onDragStart={(e) => { e.dataTransfer.setData("application/prism-node", cfg.type); e.dataTransfer.effectAllowed = "move"; }}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-grab active:cursor-grabbing hover:bg-[#EFF3F8] transition-colors border border-transparent hover:border-[#D6E1EE]"
                >
                  <div className="w-7 h-7 rounded-md flex items-center justify-center text-sm flex-shrink-0" style={{ background: cfg.bg }}>
                    {cfg.icon}
                  </div>
                  <span className="text-xs font-medium text-[#3D4F63]">{cfg.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Canvas — onDrop + onDragOver go on ReactFlow directly in v12 */}
        <div className="flex-1">
          <ReactFlow
            nodes={nodes} edges={edges}
            onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDrop={onDrop} onDragOver={onDragOver}
            nodeTypes={nodeTypes}
            fitView fitViewOptions={{ padding: 0.2 }}
            defaultEdgeOptions={{ markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: "#0A7EA4", strokeWidth: 2 } }}
            style={{ background: "#F7F9FC" }}
          >
            <Background color="#D6E1EE" gap={20} size={1} />
            <Controls showInteractive={false} />
            <MiniMap nodeStrokeWidth={2} nodeColor="#0A7EA4" maskColor="rgba(239,243,248,0.7)" />
            <Panel position="bottom-center">
              <div className="bg-white/90 backdrop-blur-sm border border-[#D6E1EE] rounded-lg px-3 py-1.5 text-[10px] text-[#9EB0C1]">
                Drag nodes from the left panel · Connect by dragging from handles · Click Save to persist
              </div>
            </Panel>
          </ReactFlow>
        </div>
      </div>
    </div>
  );
}

// ─── Page (wraps in ReactFlowProvider so useReactFlow works in FlowCanvas) ───

export default function JourneyBuilderPage() {
  const { operatorSlug, id } = useParams<{ operatorSlug: string; id: string }>();

  const { data: journey, isLoading } = useQuery<Journey>({
    queryKey: ["journey", id],
    queryFn: () => api.getJourney(operatorSlug, id),
  });

  const { data: campaigns = [] } = useQuery<Campaign[]>({
    queryKey: ["campaigns", operatorSlug],
    queryFn: () => api.getCampaigns(operatorSlug),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin text-[#0A7EA4]" size={28} />
      </div>
    );
  }

  return (
    <ReactFlowProvider>
      <FlowCanvas journey={journey} operatorSlug={operatorSlug} id={id} campaigns={campaigns} />
    </ReactFlowProvider>
  );
}
