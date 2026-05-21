import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  LayoutDashboard,
  Sprout,
  BarChart3,
  Activity,
  ShoppingCart,
  DollarSign,
  Bug,
  AlertTriangle,
  GitCompare,
  Menu,
  X,
  Leaf,
  ChevronRight,
  FlaskConical,
  Package,
  CalendarDays,
  ChevronDown,
  Users,
  HardHat,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { base44 } from "@/api/base44Client";
import { initNotificationStore } from "@/components/shared/NotificationStore.jsx";
import { useAuth } from "@/lib/AuthContext";
import { isAdminUser } from "@/lib/roles.js";
import HeaderControls from "@/components/navigation/HeaderControls.jsx";
import PageHelp from "@/components/shared/PageHelp.jsx";
import { setStoredModuleKey } from "@/lib/modules";

const dashboardItem = { label: "Dashboard", icon: LayoutDashboard, page: "Dashboard" };
const settingsItem = { label: "Settings", icon: Settings, page: "Settings" };

const groupedNav = [
  {
    key: "operations",
    label: "Operations",
    icon: Sprout,
    defaultOpen: false,
    items: [
      { label: "Greenhouses", icon: Sprout, page: "Greenhouses" },
      { label: "Daily Logs", icon: CalendarDays, page: "GreenhouseDailyLogs" },
      { label: "Crop Cycles", icon: Leaf, page: "CropCycles" },
      { label: "Harvest & Sales", icon: BarChart3, page: "Harvests" },
      { label: "Inventory", icon: Package, page: "Inventory" },
    ],
  },
  {
    key: "nursery",
    label: "Nursery",
    icon: Leaf,
    defaultOpen: false,
    items: [
      { label: "Nursery Batches", icon: Sprout, page: "NurseryBatches" },
      { label: "Daily Nursery Logs", icon: Activity, page: "NurseryDailyLogs" },
    ],
  },
  {
    key: "plant_health",
    label: "Plant Health",
    icon: Bug,
    defaultOpen: false,
    items: [
      { label: "Incident Log", icon: AlertTriangle, page: "Incidents" },
      { label: "Response Log", icon: FlaskConical, page: "Treatments" },
    ],
  },
  {
    key: "finance",
    label: "Finance",
    icon: DollarSign,
    defaultOpen: false,
    items: [
      { label: "Sales Reports", icon: ShoppingCart, page: "Sales" },
      { label: "Expenses", icon: DollarSign, page: "Expenses" },
    ],
  },
  {
    key: "team",
    label: "Team",
    icon: Users,
    defaultOpen: false,
    items: [
      { label: "Workers", icon: HardHat, page: "Workers" },
      { label: "Attendance Sheet", icon: CalendarDays, page: "WorkerAttendance" },
      { label: "Grievance Log", icon: AlertTriangle, page: "WorkerGrievances" },
    ],
  },
  {
    key: "planning",
    label: "Planning",
    icon: CalendarDays,
    defaultOpen: false,
    items: [
      { label: "Calendar", icon: CalendarDays, page: "FarmCalendar" },
      { label: "Compare", icon: GitCompare, page: "Compare", ownerOnly: true, hideUntilData: true },
    ],
  },
  {
    key: "admin",
    label: "Admin",
    icon: Activity,
    defaultOpen: false,
    items: [
      { label: "Users", icon: Users, page: "UserManagement", ownerOnly: true },
      { label: "Activity Log", icon: Activity, page: "ActivityLog", ownerOnly: true },
    ],
  },
];

const defaultFooterStats = {
  greenhouseCount: 0,
  cropSummary: "No crops",
};

const getCropSummary = (cycles) => {
  const cropTypes = [...new Set(
    (cycles || [])
      .map((cycle) => String(cycle?.crop_type || "").trim())
      .filter(Boolean)
  )];

  if (cropTypes.length === 0) return "No crops";
  if (cropTypes.length === 1) return cropTypes[0];
  if (cropTypes.length === 2) return `${cropTypes[0]} + ${cropTypes[1]}`;
  return `${cropTypes.length} crop types`;
};

