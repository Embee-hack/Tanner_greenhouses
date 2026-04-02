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
  Thermometer,
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { base44 } from "@/api/base44Client";
import { initNotificationStore } from "@/components/shared/NotificationStore.jsx";
import { useAuth } from "@/lib/AuthContext";
import { isAdminUser } from "@/lib/roles.js";
import HeaderControls from "@/components/navigation/HeaderControls.jsx";
import { setStoredModuleKey } from "@/lib/modules";

const dashboardItem = { label: "Dashboard", icon: LayoutDashboard, page: "Dashboard" };

const groupedNav = [
  {
    key: "operations",
    label: "Operations",
    icon: Sprout,
    defaultOpen: false,
    items: [
      { label: "Greenhouses", icon: Sprout, page: "Greenhouses" },
      { label: "Crop Cycles", icon: Leaf, page: "CropCycles" },
      { label: "Harvests", icon: BarChart3, page: "Harvests" },
      { label: "Inventory", icon: Package, page: "Inventory" },
    ],
  },
  {
    key: "plant_health",
    label: "Plant Health",
    icon: Bug,
    defaultOpen: false,
    items: [
      { label: "Pest & Disease", icon: Bug, page: "Incidents" },
      { label: "Treatments", icon: FlaskConical, page: "Treatments" },
      { label: "Environment", icon: Thermometer, page: "Environmental" },
    ],
  },
  {
    key: "finance",
    label: "Finance",
    icon: DollarSign,
    defaultOpen: false,
    items: [
      { label: "Sales", icon: ShoppingCart, page: "Sales" },
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

const pageLabelMap = groupedNav
  .flatMap((section) => section.items)
  .reduce((acc, item) => ({ ...acc, [item.page]: item.label }), {
    [dashboardItem.page]: dashboardItem.label,
  });

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

  const pageTitle = pageLabelMap[currentPageName] || currentPageName;

  const toggleSection = (sectionKey) => {
    setOpenSections((prev) => ({ ...prev, [sectionKey]: !prev[sectionKey] }));
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col w-64 bg-card border-r border-border transition-transform duration-300 ease-in-out lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center gap-3 px-6 py-5 border-b border-border">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
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
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 group",
              currentPageName === dashboardItem.page
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-foreground/70 hover:text-foreground hover:bg-muted"
            )}
          >
            <DashboardIcon className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">{dashboardItem.label}</span>
            {currentPageName === dashboardItem.page && <ChevronRight className="w-3 h-3 opacity-70" />}
          </Link>

          {visibleGroups.map((section) => {
            const isSectionActive = section.items.some((item) => item.page === currentPageName);
            const isOpen = openSections[section.key];

            return (
              <div key={section.key} className="rounded-lg border border-transparent">
                <button
                  onClick={() => toggleSection(section.key)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-150",
                    isSectionActive
                      ? "text-foreground bg-muted/80"
                      : "text-foreground/70 hover:text-foreground hover:bg-muted/60"
                  )}
                >
                  <section.icon className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1 text-left">{section.label}</span>
                  <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", isOpen ? "rotate-180" : "")} />
                </button>

                {isOpen && (
                  <div className="mt-1 space-y-0.5 ml-2 pl-3 border-l border-border/70">
                    {section.items.map((item) => {
                      const isActive = currentPageName === item.page;
                      return (
                        <Link
                          key={item.page}
                          to={createPageUrl(item.page)}
                          onClick={() => setSidebarOpen(false)}
                          className={cn(
                            "flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors",
                            isActive
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted"
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
        </nav>

        <div className="px-6 py-4 border-t border-border">
          <div className="text-xs text-muted-foreground">
            <div className="font-semibold text-foreground mb-0.5">GPD v1.0</div>
            <div>
              {footerStats.greenhouseCount} Greenhouse{footerStats.greenhouseCount === 1 ? "" : "s"} · {footerStats.cropSummary}
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="flex items-center gap-4 px-4 md:px-6 py-4 border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-20">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-muted-foreground hover:text-foreground">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-base font-semibold text-foreground">
              {pageTitle}
              {!isOwner && <span className="ml-2 text-xs font-normal text-muted-foreground">(Farm Manager)</span>}
            </h1>
          </div>
          <HeaderControls showNotifications={isOwner} />
        </header>

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

export default function Layout({ children, currentPageName }) {
  return <LayoutInner currentPageName={currentPageName}>{children}</LayoutInner>;
}
