export const DASHBOARD_CACHE_VERSION = 2;

export const emptyDashboardData = {
  greenhouses: [],
  cycles: [],
  harvests: [],
  sales: [],
  expenses: [],
  popLogs: [],
  incidents: [],
  inventoryItems: [],
  workers: [],
  workerCount: 0,
  calendarEvents: [],
};

export const normalizeDashboardData = (data = {}) => {
  const normalized = { ...emptyDashboardData, ...data };
  normalized.workerCount = normalized.workerCount ?? normalized.workers.length;
  return normalized;
};

export const getDashboardCacheKey = (isAdmin) =>
  `tgh_dashboard_greenhouse_v${DASHBOARD_CACHE_VERSION}_${isAdmin ? "admin" : "farm_manager"}`;

export const readDashboardCache = (cacheKey) => {
  if (typeof window === "undefined") return null;
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(cacheKey) || "null");
    if (!parsed || typeof parsed !== "object") return null;
    return normalizeDashboardData(parsed);
  } catch {
    return null;
  }
};

export const writeDashboardCache = (cacheKey, data) => {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(cacheKey, JSON.stringify({ ...normalizeDashboardData(data), cachedAt: new Date().toISOString() }));
  } catch {
    // Ignore storage quota/privacy errors; the network response still renders.
  }
};
