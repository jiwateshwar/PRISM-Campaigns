// ─── Core Types ───────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  full_name: string;
  is_super_admin: boolean;
  avatar_url?: string | null;
}

export interface AuthState {
  user: User | null;
  access_token: string | null;
  refresh_token: string | null;
  isAuthenticated: boolean;
}

// ─── Operator ─────────────────────────────────────────────────────────────────

export interface Operator {
  id: string;
  name: string;
  slug: string;
  country: string;
  timezone: string;
  currency: string;
  logo_url?: string | null;
  primary_color?: string | null;
  is_active: boolean;
  settings: Record<string, unknown>;
}

// ─── Product ──────────────────────────────────────────────────────────────────

export interface Product {
  id: string;
  operator_id: string;
  name: string;
  code: string;
  description?: string | null;
  category?: string | null;
  icon?: string | null;
  color?: string | null;
  is_active: boolean;
}

// ─── Campaign ─────────────────────────────────────────────────────────────────

export type CampaignStatus =
  | "draft"
  | "planned"
  | "ready"
  | "scheduled"
  | "executing"
  | "completed"
  | "results_imported"
  | "closed";

export interface CampaignForecast {
  estimated_reach: number;
  expected_conversion_pct: number;
  monthly_arpu: number;
  expected_churn_reduction: number;
  expected_retention: number;
  expected_upsell: number;
  expected_activations: number;
  expected_revenue: number;
  objective_contribution_pct: number;
}

export interface CampaignActuals {
  actual_reach: number;
  actual_activations: number;
  actual_revenue: number;
  actual_conversion_rate: number;
  actual_churn_reduction?: number;
}

export interface Campaign {
  id: string;
  operator_id: string;
  name: string;
  description?: string | null;
  status: CampaignStatus;
  product_id?: string | null;
  monthly_plan_id?: string | null;
  segment_id?: string | null;
  offer_id?: string | null;
  creative_id?: string | null;
  journey_id?: string | null;
  planned_start_date?: string | null;
  planned_end_date?: string | null;
  actual_start_date?: string | null;
  actual_end_date?: string | null;
  channels: string[];
  objective_ids: string[];
  forecast: Partial<CampaignForecast>;
  priority: number;
  notes?: string | null;
  tags: string[];
  actuals?: CampaignActuals | null;
  created_at?: string;
  updated_at?: string;
}

export interface SupportTask {
  id: string;
  campaign_id: string;
  team: string;
  title: string;
  description?: string | null;
  owner?: string | null;
  due_date?: string | null;
  status: "pending" | "in_progress" | "completed" | "blocked";
  completion_pct: number;
  comments?: string | null;
}

export interface Dependency {
  id: string;
  dependent_campaign_id: string;
  depends_on_campaign_id?: string | null;
  dependency_type: string;
  description?: string | null;
  is_resolved: boolean;
}

// ─── Monthly Plan ─────────────────────────────────────────────────────────────

export interface MonthlyPlan {
  id: string;
  operator_id: string;
  product_id?: string | null;
  name: string;
  month: string;
  status: string;
  target_activations: number;
  target_revenue: number;
  target_churn_reduction: number;
  notes?: string | null;
  created_at?: string;
}

export interface BusinessObjective {
  id: string;
  name: string;
  description?: string | null;
  objective_type: string;
  target_value: number;
  target_unit: string;
  current_value: number;
  weight: number;
}

// ─── Segment ──────────────────────────────────────────────────────────────────

export interface Segment {
  id: string;
  operator_id: string;
  name: string;
  description?: string | null;
  business_rules: Record<string, unknown>;
  estimated_audience_size: number;
  eligible_audience_size: number;
  current_version: number;
  owner?: string | null;
  tags: string[];
  is_active: boolean;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

// ─── Offer ────────────────────────────────────────────────────────────────────

export interface Offer {
  id: string;
  operator_id: string;
  product_id?: string | null;
  name: string;
  description?: string | null;
  price: number;
  currency: string;
  validity_days: number;
  expected_monthly_arpu: number;
  expected_conversion_rate: number;
  status: "active" | "inactive" | "archived";
}

// ─── Creative ─────────────────────────────────────────────────────────────────

export type ChannelType = "sms" | "whatsapp" | "ussd" | "obd" | "ivr" | "push" | "email" | "rich_media" | "banner";

export interface Creative {
  id: string;
  operator_id?: string | null;
  name: string;
  description?: string | null;
  channels: ChannelType[];
  content: Record<string, unknown>;
  telco_name?: string | null;
  language: string;
  current_version: number;
  status: "draft" | "approved" | "archived";
  tags: string[];
  is_shared: boolean;
  created_at?: string;
}

// ─── Journey ──────────────────────────────────────────────────────────────────

export interface Journey {
  id: string;
  operator_id: string;
  campaign_id?: string | null;
  name: string;
  description?: string | null;
  status: string;
  nodes: Record<string, unknown>[];
  edges: Record<string, unknown>[];
  viewport: Record<string, unknown>;
  is_template: boolean;
  template_id?: string | null;
}

export interface JourneyTemplate {
  id: string;
  name: string;
  description?: string | null;
  category: string;
  nodes: Record<string, unknown>[];
  edges: Record<string, unknown>[];
  viewport: Record<string, unknown>;
  thumbnail_url?: string | null;
  usage_count: number;
  tags: string[];
}

// ─── Channel Capacity ─────────────────────────────────────────────────────────

export interface ChannelCapacity {
  id: string;
  operator_id: string;
  channel: string;
  month: string;
  daily_capacity: number;
  monthly_capacity: number;
  allocated: number;
  utilization_pct: number;
  is_over_capacity: boolean;
  notes?: string | null;
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export interface OperatorSummary {
  campaign_status_counts: Record<string, number>;
  total_campaigns: number;
  forecast: {
    reach: number;
    activations: number;
    revenue: number;
  };
  actuals: {
    activations: number;
    revenue: number;
  };
  segment_count: number;
  active_offer_count: number;
}

// ─── UI Helpers ───────────────────────────────────────────────────────────────

export const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
  draft: "Draft",
  planned: "Planned",
  ready: "Ready",
  scheduled: "Scheduled",
  executing: "Executing",
  completed: "Completed",
  results_imported: "Results Imported",
  closed: "Closed",
};

export const CAMPAIGN_STATUS_COLORS: Record<CampaignStatus, string> = {
  draft: "bg-slate-100 text-slate-700",
  planned: "bg-blue-100 text-blue-700",
  ready: "bg-teal-100 text-teal-700",
  scheduled: "bg-purple-100 text-purple-700",
  executing: "bg-amber-100 text-amber-700",
  completed: "bg-green-100 text-green-700",
  results_imported: "bg-emerald-100 text-emerald-700",
  closed: "bg-gray-100 text-gray-500",
};

export const CHANNEL_LABELS: Record<string, string> = {
  sms: "SMS",
  whatsapp: "WhatsApp",
  ussd: "USSD",
  obd: "OBD",
  ivr: "IVR",
  push: "Push",
  email: "Email",
  rich_media: "Rich Media",
  banner: "Banner",
};

export const PRIORITY_LABELS: Record<number, string> = {
  1: "Critical",
  2: "High",
  3: "Medium",
  4: "Low",
};

export const PRIORITY_COLORS: Record<number, string> = {
  1: "bg-red-100 text-red-700",
  2: "bg-orange-100 text-orange-700",
  3: "bg-yellow-100 text-yellow-700",
  4: "bg-gray-100 text-gray-600",
};
