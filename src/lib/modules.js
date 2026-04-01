import { Beef, Egg, Sprout } from "lucide-react";

export const MODULE_STORAGE_KEY = "tgh_last_module";

export const moduleRegistry = {
  greenhouse: {
    key: "greenhouse",
    label: "Greenhouse Management",
    shortLabel: "Greenhouse",
    description: "Keep the approved greenhouse monitoring workflows exactly as they are.",
    path: "/greenhouse",
    openPath: "/Dashboard",
    icon: Sprout,
    accent: "from-emerald-500/15 via-white to-emerald-200/40",
    border: "border-emerald-200",
    iconClass: "text-emerald-700",
    buttonClass: "bg-primary hover:bg-primary/90 text-primary-foreground",
    themeClass: "",
  },
  poultry: {
    key: "poultry",
    label: "Poultry Management",
    shortLabel: "Poultry",
    description: "Track houses, flocks, production, health, feed, sales, and farm performance.",
    path: "/poultry",
    openPath: "/poultry",
    icon: Egg,
    accent: "from-orange-500/15 via-white to-amber-200/45",
    border: "border-orange-200",
    iconClass: "text-orange-600",
    buttonClass: "bg-orange-500 hover:bg-orange-600 text-white",
    themeClass: "module-theme-poultry",
  },
  goats: {
    key: "goats",
    label: "Goat Farm Management",
    shortLabel: "Goat Farm",
    description: "Manage pens, goat registry, breeding, health, weights, feed, and finances.",
    path: "/goats",
    openPath: "/goats",
    icon: Beef,
    accent: "from-amber-900/12 via-white to-stone-200/50",
    border: "border-amber-300",
    iconClass: "text-amber-900",
    buttonClass: "bg-amber-900 hover:bg-amber-950 text-white",
    themeClass: "module-theme-goats",
  },
};

export const moduleList = Object.values(moduleRegistry);

export const isModuleKey = (value) => Object.prototype.hasOwnProperty.call(moduleRegistry, value);

export const getStoredModuleKey = () => {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(MODULE_STORAGE_KEY);
  return isModuleKey(value) ? value : null;
};

export const setStoredModuleKey = (value) => {
  if (typeof window === "undefined" || !isModuleKey(value)) return;
  window.localStorage.setItem(MODULE_STORAGE_KEY, value);
};

export const getModuleOpenPath = (value) => {
  const moduleItem = moduleRegistry[value];
  return moduleItem?.openPath || "/modules";
};
