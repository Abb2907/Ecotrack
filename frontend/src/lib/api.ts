import { auth } from "./firebase";

/** Base URL for the EcoTrack backend API. */
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

/**
 * Build authorization headers with the current user's ID token.
 *
 * @returns A headers object with Content-Type and optional Authorization.
 */
async function getHeaders(): Promise<HeadersInit> {
  let token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
  if (!token && typeof window !== "undefined") {
    token = localStorage.getItem("ecotrack_mock_token");
  }
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

/** User profile data returned by the backend. */
export interface UserProfile {
  userId: string;
  email: string;
  displayName: string;
  role: string;
  carbonBaseline: {
    transport: number;
    energy: number;
    diet: number;
    total: number;
  };
  preferences: {
    theme: string;
    emailNotifications: boolean;
  };
  consent: {
    dataProcessingAccepted: boolean;
    consentTimestamp: string;
    consentVersion: string;
  };
  deletionRequested?: string | null;
}

/** Eco-action catalog item. */
export interface ActionItem {
  actionId: string;
  title: string;
  description: string;
  category: "transport" | "energy" | "diet";
  baseReduction: number;
  unit: string;
}

/** Daily activity log entry. */
export interface DailyLog {
  logId: string;
  actionId: string;
  category: "transport" | "energy" | "diet";
  date: string;
  quantity: number;
  co2Reduced: number;
}

/** Single AI-generated sustainability recommendation. */
export interface RecommendationItem {
  title: string;
  impact: "high" | "medium" | "low";
  difficulty: "easy" | "moderate" | "hard";
  description: string;
}

/** Weekly AI insights collection. */
export interface WeeklyInsights {
  insightId: string;
  userId: string;
  weekStartDate: string;
  recommendations: RecommendationItem[];
  createdAt: string;
}

/**
 * Centralized API client for all EcoTrack backend interactions.
 *
 * All methods automatically attach the authenticated user's Bearer token.
 */
export const api = {
  // Authentication & Profile Endpoints
  async registerUser(displayName: string, email: string): Promise<UserProfile> {
    const headers = await getHeaders();
    const response = await fetch(`${BACKEND_URL}/api/v1/auth/register`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        displayName,
        email,
        consent: {
          dataProcessingAccepted: true,
          consentTimestamp: new Date().toISOString(),
          consentVersion: "v1",
        },
      }),
    });
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  },

  async getProfile(): Promise<UserProfile> {
    const headers = await getHeaders();
    const response = await fetch(`${BACKEND_URL}/api/v1/auth/me`, {
      method: "GET",
      headers,
    });
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  },

  async updateBaseline(transport: number, energy: number, diet: number): Promise<UserProfile> {
    const headers = await getHeaders();
    const response = await fetch(`${BACKEND_URL}/api/v1/auth/baseline`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ transport, energy, diet }),
    });
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  },

  // Actions & Catalog Endpoints
  async getCatalog(category?: string): Promise<ActionItem[]> {
    const headers = await getHeaders();
    const url = category
      ? `${BACKEND_URL}/api/v1/actions/catalog?category=${category}`
      : `${BACKEND_URL}/api/v1/actions/catalog`;
    const response = await fetch(url, {
      method: "GET",
      headers,
    });
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  },

  async logAction(actionId: string, date: string, quantity: number): Promise<DailyLog> {
    const headers = await getHeaders();
    const response = await fetch(`${BACKEND_URL}/api/v1/actions/log`, {
      method: "POST",
      headers,
      body: JSON.stringify({ actionId, date, quantity }),
    });
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  },

  async getLogs(limit: number = 50, offset?: string): Promise<DailyLog[]> {
    const headers = await getHeaders();
    let url = `${BACKEND_URL}/api/v1/actions/logs?limit=${limit}`;
    if (offset) url += `&offset=${offset}`;
    const response = await fetch(url, {
      method: "GET",
      headers,
    });
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  },

  async deleteLog(logId: string): Promise<void> {
    const headers = await getHeaders();
    const response = await fetch(`${BACKEND_URL}/api/v1/actions/logs/${logId}`, {
      method: "DELETE",
      headers,
    });
    if (!response.ok) throw new Error(await response.text());
  },

  // Vertex AI Recommendation Endpoints
  async getLatestInsights(): Promise<WeeklyInsights> {
    const headers = await getHeaders();
    const response = await fetch(`${BACKEND_URL}/api/v1/insights/latest`, {
      method: "GET",
      headers,
    });
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  },

  async generateInsights(): Promise<WeeklyInsights> {
    const headers = await getHeaders();
    const response = await fetch(`${BACKEND_URL}/api/v1/insights/generate`, {
      method: "POST",
      headers,
    });
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  },

  // GDPR Data Portability & Privacy Endpoints
  async exportMyData(): Promise<any> {
    const headers = await getHeaders();
    const response = await fetch(`${BACKEND_URL}/api/v1/privacy/export`, {
      method: "GET",
      headers,
    });
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  },

  async scheduleDeletion(): Promise<any> {
    const headers = await getHeaders();
    const response = await fetch(`${BACKEND_URL}/api/v1/privacy/delete`, {
      method: "POST",
      headers,
    });
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  },

  async cancelDeletion(): Promise<any> {
    const headers = await getHeaders();
    const response = await fetch(`${BACKEND_URL}/api/v1/privacy/delete/cancel`, {
      method: "POST",
      headers,
    });
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  },
};
