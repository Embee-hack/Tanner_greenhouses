import { createPageUrl } from "@/utils";

export const buildLaunchChecklistItems = ({
  greenhouses = [],
  cycles = [],
  harvests = [],
  sales = [],
  expenses = [],
  inventoryItems = [],
  workerCount = 0,
  calendarEvents = [],
}, isAdmin = false) => {
  const activeCycles = cycles.filter((cycle) => cycle.status === "active").length;
  const items = [
    {
      key: "greenhouses",
      label: "Register at least one greenhouse",
      description: "Create the physical greenhouse records the rest of the app connects to.",
      done: greenhouses.length > 0,
      href: createPageUrl("Greenhouses"),
      action: greenhouses.length > 0 ? "Review setup" : "Add greenhouse",
    },
    {
      key: "cycles",
      label: "Start an active crop cycle",
      description: "Link a crop and variety to a greenhouse so logs and harvests have context.",
      done: activeCycles > 0,
      href: createPageUrl("CropCycles"),
      action: activeCycles > 0 ? "Manage cycles" : "Start cycle",
    },
    {
      key: "inventory",
      label: "Stock your inventory",
      description: "Add supplies, current stock, reorder levels, suppliers, and purchase dates.",
      done: inventoryItems.length > 0,
      href: createPageUrl("Inventory"),
      action: inventoryItems.length > 0 ? "Review stock" : "Add stock",
    },
    {
      key: "workers",
      label: "Add and assign workers",
      description: "Create the team list used for attendance, responsibilities, and worker issues.",
      done: workerCount > 0,
      href: createPageUrl("Workers"),
      action: workerCount > 0 ? "Manage team" : "Add workers",
    },
    {
      key: "calendar",
      label: "Schedule upcoming work",
      description: "Put planned farm tasks and follow-ups on the shared calendar.",
      done: calendarEvents.length > 0,
      href: createPageUrl("FarmCalendar"),
      action: calendarEvents.length > 0 ? "Open calendar" : "Add event",
    },
    {
      key: "harvests",
      label: "Log the first harvest",
      description: "Record harvested kg, grade sales, prices, revenue, and unsold quantity.",
      done: harvests.length > 0,
      href: createPageUrl("Harvests"),
      action: harvests.length > 0 ? "Review harvests" : "Log harvest",
    },
  ];

  if (isAdmin) {
    items.push(
      {
        key: "sales",
        label: "Record the first sale",
        description: "Confirm sales data is flowing into revenue reports.",
        done: sales.length > 0,
        href: createPageUrl("Sales"),
        action: sales.length > 0 ? "Open sales" : "Record sale",
      },
      {
        key: "expenses",
        label: "Record the first expense",
        description: "Add farm costs so profit and comparison reports are meaningful.",
        done: expenses.length > 0,
        href: createPageUrl("Expenses"),
        action: expenses.length > 0 ? "Open expenses" : "Record expense",
      }
    );
  }

  return items;
};
