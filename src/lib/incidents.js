const INCIDENT_TYPE_LABELS = {
  pest: "Pest",
  disease: "Disease",
  environmental: "Environmental",
  structural: "Structural damage",
  other: "Other",
};

const ACTIVE_INCIDENT_STATUSES = new Set(["open", "treated", "in_progress", "monitoring"]);
const IN_PROGRESS_INCIDENT_STATUSES = new Set(["treated", "in_progress"]);

function humanizeIncidentType(type) {
  return String(type || "")
    .trim()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function getIncidentTypeLabel(type) {
  const normalizedType = String(type || "").trim().toLowerCase();
  if (!normalizedType) return "Incident";
  return INCIDENT_TYPE_LABELS[normalizedType] || humanizeIncidentType(normalizedType);
}

export function getIncidentTitle(incident) {
  const explicitName = String(incident?.name || "").trim();
  if (explicitName) return explicitName;

  switch (String(incident?.incident_type || "").trim().toLowerCase()) {
    case "pest":
      return "Pest issue";
    case "disease":
      return "Disease issue";
    case "environmental":
      return "Environmental issue";
    case "structural":
      return "Structural damage";
    default:
      return "Incident";
  }
}

export function formatIncidentAffectedPlants(incident) {
  const affectedScope = String(incident?.affected_scope || "").trim().toLowerCase();
  if (affectedScope === "all") return "All plants";
  if (affectedScope === "none") return "Not plant-related";

  const affectedCount = Number(incident?.affected_plants);
  if (Number.isFinite(affectedCount) && affectedCount > 0) {
    return `${affectedCount.toLocaleString()} plant${affectedCount === 1 ? "" : "s"}`;
  }

  return "";
}

export function isIncidentActive(status) {
  return ACTIVE_INCIDENT_STATUSES.has(String(status || "").trim().toLowerCase());
}

export function isIncidentInProgress(status) {
  return IN_PROGRESS_INCIDENT_STATUSES.has(String(status || "").trim().toLowerCase());
}
