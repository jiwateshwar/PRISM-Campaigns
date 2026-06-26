"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/layout/header";
import { formatNumber, formatCurrency, formatPercent } from "@/lib/utils";
import { Loader2, TrendingUp, TrendingDown, Users, Megaphone, Target, BarChart2 } from "lucide-react";
import ReactECharts from "echarts-for-react";

const TEAL = "#0A7EA4";
const NAVY = "#0D1B2E";
const STATUS_COLORS: Record<string, string> = {
  draft: "#94A3B8",
  planned: "#3B82F6",
  ready: "#8B5CF6",
  scheduled: "#F59E0B",
  executing: "#0A7EA4",
  completed: "#10B981",
  results_imported: "#059669",
  closed: "#6B7280",
};

export default function AnalyticsPage() {
  const { operatorSlug } = useParams<{ operatorSlug: string }>();

  const { data: summary, isLoading: sLoading } = useQuery({
    queryKey: ["analytics-summary", operatorSlug],
    queryFn: () => api.getOperatorSummary(operatorSlug),
  });

  const { data: performance, isLoading: pLoading } = useQuery({
    queryKey: ["analytics-performance", operatorSlug],
    queryFn: () => api.getCampaignPerformance(operatorSlug),
  });

  const { data: capacity, isLoading: cLoading } = useQuery({
    queryKey: ["analytics-capacity", operatorSlug],
    queryFn: () => api.getChannelCapacity(operatorSlug),
  });

  const { data: fvsa, isLoading: fLoading } = useQuery({
    queryKey: ["analytics-fvsa", operatorSlug],
    queryFn: () => api.getForecastVsActual(operatorSlug),
  });

  const isLoading = sLoading || pLoading || cLoading || fLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-[#0A7EA4]" size={28} />
      </div>
    );
  }

  const statusPieData = Object.entries(summary?.campaign_status_counts || {}).map(([name, value]) => ({
    name, value,
    itemStyle: { color: STATUS_COLORS[name] || "#94A3B8" },
  }));

  const statusPieOpts = {
    tooltip: { trigger: "item", formatter: "{b}: {c} ({d}%)" },
    legend: { orient: "vertical", right: 10, top: "center", textStyle: { fontSize: 11, color: NAVY } },
    series: [{
      type: "pie", radius: ["45%", "75%"], center: ["38%", "50%"], avoidLabelOverlap: false,
      label: { show: false },
      data: statusPieData,
    }],
  };

  const perfMonths = (performance || []).map((p: Record<string, unknown>) => p.month as string);
  const perfActivations = (performance || []).map((p: Record<string, unknown>) => p.total_activations as number || 0);
  const perfRevenue = (performance || []).map((p: Record<string, unknown>) => p.total_revenue as number || 0);

  const perfOpts = {
    tooltip: { trigger: "axis" },
    legend: { data: ["Activations", "Revenue"], textStyle: { fontSize: 11, color: NAVY } },
    grid: { left: 40, right: 20, top: 40, bottom: 30 },
    xAxis: { type: "category", data: perfMonths, axisLabel: { fontSize: 10 } },
    yAxis: [
      { type: "value", name: "Activations", nameTextStyle: { fontSize: 10 }, axisLabel: { fontSize: 10 } },
      { type: "value", name: "Revenue", nameTextStyle: { fontSize: 10 }, axisLabel: { fontSize: 10 } },
    ],
    series: [
      { name: "Activations", type: "bar", data: perfActivations, itemStyle: { color: TEAL }, barMaxWidth: 32 },
      { name: "Revenue", type: "line", yAxisIndex: 1, data: perfRevenue, smooth: true, itemStyle: { color: "#10B981" }, lineStyle: { width: 2 } },
    ],
  };

  const capChannels = (capacity || []).map((c: Record<string, unknown>) => c.channel as string);
  const capAllocated = (capacity || []).map((c: Record<string, unknown>) => c.allocated as number || 0);
  const capTotal = (capacity || []).map((c: Record<string, unknown>) => c.monthly_capacity as number || 0);
  const capColors = (capacity || []).map((c: Record<string, unknown>) => {
    const pct = capTotal[capChannels.indexOf(c.channel as string)] > 0 ? (c.allocated as number) / (c.monthly_capacity as number) * 100 : 0;
    return pct > 100 ? "#EF4444" : pct > 80 ? "#F59E0B" : TEAL;
  });

  const capacityOpts = {
    tooltip: { trigger: "axis" },
    grid: { left: 60, right: 20, top: 20, bottom: 30 },
    xAxis: { type: "value", axisLabel: { fontSize: 10 } },
    yAxis: { type: "category", data: capChannels.map((c: string) => c.toUpperCase()), axisLabel: { fontSize: 11 } },
    series: [
      { name: "Capacity", type: "bar", data: capTotal, itemStyle: { color: "#EAF0F7" }, barWidth: 14, z: 1 },
      { name: "Allocated", type: "bar", barGap: "-100%", data: capAllocated.map((v: number, i: number) => ({ value: v, itemStyle: { color: capColors[i] } })), barWidth: 14, z: 2 },
    ],
  };

  const fvsaMonths = (fvsa || []).map((f: Record<string, unknown>) => f.month as string);
  const fvsaForecast = (fvsa || []).map((f: Record<string, unknown>) => f.forecast_activations as number || 0);
  const fvsaActual = (fvsa || []).map((f: Record<string, unknown>) => f.actual_activations as number || 0);

  const fvsaOpts = {
    tooltip: { trigger: "axis" },
    legend: { data: ["Forecast", "Actual"], textStyle: { fontSize: 11, color: NAVY } },
    grid: { left: 50, right: 20, top: 40, bottom: 30 },
    xAxis: { type: "category", data: fvsaMonths, axisLabel: { fontSize: 10 } },
    yAxis: { type: "value", axisLabel: { fontSize: 10 } },
    series: [
      { name: "Forecast", type: "line", data: fvsaForecast, smooth: true, lineStyle: { type: "dashed", color: "#94A3B8", width: 2 }, itemStyle: { color: "#94A3B8" } },
      { name: "Actual", type: "line", data: fvsaActual, smooth: true, lineStyle: { color: TEAL, width: 2.5 }, itemStyle: { color: TEAL }, areaStyle: { color: "rgba(10,126,164,0.08)" } },
    ],
  };

  const kpis = [
    { label: "Total Campaigns", value: formatNumber(summary?.total_campaigns || 0), icon: Megaphone, sub: `${(summary?.campaign_status_counts?.executing || 0) + (summary?.campaign_status_counts?.scheduled || 0)} active` },
    { label: "Forecast Activations", value: formatNumber(summary?.forecast?.activations || 0), icon: Target, sub: "this cycle" },
    { label: "Forecast Revenue", value: formatCurrency(summary?.forecast?.revenue || 0, "USD"), icon: TrendingUp, sub: "this cycle" },
    { label: "Segments", value: formatNumber(summary?.segment_count || 0), icon: Users, sub: `${summary?.active_offer_count || 0} offers` },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Analytics" description="Campaign performance and operational intelligence" />

      {/* KPI row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <div key={i} className="bg-white rounded-xl border border-[#D6E1EE] p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#EBF7FC] flex items-center justify-center flex-shrink-0">
              <kpi.icon size={18} className="text-[#0A7EA4]" />
            </div>
            <div>
              <div className="text-xl font-bold text-[#0D1B2E] tabular-nums">{kpi.value}</div>
              <div className="text-xs text-[#9EB0C1]">{kpi.label}</div>
              <div className="text-[10px] text-[#607080]">{kpi.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Row 2: Status donut + Channel capacity */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-[#D6E1EE] p-5">
          <h3 className="text-sm font-bold text-[#0D1B2E] mb-4">Campaign Status Breakdown</h3>
          <ReactECharts option={statusPieOpts} style={{ height: 220 }} />
        </div>
        <div className="bg-white rounded-xl border border-[#D6E1EE] p-5">
          <h3 className="text-sm font-bold text-[#0D1B2E] mb-1">Channel Capacity Utilisation</h3>
          <p className="text-[10px] text-[#9EB0C1] mb-3">Red = over capacity · Amber = &gt;80% · Teal = normal</p>
          {(capacity || []).length === 0 ? (
            <div className="flex items-center justify-center h-40 text-xs text-[#9EB0C1]">No capacity data configured</div>
          ) : (
            <ReactECharts option={capacityOpts} style={{ height: 220 }} />
          )}
        </div>
      </div>

      {/* Row 3: Performance + Forecast vs Actual */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-[#D6E1EE] p-5">
          <h3 className="text-sm font-bold text-[#0D1B2E] mb-4">Monthly Campaign Performance</h3>
          {perfMonths.length === 0 ? (
            <div className="flex items-center justify-center h-52 text-xs text-[#9EB0C1]">No performance data yet</div>
          ) : (
            <ReactECharts option={perfOpts} style={{ height: 220 }} />
          )}
        </div>
        <div className="bg-white rounded-xl border border-[#D6E1EE] p-5">
          <h3 className="text-sm font-bold text-[#0D1B2E] mb-4">Forecast vs Actual Activations</h3>
          {fvsaMonths.length === 0 ? (
            <div className="flex items-center justify-center h-52 text-xs text-[#9EB0C1]">Import actuals to see comparison</div>
          ) : (
            <ReactECharts option={fvsaOpts} style={{ height: 220 }} />
          )}
        </div>
      </div>
    </div>
  );
}
