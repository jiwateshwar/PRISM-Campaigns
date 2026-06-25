"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/layout/header";
import { formatNumber, formatCurrency, formatPercent } from "@/lib/utils";
import { CAMPAIGN_STATUS_LABELS, CAMPAIGN_STATUS_COLORS, type OperatorSummary } from "@/types";
import ReactECharts from "echarts-for-react";
import {
  Megaphone, Users, Tag, TrendingUp, Target, Activity,
  AlertTriangle, CheckCircle, Clock, Loader2
} from "lucide-react";

function StatCard({ label, value, sub, icon: Icon, trend, color = "#0A7EA4" }: {
  label: string; value: string; sub?: string; icon: React.ElementType; trend?: number; color?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-[#D6E1EE] p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-semibold text-[#9EB0C1] uppercase tracking-wide mb-1">{label}</p>
          <p className="text-2xl font-bold text-[#0D1B2E] tracking-tight leading-none">{value}</p>
          {sub && <p className="text-xs text-[#607080] mt-1.5">{sub}</p>}
        </div>
        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}15` }}>
          <Icon size={18} style={{ color }} />
        </div>
      </div>
      {trend !== undefined && (
        <div className={`flex items-center gap-1 mt-3 text-xs font-medium ${trend >= 0 ? "text-green-600" : "text-red-500"}`}>
          <TrendingUp size={11} className={trend < 0 ? "rotate-180" : ""} />
          {Math.abs(trend).toFixed(1)}% vs last month
        </div>
      )}
    </div>
  );
}

function StatusPill({ status, count }: { status: string; count: number }) {
  const colorClass = CAMPAIGN_STATUS_COLORS[status as keyof typeof CAMPAIGN_STATUS_COLORS] || "bg-gray-100 text-gray-600";
  const label = CAMPAIGN_STATUS_LABELS[status as keyof typeof CAMPAIGN_STATUS_LABELS] || status;
  return (
    <div className="flex items-center justify-between py-2 border-b border-[#EAF0F7] last:border-0">
      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${colorClass}`}>
        {label}
      </span>
      <span className="text-sm font-bold text-[#0D1B2E] tabular-nums">{count}</span>
    </div>
  );
}