function LayoutInner({ children, currentPageName }) {
  const DashboardIcon = dashboardItem.icon;
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [footerStats, setFooterStats] = useState(defaultFooterStats);
  const [openSections, setOpenSections] = useState(() =>
    groupedNav.reduce((acc, section) => ({ ...acc, [section.key]: section.defaultOpen }), {})
  );
  const isOwner = isAdminUser(user);

  useEffect(() => {
    setStoredModuleKey("greenhouse");
  }, []);

  useEffect(() => {
    initNotificationStore();
  }, []);

  useEffect(() => {
    if (!isOwner) {
      setShowCompare(false);
      return;
    }

    let cancelled = false;
    Promise.all([base44.entities.Greenhouse.list("code", 3), base44.entities.HarvestRecord.list("-date", 1)])
      .then(([greenhouses, harvests]) => {
        if (!cancelled) {
          setShowCompare(greenhouses.length >= 2 && harvests.length > 0);
        }
      })
      .catch(() => {
        if (!cancelled) setShowCompare(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOwner]);

  useEffect(() => {
    let cancelled = false;

    const loadFooterStats = async () => {
      try {
        const [greenhouses, cycles] = await Promise.all([
          base44.entities.Greenhouse.list(),
          base44.entities.CropCycle.list(),
        ]);
        if (cancelled) return;
        setFooterStats({
          greenhouseCount: greenhouses.length,
          cropSummary: getCropSummary(cycles),
        });
      } catch {
        if (!cancelled) setFooterStats(defaultFooterStats);
      }
    };

    loadFooterStats();
    const unsubscribeGreenhouses = base44.entities.Greenhouse.subscribe(loadFooterStats);
    const unsubscribeCropCycles = base44.entities.CropCycle.subscribe(loadFooterStats);

    return () => {
      cancelled = true;
      unsubscribeGreenhouses();
      unsubscribeCropCycles();
    };
  }, []);

  const shouldShowItem = (item) => {
    if (item.ownerOnly && !isOwner) return false;
    if (item.hideUntilData && !showCompare) return false;
    return true;
  };

  const visibleGroups = groupedNav
    .map((section) => ({ ...section, items: section.items.filter(shouldShowItem) }))
    .filter((section) => section.items.length > 0);

  const currentNavItem =
    currentPageName === dashboardItem.page
      ? { ...dashboardItem, sectionLabel: "Overview" }
      : currentPageName === settingsItem.page
        ? { ...settingsItem, sectionLabel: "Settings" }
      : visibleGroups
          .flatMap((section) => section.items.map((item) => ({ ...item, sectionLabel: section.label })))
          .find((item) => item.page === currentPageName);

  const toggleSection = (sectionKey) => {
    setOpenSections((prev) => ({ ...prev, [sectionKey]: !prev[sectionKey] }));
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/55 backdrop-blur-md lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col w-72 border-r border-border/70 bg-card/88 shadow-[18px_0_55px_hsl(150_45%_5%/0.3)] backdrop-blur-2xl transition-transform duration-300 ease-in-out lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex min-h-[5.75rem] items-center gap-3 px-6 py-5 border-b border-border/70">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center flex-shrink-0 shadow-[0_0_24px_hsl(var(--primary)/0.28)]">
            <Sprout className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <div className="font-bold text-sm text-foreground leading-tight">Greenhouse</div>
            <div className="text-xs text-muted-foreground">{isOwner ? "Owner View" : "Farm Manager"}</div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto lg:hidden text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5">
          <Link
            to={createPageUrl(dashboardItem.page)}
            onClick={() => setSidebarOpen(false)}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-semibold transition-all duration-150 group",
              currentPageName === dashboardItem.page
                ? "bg-primary/24 text-foreground ring-1 ring-primary/35 shadow-[inset_0_1px_0_hsl(140_30%_90%/0.08),0_10px_28px_hsl(var(--primary)/0.12)]"
                : "text-foreground/70 hover:text-foreground hover:bg-muted/70"
            )}
          >
            <DashboardIcon className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">{dashboardItem.label}</span>
            {currentPageName === dashboardItem.page && <ChevronRight className="w-3 h-3 text-primary" />}
          </Link>

          {visibleGroups.map((section) => {
            const isSectionActive = section.items.some((item) => item.page === currentPageName);
            const isOpen = openSections[section.key];

            return (
              <div key={section.key} className="rounded-2xl border border-transparent">
                <button
                  onClick={() => toggleSection(section.key)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-semibold transition-all duration-150",
                    isSectionActive
                      ? "text-foreground bg-muted/80 ring-1 ring-border/80"
                      : "text-foreground/70 hover:text-foreground hover:bg-muted/60"
                  )}
                >
                  <section.icon className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1 text-left">{section.label}</span>
                  <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", isOpen ? "rotate-180" : "")} />
                </button>

                {isOpen && (
                  <div className="mt-1 space-y-1 ml-2 pl-3 border-l border-border/60">
                    {section.items.map((item) => {
                      const isActive = currentPageName === item.page;
                      return (
                        <Link
                          key={item.page}
                          to={createPageUrl(item.page)}
                          onClick={() => setSidebarOpen(false)}
                          className={cn(
                            "flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm transition-colors",
                            isActive
                              ? "bg-primary/22 text-foreground ring-1 ring-primary/30"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
                          )}
                        >
                          <item.icon className="w-3.5 h-3.5 flex-shrink-0 opacity-80" />
                          <span className="truncate">{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          <Link
            to={createPageUrl(settingsItem.page)}
            onClick={() => setSidebarOpen(false)}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-semibold transition-all duration-150 group",
              currentPageName === settingsItem.page
                ? "bg-primary/24 text-foreground ring-1 ring-primary/35 shadow-[inset_0_1px_0_hsl(140_30%_90%/0.08),0_10px_28px_hsl(var(--primary)/0.12)]"
                : "text-foreground/70 hover:text-foreground hover:bg-muted/70"
            )}
          >
            <Settings className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">{settingsItem.label}</span>
            {currentPageName === settingsItem.page && <ChevronRight className="w-3 h-3 text-primary" />}
          </Link>
        </nav>

        <div className="px-5 py-4 border-t border-border/70">
          <div className="text-xs text-muted-foreground">
            <div className="font-semibold text-foreground mb-0.5">GPD v1.0</div>
            <div>
              {footerStats.greenhouseCount} Greenhouse{footerStats.greenhouseCount === 1 ? "" : "s"} · {footerStats.cropSummary}
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="flex min-h-[5.75rem] items-center gap-3 px-4 md:px-6 py-4 border-b border-border/70 bg-card/72 backdrop-blur-2xl sticky top-0 z-20 shadow-[0_12px_36px_hsl(150_45%_5%/0.18)]">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-muted-foreground hover:text-foreground p-1">
            <Menu className="w-5 h-5" />
          </button>
          <div className="hidden min-w-0 flex-1 flex-col justify-center md:flex">
            <div className="text-xl font-extrabold uppercase tracking-[0.18em] text-foreground">
              {currentNavItem?.sectionLabel || "Workspace"}
            </div>
          </div>
          <div className="flex-1 min-w-0 md:hidden" />
          <PageHelp pageName={currentPageName} open={helpOpen} onOpenChange={setHelpOpen} />
          <HeaderControls showNotifications={isOwner} />
        </header>

        <main className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_50%_0%,hsl(var(--primary)/0.08),transparent_28rem)]">{children}</main>
      </div>
    </div>
  );
}

export default function Layout({ children, currentPageName }) {
  return <LayoutInner currentPageName={currentPageName}>{children}</LayoutInner>;
}
