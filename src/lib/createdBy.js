const humanizeEmailLocalPart = (value) =>
  String(value || "")
    .split("@")[0]
    .replace(/[._-]+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

export const getCreatedByLabel = (record) => {
  const value = String(record?.created_by_name || record?.created_by || "").trim();
  if (value.includes("@")) {
    const fallbackName = humanizeEmailLocalPart(value);
    return fallbackName || "Unknown";
  }
  return value || "Unknown";
};

export const getCreatedByText = (record, prefix = "By") => {
  const label = getCreatedByLabel(record);
  return label === "Unknown" ? `${prefix} unknown user` : `${prefix} ${label}`;
};