export default function DashboardPage() {
  const { operatorSlug } = useParams<{ operatorSlug: string }>();

  const { data: summary, isLoading } = useQuery<OperatorSummary>({
    queryKey: ["analytics", "summary", operatorSlug],
    queryFn: () => api.getOperatorSummary(operatorSlug),
  });

  const { data: performance = [] } = useQuery<Array<{ month: string; status: string; count: number }>>({
    queryKey: ["analytics", "performance", operatorSlug],
    queryFn: () => api.getCampaignPerformance(operatorSlug, 6),
  });

  const { data: capacities = [] } = useQuery<Array<{ channel: string; utilization_pct: number; is_over_capacity: boolean }>>({
    queryKey: ["analytics", "capacity", operatorSlug],
    queryFn: () => api.getChannelCapacityStats(operatorSlug),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-[#0A7EA4]" size={24} />
      </div>
    );
  }

  const statusCounts = summary?.campaign_status_counts || {};
  const forecast = summary?.forecast || { reach: 0, activations: 0, revenue: 0 };
  const actuals = summary?.actuals || { activations: 0, revenue: 0 };

  const activationAchievement = forecast.activations > 0 ? (actuals.activations / forecast.activations) * 100 : 0;
  const revenueAchievement = forecast.revenue > 0 ? (actuals.revenue / forecast.revenue) * 100 : 0;

  // ECharts: Campaign status donut
  const statusEntries = Object.entries(statusCounts).filter(([, v]) => v > 0);
  const donutOption = {
    tooltip: { trigger: "item" },
    color: ["#E2E8F0", "#DBEAFE", "#CCFBF1", "#EDE9FE", "#FEF3C7", "#DCFCE7", "#D1FAE5", "#F1F5F9"],
    series: [{
      type: "pie",
      radius: ["60%", "85%"],
      avoidLabelOverlap: false,
      padAngle: 2,
      itemStyle: { borderRadius: 3 },
      label: { show: false },
      emphasis: { label: { show: true, fontSize: 13, fontWeight: "bold" } },
      data: statusEntries.map(([s, v]) => ({
        name: CAMPAIGN_STATUS_LABELS[s as keyof typeof CAMPAIGN_STATUS_LABELS] || s,
        value: v,
      })),
    }],
  };

  // ECharts: Channel capacity bar
  const capacityOption = {
    tooltip: { trigger: "axis" },
    grid: { left: "3%", right: "4%", top: "8%", bottom: "3%", containLabel: true },
    xAxis: {
      type: "category",
      data: capacities.map((c) => c.channel.toUpperCase()),
      axisLabel: { fontSize: 11, color: "#607080" },
      axisLine: { lineStyle: { color: "#D6E1EE" } },
    },
    yAxis: {
      type: "value",
      max: 100,
      axisLabel: { formatter: "{value}%", fontSize: 11, color: "#607080" },
      splitLine: { lineStyle: { color: "#EAF0F7" } },
    },
    series: [{
      type: "bar",
      barMaxWidth: 40,
      data: capacities.map((c) => ({
        value: Math.round(c.utilization_pct),
        itemStyle: { color: c.is_over_capacity ? "#EF4444" : c.utilization_pct > 80 ? "#F59E0B" : "#0A7EA4", borderRadius: [4, 4, 0, 0] },
      })),
    }],
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Operator Dashboard"
        description="Real-time marketing operations overview"
        actions={
          <span className="text-xs text-[#9EB0C1]">
            {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </span>
        }
      />

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Campaigns"
          value={formatNumber(summary?.total_campaigns || 0)}
          sub={`${Object.values(statusCounts).reduce((a, b) => a + b, 0)} total`}
          icon={Megaphone}
          color="#0A7EA4"
        />
        <StatCard
          label="Segment Library"
          value={formatNumber(summary?.segment_count || 0)}
          sub="audience segments"
          icon={Users}
          color="#7C3AED"
        />
        <StatCard
          label="Active Offers"
          value={formatNumber(summary?.active_offer_count || 0)}
          sub="in offer catalogue"
          icon={Tag}
          color="#15803D"
        />
        <StatCard
          label="Forecast Reach"
          value={formatNumber(forecast.reach)}
          sub={`${formatNumber(forecast.activations)} expected activations`}
          icon={Target}
          color="#B45309"
        />
      </div>

      {/* Forecast vs Actuals */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-[#D6E1EE] p-5">
          <h3 className="text-sm font-bold text-[#0D1B2E] mb-4">Forecast vs Actuals</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-[#607080] font-medium">Activations</span>
                <span className="font-semibold text-[#0D1B2E] tabular-nums">
                  {formatNumber(actuals.activations)} / {formatNumber(forecast.activations)}
                </span>
              </div>
              <div className="h-2 bg-[#EAF0F7] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(activationAchievement, 100)}%`,
                    background: activationAchievement >= 100 ? "#15803D" : "#0A7EA4",
                  }}
                />
              </div>
              <div className="text-[10px] text-[#9EB0C1] mt-1">{formatPercent(activationAchievement)} achieved</div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-[#607080] font-medium">Revenue</span>
                <span className="font-semibold text-[#0D1B2E] tabular-nums">
                  {formatCurrency(actuals.revenue)} / {formatCurrency(forecast.revenue)}
                </span>
              </div>
              <div className="h-2 bg-[#EAF0F7] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(revenueAchievement, 100)}%`,
                    background: revenueAchievement >= 100 ? "#15803D" : "#0A7EA4",
                  }}
                />
              </div>
              <div className="text-[10px] text-[#9EB0C1] mt-1">{formatPercent(revenueAchievement)} achieved</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#D6E1EE] p-5">
          <h3 className="text-sm font-bold text-[#0D1B2E] mb-3">Campaign Status Breakdown</h3>
          {statusEntries.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-[#9EB0C1] text-sm">
              No campaigns yet
            </div>
          ) : (
            <div className="flex gap-4">
              <div className="flex-1">
                {statusEntries.slice(0, 5).map(([status, count]) => (
                  <StatusPill key={status} status={status} count={count} />
                ))}
              </div>
              <div className="w-28 flex-shrink-0">
                <ReactECharts option={donutOption} style={{ height: "120px", width: "100%" }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Channel capacity */}
      {capacities.length > 0 && (
        <div className="bg-white rounded-xl border border-[#D6E1EE] p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-[#0D1B2E]">Channel Capacity Utilization</h3>
            <div className="flex items-center gap-3 text-xs text-[#9EB0C1]">
              {capacities.some((c) => c.is_over_capacity) && (
                <span className="flex items-center gap-1 text-red-500 font-medium">
                  <AlertTriangle size={12} /> Over capacity
                </span>
              )}
              <span className="flex items-center gap-1 text-[#B45309]">
                <Activity size={12} /> &gt;80% warning
              </span>
            </div>
          </div>
          <ReactECharts option={capacityOption} style={{ height: "200px" }} />
        </div>
      )}
    </div>
  );
}
