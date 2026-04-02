import {
  Activity,
  BarChart3,
  ClipboardList,
  DollarSign,
  Fence,
  HeartPulse,
  LayoutDashboard,
  PawPrint,
  Scale,
  ShoppingCart,
  Users,
} from "lucide-react";

export const goatNavItems = [
  { label: "Dashboard", path: "/goats", icon: LayoutDashboard },
  { label: "Pens", path: "/goats/pens", icon: Fence },
  { label: "Goat Registry", path: "/goats/registry", icon: PawPrint },
  { label: "Breeding", path: "/goats/breeding", icon: ClipboardList },
  { label: "Health Records", path: "/goats/health-records", icon: HeartPulse },
  { label: "Weight Logs", path: "/goats/weight-logs", icon: Scale },
  { label: "Feed Records", path: "/goats/feed-records", icon: Activity },
  { label: "Workers", path: "/goats/workers", icon: Users },
  { label: "Sales", path: "/goats/sales", icon: ShoppingCart },
  { label: "Expenses", path: "/goats/expenses", icon: DollarSign },
  { label: "Analytics", path: "/goats/analytics", icon: BarChart3, ownerOnly: true },
];
