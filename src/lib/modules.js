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
    accent: "bg-emerald-950/35",
    border: "border-emerald-300/40",
    iconClass: "text-emerald-500",
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
    accent: "bg-[hsl(31_28%_15%)]",
    border: "border-[hsl(32_95%_61%/0.58)]",
    iconClass: "text-[hsl(32_95%_61%)]",
    buttonClass: "bg-[hsl(32_95%_61%)] hover:bg-[hsl(26_92%_52%)] text-[hsl(28_48%_8%)]",
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
    accent: "bg-[hsl(34_22%_18%)]",
    border: "border-[hsl(35_54%_58%/0.62)]",
    iconClass: "text-[hsl(35_54%_58%)]",
    buttonClass: "bg-[hsl(32_43%_33%)] hover:bg-[hsl(32_48%_27%)] text-[hsl(34_25%_90%)]",
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
