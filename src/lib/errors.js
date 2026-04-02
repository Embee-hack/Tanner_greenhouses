export const getErrorMessage = (error, fallback = "Something went wrong.") => {
  if (error?.data?.error) return String(error.data.error);

  const message = String(error?.message || "").trim();
  if (!message) return fallback;

  const normalized = message.toLowerCase();
  if (normalized.includes("cannot reach api server")) return message;
  if (normalized.includes("failed to fetch")) {
    return "Cannot reach API server. Make sure the backend is running, then try again.";
  }

  return message;
};
