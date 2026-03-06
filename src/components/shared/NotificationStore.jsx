// Singleton notification store — accumulates events from entity subscriptions
// Components can subscribe to updates via subscribe().

import { base44 } from "@/api/base44Client";

const STORAGE_KEY = "gpdNotifications";
const UPCOMING_EVENT_LOOKAHEAD_HOURS = 24;
const UPCOMING_EVENT_SCAN_INTERVAL_MS = 5 * 60 * 1000;
let notifications = [];
let listeners = [];
let subscriptions = [];
let initialized = false;
let upcomingScanTimer = null;
let upcomingScanInFlight = false;

function saveToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  } catch (e) {
    console.error("Failed to save notifications to localStorage", e);
  }
}

function loadFromStorage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      notifications = JSON.parse(stored);
    }
  } catch (e) {
    console.error("Failed to load notifications from localStorage", e);
    notifications = [];
  }
}

function notify() {
  listeners.forEach(fn => fn([...notifications]));
}

export function subscribeToNotifications(fn) {
  listeners.push(fn);
  fn([...notifications]);
  return () => { listeners = listeners.filter(l => l !== fn); };
}

export function addNotification(n) {
  if (notifications.find(x => x.id === n.id)) return;
  notifications = [n, ...notifications].slice(0, 60);
  saveToStorage();
  notify();
}

export function markAllRead() {
  notifications = notifications.map(n => ({ ...n, read: true }));
  saveToStorage();
  notify();
}

export function markRead(id) {
  notifications = notifications.map(n => n.id === id ? { ...n, read: true } : n);
  saveToStorage();
  notify();
}

export function removeNotification(id) {
  notifications = notifications.filter(n => n.id !== id);
  saveToStorage();
  notify();
}

export function clearNotifications() {
  notifications = [];
  saveToStorage();
  notify();
}

function getPriorityForEvent(entityName, data) {
  if (entityName === "Incident") {
    if (data?.severity === "critical") return "critical";
    if (data?.severity === "high") return "high";
    return "medium";
  }
  if (entityName === "InventoryItem" && data?.reorder_level != null && data?.quantity_in_stock != null) {
    if (data.quantity_in_stock <= data.reorder_level) return "high";
  }
  if (entityName === "Treatment") return "medium";
  if (entityName === "CalendarEvent") return "medium";
  return "info";
}

function buildMessage(entityName, type, data) {
  switch (entityName) {
    case "HarvestRecord":
      return type === "create" ? `New harvest logged: ${data?.kg_harvested || 0} kg` : `Harvest record updated`;
    case "Incident":
      return type === "create"
        ? `New ${data?.severity || ""} incident: ${data?.name || data?.incident_type || "Pest/Disease"}`
        : `Incident updated: ${data?.name || data?.incident_type || ""}`;
    case "ExpenseRecord":
      return type === "create"
        ? `Expense logged: ${data?.category || ""} — ₦${(data?.amount || 0).toLocaleString()}`
        : `Expense record updated`;
    case "SalesRecord":
      return type === "create" ? `New sale: ${data?.kg_sold || 0} kg sold` : `Sales record updated`;
    case "Treatment":
      return type === "create" ? `Treatment applied: ${data?.treatment_type || ""}` : `Treatment updated`;
    case "CropCycle":
      return type === "create" ? `New crop cycle started` : `Crop cycle updated`;
    case "PlantPopulationLog":
      return type === "create" ? `Population log: ${data?.active_plants || 0} active plants` : `Population log updated`;
    case "InventoryItem":
      if (data?.quantity_in_stock != null && data?.reorder_level != null && data.quantity_in_stock <= data.reorder_level) {
        return `LOW STOCK: ${data.name} — ${data.quantity_in_stock} ${data.unit || "units"} (reorder at ${data.reorder_level})`;
      }
      return type === "create" ? `Inventory item added: ${data?.name || ""}` : `Inventory updated: ${data?.name || ""}`;
    case "CalendarEvent":
      return type === "create"
        ? `New calendar event: ${data?.title || "Untitled event"}`
        : `Calendar event updated: ${data?.title || "Untitled event"}`;
    default:
      return `${entityName} ${type}d`;
  }
}

