const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
const TOKEN_STORAGE_KEY = "tgh_auth_token";

const entityClientCache = new Map();
const entitySubscribers = new Map();

let eventSource = null;
let eventSourceToken = null;
let reconnectTimer = null;

const hasWindow = typeof window !== "undefined";

const buildUrl = (path) => `${API_BASE_URL}${path}`;
const getReadableApiBase = () =>
  API_BASE_URL || (hasWindow ? window.location.origin : "http://localhost:3001");

const getToken = () => {
  if (!hasWindow) return null;
  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
};

const setToken = (token) => {
  if (!hasWindow) return;
  if (token) {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
};

const toApiError = async (response) => {
  let body = null;
  try {
    body = await response.json();
  } catch (_err) {
    body = null;
  }
  const error = new Error(body?.error || response.statusText || "Request failed");
  error.status = response.status;
  error.data = body;
  return error;
};

const normalizeNullStrings = (value) => {
  if (value === "null") return null;
  if (Array.isArray(value)) return value.map(normalizeNullStrings);
  if (value != null && typeof value === "object") {
    const out = {};
    Object.entries(value).forEach(([key, child]) => {
      out[key] = normalizeNullStrings(child);
    });
    return out;
  }
  return value;
};

const request = async (path, { method = "GET", data, auth = true, isFormData = false } = {}) => {
  const headers = {};
  const token = getToken();
  const normalizedData = isFormData ? data : normalizeNullStrings(data);

  if (!isFormData) headers["Content-Type"] = "application/json";
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(buildUrl(path), {
      method,
      headers,
      body: normalizedData == null ? undefined : isFormData ? normalizedData : JSON.stringify(normalizedData),
    });
  } catch (err) {
    const error = new Error(`Cannot reach API server at ${getReadableApiBase()}.`);
    error.status = 0;
    error.data = null;
    error.cause = err;
    throw error;
  }

  if (!response.ok) {
    throw await toApiError(response);
  }

  if (response.status === 204) return null;
  return response.json();
};

const closeEvents = () => {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }
  eventSourceToken = null;
};

const dispatchEntityEvent = (payload) => {
  if (!payload?.entity) return;
  const listeners = entitySubscribers.get(payload.entity);
  if (!listeners || listeners.size === 0) return;

  const event = {
    type: payload.type,
    id: payload.id,
    data: payload.data,
  };

  for (const callback of listeners) {
    try {
      callback(event);
    } catch (err) {
      console.error("Entity subscriber failed:", err);
    }
  }
};

const hasSubscribers = () => [...entitySubscribers.values()].some((set) => set.size > 0);

const openEvents = () => {
  if (!hasWindow) return;
  const token = getToken();
  if (!token || !hasSubscribers()) return;
  if (eventSource && eventSourceToken === token) return;

  closeEvents();

  const base = API_BASE_URL || window.location.origin;
  const url = new URL(`${base.replace(/\/$/, "")}/api/events`);
  url.searchParams.set("token", token);

  eventSource = new EventSource(url.toString());
  eventSourceToken = token;

  eventSource.onmessage = (message) => {
    try {
      const payload = JSON.parse(message.data);
      if (payload?.entity) dispatchEntityEvent(payload);
    } catch (_err) {
      // Ignore malformed events and heartbeat frames.
    }
  };

  eventSource.onerror = () => {
    closeEvents();
    if (!hasSubscribers()) return;
    reconnectTimer = setTimeout(() => openEvents(), 8000);
  };
};

const subscribeEntity = (entityName, callback) => {
  if (!entitySubscribers.has(entityName)) {
    entitySubscribers.set(entityName, new Set());
  }
  const listeners = entitySubscribers.get(entityName);
  listeners.add(callback);
  openEvents();

  return () => {
    const set = entitySubscribers.get(entityName);
    if (!set) return;
    set.delete(callback);
    if (set.size === 0) {
      entitySubscribers.delete(entityName);
    }
    if (!hasSubscribers()) {
      closeEvents();
    }
  };
};

