import {
  Activity,
  BarChart3,
  ClipboardList,
  DollarSign,
  Egg,
  HeartPulse,
  LayoutDashboard,
  ShoppingCart,
  Users,
  Warehouse,
} from "lucide-react";

export const poultryNavItems = [
  { label: "Dashboard", path: "/poultry", icon: LayoutDashboard },
  { label: "Poultry Houses", path: "/poultry/houses", icon: Warehouse },
  { label: "Flocks", path: "/poultry/flocks", icon: Egg },
  { label: "Daily Logs", path: "/poultry/daily-logs", icon: ClipboardList },
  { label: "Feed Records", path: "/poultry/feed-records", icon: Activity },
  { label: "Health Records", path: "/poultry/health-records", icon: HeartPulse },
  { label: "Workers", path: "/poultry/workers", icon: Users },
  { label: "Sales", path: "/poultry/sales", icon: ShoppingCart },
  { label: "Expenses", path: "/poultry/expenses", icon: DollarSign },
  { label: "Analytics", path: "/poultry/analytics", icon: BarChart3, ownerOnly: true },
];