const CATEGORY_MAP = {
  HarvestRecord: "harvest",
  Incident: "incident",
  ExpenseRecord: "expense",
  SalesRecord: "sales",
  Treatment: "treatment",
  CropCycle: "cycle",
  PlantPopulationLog: "population",
  InventoryItem: "inventory",
  CalendarEvent: "calendar",
};

const PAGE_LINK_MAP = {
  HarvestRecord: "Harvests",
  Incident: "Incidents",
  ExpenseRecord: "Expenses",
  SalesRecord: "Sales",
  Treatment: "Treatments",
  CropCycle: "CropCycles",
  PlantPopulationLog: "CropCycles",
  InventoryItem: "Inventory",
  CalendarEvent: "FarmCalendar",
};

function parseCalendarEventDate(rawDate) {
  const text = String(rawDate || "").trim();
  if (!text) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const [year, month, day] = text.split("-").map(Number);
    return new Date(year, month - 1, day, 9, 0, 0, 0);
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatTimeUntil(eventDate) {
  const diffMs = eventDate.getTime() - Date.now();
  const totalHours = Math.max(0, Math.round(diffMs / (1000 * 60 * 60)));

  if (totalHours <= 1) return "in about 1 hour";
  if (totalHours < 24) return `in about ${totalHours} hours`;

  const totalDays = Math.round(totalHours / 24);
  if (totalDays <= 1) return "tomorrow";
  return `in about ${totalDays} days`;
}

async function scanUpcomingCalendarEvents() {
  if (upcomingScanInFlight) return;
  upcomingScanInFlight = true;

  try {
    const events = await base44.entities.CalendarEvent.list("date", 500);
    const now = Date.now();
    const horizon = now + UPCOMING_EVENT_LOOKAHEAD_HOURS * 60 * 60 * 1000;

    events.forEach((event) => {
      const eventDate = parseCalendarEventDate(event?.date);
      if (!eventDate) return;

      const startsAt = eventDate.getTime();
      if (startsAt < now || startsAt > horizon) return;

      const notificationId = `calendar-upcoming-${event.id}-${event.date}`;
      const title = String(event?.title || "Untitled event").trim();
      const typeLabel = String(event?.event_type || "").trim();
      const typePart = typeLabel ? ` (${typeLabel})` : "";
      const message = `Upcoming event ${formatTimeUntil(eventDate)}: ${title}${typePart}`;

      addNotification({
        id: notificationId,
        entityName: "CalendarEvent",
        entityId: event.id,
        type: "upcoming",
        priority: startsAt - now <= 12 * 60 * 60 * 1000 ? "high" : "medium",
        category: "calendar",
        message,
        timestamp: new Date().toISOString(),
        read: false,
        data: event,
        page: "FarmCalendar",
      });
    });
  } catch (error) {
    console.error("Failed to scan upcoming calendar events for notifications", error);
  } finally {
    upcomingScanInFlight = false;
  }
}

export function initNotificationStore() {
  if (initialized) return;
  initialized = true;

  loadFromStorage();
  notify();

  const entities = [
    "HarvestRecord", "Incident", "ExpenseRecord", "SalesRecord",
    "Treatment", "CropCycle", "PlantPopulationLog", "InventoryItem", "CalendarEvent"
  ];

  entities.forEach(entityName => {
    const entity = base44.entities[entityName];
    if (!entity?.subscribe) return;

    const unsub = entity.subscribe((event) => {
      if (event.type === "delete") return;
      const priority = getPriorityForEvent(entityName, event.data);
      addNotification({
        id: `${entityName}-${event.id}-${event.type}-${Date.now()}`,
        entityName,
        entityId: event.id,
        type: event.type,
        priority,
        category: CATEGORY_MAP[entityName] || "info",
        message: buildMessage(entityName, event.type, event.data),
        timestamp: new Date().toISOString(),
        read: false,
        data: event.data,
        page: PAGE_LINK_MAP[entityName] || null,
      });
    });

    subscriptions.push(unsub);
  });

  scanUpcomingCalendarEvents();
  if (!upcomingScanTimer) {
    upcomingScanTimer = setInterval(scanUpcomingCalendarEvents, UPCOMING_EVENT_SCAN_INTERVAL_MS);
  }
}
