import { authStorage } from "@/api/base44Client";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

const buildUrl = (path) => `${API_BASE_URL}${path}`;

const request = async (path, { method = "GET", data } = {}) => {
  const headers = {
    "Content-Type": "application/json",
  };

  const token = authStorage.getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;

  try {
    response = await fetch(buildUrl(path), {
      method,
      headers,
      body: data == null ? undefined : JSON.stringify(data),
    });
  } catch (cause) {
    const error = new Error(`Cannot reach API server at ${API_BASE_URL || window.location.origin}.`);
    error.status = 0;
    error.cause = cause;
    throw error;
  }

  if (!response.ok) {
    let payload = null;
    try {
      payload = await response.json();
    } catch (_error) {
      payload = null;
    }
    const error = new Error(payload?.error || response.statusText || "Request failed");
    error.status = response.status;
    error.data = payload;
    throw error;
  }

  if (response.status === 204) return null;
  return response.json();
};

const createResourceClient = (basePath) => ({
  list: () => request(basePath),
  get: (id) => request(`${basePath}/${id}`),
  create: (payload) => request(basePath, { method: "POST", data: payload }),
  update: (id, payload) => request(`${basePath}/${id}`, { method: "PATCH", data: payload }),
  remove: (id) =>
    Array.isArray(id)
      ? request(`${basePath}/bulk-delete`, { method: "POST", data: { ids: id } })
      : request(`${basePath}/${id}`, { method: "DELETE" }),
});

const createModuleClient = (basePath, resources) => {
  const client = {
    getDashboard: () => request(`${basePath}/dashboard`),
    getAnalytics: () => request(`${basePath}/analytics`),
  };

  resources.forEach(([key, path]) => {
    client[key] = createResourceClient(`${basePath}${path}`);
  });

  return client;
};

export const poultryClient = createModuleClient("/api/poultry", [
  ["houses", "/houses"],
  ["flocks", "/flocks"],
  ["dailyLogs", "/daily-logs"],
  ["feedLogs", "/feed-logs"],
  ["healthLogs", "/health-logs"],
  ["sales", "/sales"],
  ["expenses", "/expenses"],
]);

export const goatsClient = createModuleClient("/api/goats", [
  ["pens", "/pens"],
  ["registry", "/registry"],
  ["breeding", "/breeding"],
  ["healthLogs", "/health-logs"],
  ["weightLogs", "/weight-logs"],
  ["feedLogs", "/feed-logs"],
  ["sales", "/sales"],
  ["expenses", "/expenses"],
]);
