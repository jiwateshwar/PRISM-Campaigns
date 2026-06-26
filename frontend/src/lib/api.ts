import axios, { AxiosInstance, AxiosRequestConfig } from "axios";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

class ApiClient {
  private client: AxiosInstance;
  private accessToken: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: `${BASE_URL}/api/v1`,
      headers: { "Content-Type": "application/json" },
      timeout: 30000,
    });

    // Request interceptor — attach token
    this.client.interceptors.request.use((config) => {
      const token = this.getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Response interceptor — handle 401
    this.client.interceptors.response.use(
      (res) => res,
      async (error) => {
        const original = error.config;
        if (error.response?.status === 401 && !original._retry) {
          original._retry = true;
          try {
            const refreshToken = localStorage.getItem("refresh_token");
            if (refreshToken) {
              const res = await axios.post(`${BASE_URL}/api/v1/auth/refresh`, {
                refresh_token: refreshToken,
              });
              const { access_token, refresh_token } = res.data;
              this.setToken(access_token);
              localStorage.setItem("refresh_token", refresh_token);
              original.headers.Authorization = `Bearer ${access_token}`;
              return this.client(original);
            }
          } catch {
            this.clearToken();
            if (typeof window !== "undefined") {
              window.location.href = "/login";
            }
          }
        }
        return Promise.reject(error);
      }
    );
  }

  setToken(token: string) {
    this.accessToken = token;
    if (typeof window !== "undefined") {
      localStorage.setItem("access_token", token);
    }
  }

  getToken(): string | null {
    if (this.accessToken) return this.accessToken;
    if (typeof window !== "undefined") {
      return localStorage.getItem("access_token");
    }
    return null;
  }

  clearToken() {
    this.accessToken = null;
    if (typeof window !== "undefined") {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
    }
  }

  // ─── Auth ────────────────────────────────────────────────────────────────────

  async login(email: string, password: string) {
    const res = await this.client.post("/auth/login", { email, password });
    return res.data;
  }

  async refreshToken(refreshToken: string) {
    const res = await this.client.post("/auth/refresh", { refresh_token: refreshToken });
    return res.data;
  }

  async getMe() {
    const res = await this.client.get("/users/me");
    return res.data;
  }

  // ─── Operators ───────────────────────────────────────────────────────────────

  async getOperators() {
    const res = await this.client.get("/operators");
    return res.data;
  }

  async getOperator(id: string) {
    const res = await this.client.get(`/operators/${id}`);
    return res.data;
  }

  async createOperator(data: Record<string, unknown>) {
    const res = await this.client.post("/operators", data);
    return res.data;
  }

  async updateOperator(id: string, data: Record<string, unknown>) {
    const res = await this.client.patch(`/operators/${id}`, data);
    return res.data;
  }

  // ─── Products ────────────────────────────────────────────────────────────────

  async getProducts(operatorSlug: string, activeOnly = false) {
    const res = await this.client.get(`/${operatorSlug}/products`, { params: { active_only: activeOnly } });
    return res.data;
  }

  async createProduct(operatorSlug: string, data: Record<string, unknown>) {
    const res = await this.client.post(`/${operatorSlug}/products`, data);
    return res.data;
  }

  async updateProduct(operatorSlug: string, id: string, data: Record<string, unknown>) {
    const res = await this.client.patch(`/${operatorSlug}/products/${id}`, data);
    return res.data;
  }

  async deleteProduct(operatorSlug: string, id: string) {
    await this.client.delete(`/${operatorSlug}/products/${id}`);
  }

  // ─── Monthly Plans ───────────────────────────────────────────────────────────

  async getPlans(operatorSlug: string, productId?: string) {
    const res = await this.client.get(`/${operatorSlug}/plans`, { params: { product_id: productId } });
    return res.data;
  }

  async createPlan(operatorSlug: string, data: Record<string, unknown>) {
    const res = await this.client.post(`/${operatorSlug}/plans`, data);
    return res.data;
  }

  async updatePlan(operatorSlug: string, id: string, data: Record<string, unknown>) {
    const res = await this.client.patch(`/${operatorSlug}/plans/${id}`, data);
    return res.data;
  }

  async deletePlan(operatorSlug: string, id: string) {
    await this.client.delete(`/${operatorSlug}/plans/${id}`);
  }

  async getPlanObjectives(operatorSlug: string, planId: string) {
    const res = await this.client.get(`/${operatorSlug}/plans/${planId}/objectives`);
    return res.data;
  }

  async createObjective(operatorSlug: string, planId: string, data: Record<string, unknown>) {
    const res = await this.client.post(`/${operatorSlug}/plans/${planId}/objectives`, data);
    return res.data;
  }

  // ─── Campaigns ───────────────────────────────────────────────────────────────

  async getCampaigns(operatorSlug: string, params?: Record<string, unknown>) {
    const res = await this.client.get(`/${operatorSlug}/campaigns`, { params });
    return res.data;
  }

  async getCampaign(operatorSlug: string, id: string) {
    const res = await this.client.get(`/${operatorSlug}/campaigns/${id}`);
    return res.data;
  }

  async createCampaign(operatorSlug: string, data: Record<string, unknown>) {
    const res = await this.client.post(`/${operatorSlug}/campaigns`, data);
    return res.data;
  }

  async updateCampaign(operatorSlug: string, id: string, data: Record<string, unknown>) {
    const res = await this.client.patch(`/${operatorSlug}/campaigns/${id}`, data);
    return res.data;
  }

  async deleteCampaign(operatorSlug: string, id: string) {
    await this.client.delete(`/${operatorSlug}/campaigns/${id}`);
  }

  async getCampaignTasks(operatorSlug: string, campaignId: string) {
    const res = await this.client.get(`/${operatorSlug}/campaigns/${campaignId}/tasks`);
    return res.data;
  }

  async createCampaignTask(operatorSlug: string, campaignId: string, data: Record<string, unknown>) {
    const res = await this.client.post(`/${operatorSlug}/campaigns/${campaignId}/tasks`, data);
    return res.data;
  }

  async updateCampaignTask(operatorSlug: string, campaignId: string, taskId: string, data: Record<string, unknown>) {
    const res = await this.client.patch(`/${operatorSlug}/campaigns/${campaignId}/tasks/${taskId}`, data);
    return res.data;
  }

  /** Alias for createCampaignTask used in campaign detail page */
  async createSupportTask(operatorSlug: string, campaignId: string, data: Record<string, unknown>) {
    return this.createCampaignTask(operatorSlug, campaignId, data);
  }

  async getCampaignDependencies(operatorSlug: string, campaignId: string) {
    const res = await this.client.get(`/${operatorSlug}/campaigns/${campaignId}/dependencies`);
    return res.data;
  }

  async importActuals(operatorSlug: string, campaignId: string, data: Record<string, unknown>) {
    const res = await this.client.post(`/${operatorSlug}/campaigns/${campaignId}/actuals`, data);
    return res.data;
  }

  // ─── Segments ────────────────────────────────────────────────────────────────

  async getSegments(operatorSlug: string, activeOnly = true) {
    const res = await this.client.get(`/${operatorSlug}/segments`, { params: { active_only: activeOnly } });
    return res.data;
  }

  async createSegment(operatorSlug: string, data: Record<string, unknown>) {
    const res = await this.client.post(`/${operatorSlug}/segments`, data);
    return res.data;
  }

  async updateSegment(operatorSlug: string, id: string, data: Record<string, unknown>) {
    const res = await this.client.patch(`/${operatorSlug}/segments/${id}`, data);
    return res.data;
  }

  async getSegmentVersions(operatorSlug: string, id: string) {
    const res = await this.client.get(`/${operatorSlug}/segments/${id}/versions`);
    return res.data;
  }

  // ─── Offers ──────────────────────────────────────────────────────────────────

  async getOffers(operatorSlug: string, params?: Record<string, unknown>) {
    const res = await this.client.get(`/${operatorSlug}/offers`, { params });
    return res.data;
  }

  async createOffer(operatorSlug: string, data: Record<string, unknown>) {
    const res = await this.client.post(`/${operatorSlug}/offers`, data);
    return res.data;
  }

  async updateOffer(operatorSlug: string, id: string, data: Record<string, unknown>) {
    const res = await this.client.patch(`/${operatorSlug}/offers/${id}`, data);
    return res.data;
  }

  async deleteOffer(operatorSlug: string, id: string) {
    await this.client.delete(`/${operatorSlug}/offers/${id}`);
  }

  // ─── Creatives ───────────────────────────────────────────────────────────────

  async getCreatives(operatorSlug: string, params?: Record<string, unknown>) {
    const res = await this.client.get(`/${operatorSlug}/creatives`, { params });
    return res.data;
  }

  async createCreative(operatorSlug: string, data: Record<string, unknown>) {
    const res = await this.client.post(`/${operatorSlug}/creatives`, data);
    return res.data;
  }

  async updateCreative(operatorSlug: string, id: string, data: Record<string, unknown>) {
    const res = await this.client.patch(`/${operatorSlug}/creatives/${id}`, data);
    return res.data;
  }

  async deleteCreative(operatorSlug: string, id: string) {
    const res = await this.client.delete(`/${operatorSlug}/creatives/${id}`);
    return res.data;
  }

  // ─── Journeys ────────────────────────────────────────────────────────────────

  async getJourneys(operatorSlug: string, campaignId?: string) {
    const res = await this.client.get(`/${operatorSlug}/journeys`, { params: { campaign_id: campaignId } });
    return res.data;
  }

  async getJourney(operatorSlug: string, id: string) {
    const res = await this.client.get(`/${operatorSlug}/journeys/${id}`);
    return res.data;
  }

  async createJourney(operatorSlug: string, data: Record<string, unknown>) {
    const res = await this.client.post(`/${operatorSlug}/journeys`, data);
    return res.data;
  }

  async updateJourney(operatorSlug: string, id: string, data: Record<string, unknown>) {
    const res = await this.client.patch(`/${operatorSlug}/journeys/${id}`, data);
    return res.data;
  }

  async deleteJourney(operatorSlug: string, id: string) {
    await this.client.delete(`/${operatorSlug}/journeys/${id}`);
  }

  async getJourneyTemplates(operatorSlug: string, category?: string) {
    const res = await this.client.get(`/${operatorSlug}/journeys/templates`, { params: { category } });
    return res.data;
  }

  async cloneTemplate(operatorSlug: string, templateId: string, name: string) {
    const res = await this.client.post(`/${operatorSlug}/journeys/templates/${templateId}/clone`, null, {
      params: { name },
    });
    return res.data;
  }

  // ─── Analytics ───────────────────────────────────────────────────────────────

  async getOperatorSummary(operatorSlug: string) {
    const res = await this.client.get(`/${operatorSlug}/analytics/operator-summary`);
    return res.data;
  }

  async getCampaignPerformance(operatorSlug: string, months = 6) {
    const res = await this.client.get(`/${operatorSlug}/analytics/campaign-performance`, { params: { months } });
    return res.data;
  }

  async getChannelCapacityStats(operatorSlug: string, month?: string) {
    const res = await this.client.get(`/${operatorSlug}/analytics/channel-capacity`, { params: { month } });
    return res.data;
  }

  async getForecastVsActual(operatorSlug: string, planId?: string) {
    const res = await this.client.get(`/${operatorSlug}/analytics/forecast-vs-actual`, {
      params: { monthly_plan_id: planId },
    });
    return res.data;
  }

  // ─── Channel Capacity ─────────────────────────────────────────────────────────

  async getChannelCapacities(operatorSlug: string, month?: string) {
    const res = await this.client.get(`/${operatorSlug}/capacity`, { params: { month } });
    return res.data;
  }

  /** Alias used by analytics page */
  async getChannelCapacity(operatorSlug: string, month?: string) {
    return this.getChannelCapacities(operatorSlug, month);
  }

  async createChannelCapacity(operatorSlug: string, data: Record<string, unknown>) {
    const res = await this.client.post(`/${operatorSlug}/capacity`, data);
    return res.data;
  }

  async updateChannelCapacity(operatorSlug: string, id: string, data: Record<string, unknown>) {
    const res = await this.client.patch(`/${operatorSlug}/capacity/${id}`, data);
    return res.data;
  }

  async checkCapacityConflicts(operatorSlug: string, month: string) {
    const res = await this.client.get(`/${operatorSlug}/capacity/conflict-check`, { params: { month } });
    return res.data;
  }

  // ─── Users ───────────────────────────────────────────────────────────────────

  async getUsers() {
    const res = await this.client.get("/users");
    return res.data;
  }

  async createUser(data: Record<string, unknown>) {
    const res = await this.client.post("/users", data);
    return res.data;
  }

  async assignOperatorRole(data: Record<string, unknown>) {
    const res = await this.client.post("/users/operator-roles", data);
    return res.data;
  }

  async updateMe(data: { full_name?: string }) {
    const res = await this.client.patch("/users/me", data);
    return res.data;
  }

  async changePassword(current_password: string, new_password: string) {
    await this.client.post("/users/me/change-password", { current_password, new_password });
  }
}

export const api = new ApiClient();
export default api;
