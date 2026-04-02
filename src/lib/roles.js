export const ROLE_ADMIN = "admin";
export const ROLE_FARM_MANAGER = "farm_manager";

export const normalizeUserRole = (rawRole) =>
  String(rawRole || "").toLowerCase() === ROLE_ADMIN ? ROLE_ADMIN : ROLE_FARM_MANAGER;

export const isAdminRole = (role) => normalizeUserRole(role) === ROLE_ADMIN;

export const isAdminUser = (user) => isAdminRole(user?.role);