const createEntityClient = (entityName) => ({
  async list(sort, limit) {
    const params = new URLSearchParams();
    if (sort) params.set("sort", String(sort));
    if (limit != null) params.set("limit", String(limit));
    const suffix = params.toString() ? `?${params.toString()}` : "";
    return request(`/api/entities/${entityName}${suffix}`);
  },

  async filter(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value == null) params.set(key, "null");
      else params.set(key, String(value));
    });
    const suffix = params.toString() ? `?${params.toString()}` : "";
    return request(`/api/entities/${entityName}/filter${suffix}`);
  },

  async create(data) {
    return request(`/api/entities/${entityName}`, { method: "POST", data });
  },

  async update(id, data) {
    return request(`/api/entities/${entityName}/${id}`, { method: "PATCH", data });
  },

  async delete(id) {
    return request(`/api/entities/${entityName}/${id}`, { method: "DELETE" });
  },

  subscribe(callback) {
    return subscribeEntity(entityName, callback);
  },
});

const entities = new Proxy(
  {},
  {
    get(_target, prop) {
      if (typeof prop !== "string") return undefined;
      if (!entityClientCache.has(prop)) {
        entityClientCache.set(prop, createEntityClient(prop));
      }
      return entityClientCache.get(prop);
    },
  }
);

export const base44 = {
  entities,

  auth: {
    async bootstrap() {
      return request("/api/auth/bootstrap", { auth: false });
    },

    async setup({ email, password, full_name }) {
      const result = await request("/api/auth/setup", {
        method: "POST",
        data: { email, password, full_name },
        auth: false,
      });
      setToken(result.token);
      closeEvents();
      return result.user;
    },

    async login(email, password) {
      const result = await request("/api/auth/login", {
        method: "POST",
        data: { email, password },
        auth: false,
      });
      setToken(result.token);
      closeEvents();
      return result.user;
    },

    async me() {
      return request("/api/auth/me");
    },

    async updateMe(data) {
      return request("/api/auth/me", { method: "PATCH", data });
    },

    async logout(redirectUrl) {
      try {
        if (getToken()) {
          await request("/api/auth/logout", { method: "POST" });
        }
      } catch (_err) {
        // Ignore logout API failure and clear local session anyway.
      } finally {
        setToken(null);
        closeEvents();
        if (redirectUrl && hasWindow) {
          window.location.assign(redirectUrl);
        }
      }
    },

    redirectToLogin(returnTo) {
      if (!hasWindow) return;
      const from = encodeURIComponent(returnTo || window.location.href);
      window.location.assign(`/login?from=${from}`);
    },
  },

  users: {
    async createUser({ full_name, email, password, role }) {
      return request("/api/users", {
        method: "POST",
        data: { full_name, email, password, role },
      });
    },

    async inviteUser(email, role) {
      return request("/api/users/invite", {
        method: "POST",
        data: { email, role },
      });
    },
  },

  reminders: {
    async run({ dry_run = false } = {}) {
      return request("/api/reminders/run", {
        method: "POST",
        data: { dry_run },
      });
    },

    async sendTestEmail({ to } = {}) {
      return request("/api/reminders/test-email", {
        method: "POST",
        data: { to },
      });
    },
  },

  integrations: {
    Core: {
      async UploadFile({ file }) {
        const uploadFile = file instanceof Blob && !(file instanceof File)
          ? new File([file], `upload-${Date.now()}.bin`, { type: file.type || "application/octet-stream" })
          : file;

        const formData = new FormData();
        formData.append("file", uploadFile);
        return request("/api/upload", {
          method: "POST",
          data: formData,
          isFormData: true,
        });
      },

      async GetExchangeRate(code) {
        return request(`/api/fx?to=${encodeURIComponent(code)}`, { auth: false });
      },

      async InvokeLLM() {
        throw new Error("InvokeLLM is not available in self-hosted mode");
      },
    },
  },
};

export const authStorage = {
  key: TOKEN_STORAGE_KEY,
  getToken,
};
