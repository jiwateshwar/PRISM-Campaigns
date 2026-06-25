"use client";

import { useParams } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useCallback, useRef } from "react";
import { api } from "@/lib/api";
import type { Journey } from "@/types";
import { toast } from "sonner";
import { Save, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type Connection,
  MarkerType,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

// ─── Node Type Icons ─────────────────────────────────────────────────────────

const NODE_TYPES_CONFIG = [
  { type: "sms", label: "SMS", color: "#0A7EA4", bg: "#EBF7FC", icon: "💬" },
  { type: "whatsapp", label: "WhatsApp", color: "#16A34A", bg: "#DCFCE7", icon: "📱" },
  { type: "ussd", label: "USSD", color: "#7C3AED", bg: "#EDE9FE", icon: "📟" },
  { type: "obd", label: "OBD", color: "#B45309", bg: "#FEF3C7", icon: "📞" },
  { type: "ivr", label: "IVR", color: "#BE185D", bg: "#FCE7F3", icon: "☎️" },
  { type: "push", label: "Push", color: "#0891B2", bg: "#CFFAFE", icon: "🔔" },
  { type: "wait", label: "Wait", color: "#64748B", bg: "#F1F5F9", icon: "⏱️" },
  { type: "decision", label: "Decision", color: "#CA8A04", bg: "#FEF9C3", icon: "❓" },
  { type: "condition", label: "Condition", color: "#DC2626", bg: "#FEE2E2", icon: "⚡" },
  { type: "delay", label: "Delay", color: "#9333EA", bg: "#F3E8FF", icon: "⏰" },
  { type: "manual_task", label: "Manual Task", color: "#0D9488", bg: "#CCFBF1", icon: "✅" },
  { type: "exit", label: "Exit", color: "#6B7280", bg: "#F9FAFB", icon: "🚪" },
];

const TYPE_MAP = Object.fromEntries(NODE_TYPES_CONFIG.map((n) => [n.type, n]));

// Custom node renderer
function CustomNode({ data }: { data: { label: string; nodeType: string; description?: string } }) {
  const config = TYPE_MAP[data.nodeType] || { color: "#64748B", bg: "#F1F5F9", icon: "▪" };
  return (
    <div
      className="rounded-xl border-2 shadow-sm min-w-[140px] overflow-hidden"
      style={{ borderColor: config.color, background: "white" }}
    >
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
  const id = `node_${++nodeIdCounter}`;
  return {
    id,
    type: "custom",
    position,
    data: { label: config.label, nodeType: type },
  };
}

export default function JourneyBuilderPage() {
  const { operatorSlug, id } = useParams<{ operatorSlug: string; id: string }>();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [rfInstance, setRfInstance] = useState<unknown>(null);
  const [saving, setSaving] = useState(false);
  const [journeyName, setJourneyName] = useState("Untitled Journey");
  const [editingName, setEditingName] = useState(false);

  const { data: journey, isLoading } = useQuery<Journey>({
    queryKey: ["journey", id],
    queryFn: () => api.getJourneys(operatorSlug).then(() => {
      return fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/${operatorSlug}/journeys/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
      }).then((r) => r.json());
    }),
    onSuccess: (data: Journey) => {
      setJourneyName(data.name);
      setNodes(
        (data.nodes || []).map((n: Record<string, unknown>) => ({
          ...n,
          type: "custom",
          data: { ...(n.data as object), nodeType: (n.data as Record<string, unknown>)?.nodeType || "sms" },
        })) as Node[]
      );
      setEdges((data.edges || []) as Edge[]);
    },
  } as Parameters<typeof useQuery>[0]);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) =>
        addEdge({
          ...params,
          markerEnd: { type: MarkerType.ArrowClosed },
          style: { stroke: "#0A7EA4", strokeWidth: 2 },
        }, eds)
      ),
    [setEdges]
  );

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData("application/prism-node");
      if (!type || !reactFlowWrapper.current) return;
      const bounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = (rfInstance as { project: (p: { x: number; y: number }) => { x: number; y: number } })?.project({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      }) || { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
      const newNode = createNode(type, position);
      setNodes((nds) => [...nds, newNode]);
    },
    [rfInstance, setNodes]
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
        nodes,
        edges,
      });
      toast.success("Journey saved");
    } catch {
      toast.error("Failed to save journey");
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin text-[#0A7EA4]" size={28} />
      </div>
    );
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
              type="text"
              value={journeyName}
              onChange={(e) => setJourneyName(e.target.value)}
              onBlur={() => setEditingName(false)}
              onKeyDown={(e) => e.key === "Enter" && setEditingName(false)}
              autoFocus
              className="text-sm font-semibold text-[#0D1B2E] border-b border-[#0A7EA4] outline-none bg-transparent px-1"
            />
          ) : (
            <button onClick={() => setEditingName(true)} className="text-sm font-semibold text-[#0D1B2E] hover:text-[#0A7EA4] transition-colors">
              {journeyName}
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#9EB0C1]">{nodes.length} nodes · {edges.length} connections</span>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold text-white bg-[#0A7EA4] hover:bg-[#0A7EA4]/90 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            Save
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Node palette */}
        <div className="w-52 flex-shrink-0 bg-white border-r border-[#D6E1EE] overflow-y-auto">
          <div className="px-3 py-3">
            <p className="text-[10px] font-bold text-[#9EB0C1] uppercase tracking-wide mb-2">Node Types</p>
            <p className="text-[10px] text-[#9EB0C1] mb-3">Drag nodes onto the canvas</p>
            <div className="space-y-1.5">
              {NODE_TYPES_CONFIG.map((nodeConfig) => (
                <div
                  key={nodeConfig.type}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("application/prism-node", nodeConfig.type);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-grab active:cursor-grabbing hover:bg-[#EFF3F8] transition-colors border border-transparent hover:border-[#D6E1EE]"
                >
                  <div
                    className="w-7 h-7 rounded-md flex items-center justify-center text-sm flex-shrink-0"
                    style={{ background: nodeConfig.bg }}
                  >
                    {nodeConfig.icon}
                  </div>
                  <span className="text-xs font-medium text-[#3D4F63]">{nodeConfig.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Canvas */}
        <div ref={reactFlowWrapper} className="flex-1" onDrop={onDrop} onDragOver={onDragOver}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setRfInstance as (instance: unknown) => void}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            defaultEdgeOptions={{
              markerEnd: { type: MarkerType.ArrowClosed },
              style: { stroke: "#0A7EA4", strokeWidth: 2 },
            }}
            style={{ background: "#F7F9FC" }}
          >
            <Background color="#D6E1EE" gap={20} size={1} />
            <Controls showInteractive={false} />
            <MiniMap nodeStrokeWidth={2} nodeColor="#0A7EA4" maskColor="rgba(239,243,248,0.7)" />
            <Panel position="bottom-center">
              <div className="bg-white/90 backdrop-blur-sm border border-[#D6E1EE] rounded-lg px-3 py-1.5 text-[10px] text-[#9EB0C1]">
                Drag nodes from the left panel · Connect nodes by dragging from handles · Save to persist
              </div>
            </Panel>
          </ReactFlow>
        </div>
      </div>
    </div>
  );
}
