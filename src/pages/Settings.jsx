import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleDashed,
  ClipboardList,
  DollarSign,
  FlaskConical,
  Gauge,
  HardHat,
  Layers,
  Leaf,
  ListTree,
  Package,
  PanelTop,
  ShieldCheck,
  RefreshCw,
  Search,
  Settings as SettingsIcon,
  Shield,
  ShoppingCart,
  Sprout,
  Users,
  Wrench,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import ErrorBanner from "@/components/shared/ErrorBanner.jsx";
import Modal from "@/components/shared/Modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/AuthContext";
import { isAdminUser } from "@/lib/roles.js";
import { getErrorMessage } from "@/lib/errors.js";
import { buildLaunchChecklistItems } from "@/lib/launchChecklist.js";
import { getAllPageHelp, getPageHelp } from "@/lib/pageHelp.js";
import { getDashboardCacheKey, normalizeDashboardData, readDashboardCache, writeDashboardCache } from "@/lib/dashboardSnapshot.js";
import { createPageUrl } from "@/utils";

const loadDashboardDataFallback = async (isAdmin) => {
  const [greenhouses, cycles, harvests, sales, expenses, popLogs, incidents, inventoryItems, workerRows, calendarEvents] = await Promise.all([
    base44.entities.Greenhouse.list("code"),
    base44.entities.CropCycle.list(),
    base44.entities.HarvestRecord.list("-date", 500),
    isAdmin ? base44.entities.SalesRecord.list("-date", 500) : Promise.resolve([]),
    isAdmin ? base44.entities.ExpenseRecord.list("-date", 500) : Promise.resolve([]),
    base44.entities.PlantPopulationLog.list("-date", 500),
    base44.entities.Incident.list("-date", 100),
    base44.entities.InventoryItem.list("-updated_date", 200),
    base44.entities.Worker.list(),
    base44.entities.CalendarEvent.list("date", 120),
  ]);

  return {
    greenhouses,
    cycles,
    harvests,
    sales,
    expenses,
    popLogs,
    incidents,
    inventoryItems,
    workerCount: workerRows.length,
    calendarEvents,
  };
};

const helpSections = [
  { label: "Overview", icon: Gauge, tone: "text-sky-300", pages: ["Dashboard"] },
  { label: "Operations", icon: Sprout, tone: "text-primary", pages: ["Greenhouses", "GreenhouseDailyLogs", "CropCycles", "Harvests", "Inventory"] },
  { label: "Nursery", icon: Leaf, tone: "text-lime-300", pages: ["NurseryBatches", "NurseryDailyLogs"] },
  { label: "Plant Health", icon: FlaskConical, tone: "text-amber-300", pages: ["Incidents", "Treatments"] },
  { label: "Finance", icon: DollarSign, tone: "text-cyan-300", pages: ["Sales", "Expenses"] },
  { label: "Team", icon: Users, tone: "text-violet-300", pages: ["Workers", "WorkerAttendance", "WorkerGrievances"] },
  { label: "Planning", icon: CalendarDays, tone: "text-rose-300", pages: ["FarmCalendar", "Compare"] },
  { label: "Administration", icon: ShieldCheck, tone: "text-emerald-300", pages: ["UserManagement", "ActivityLog", "Settings"] },
];

const pageIconMap = {
  Dashboard: Gauge,
  Greenhouses: Sprout,
  GreenhouseDailyLogs: ClipboardList,
  CropCycles: Leaf,
  Harvests: ShoppingCart,
  Inventory: Package,
  NurseryBatches: Sprout,
  NurseryDailyLogs: ClipboardList,
  Incidents: Shield,
  Treatments: FlaskConical,
  Sales: DollarSign,
  Expenses: DollarSign,
  Workers: HardHat,
  WorkerAttendance: CalendarDays,
  WorkerGrievances: Shield,
  FarmCalendar: CalendarDays,
  Compare: Activity,
  UserManagement: Users,
  ActivityLog: Activity,
  Settings: SettingsIcon,
};

function MetricTile({ label, value, caption, icon: Icon, tone = "primary" }) {
  const toneClass = {
    primary: { glow: "from-primary/20", icon: "text-primary" },
    amber: { glow: "from-amber-400/20", icon: "text-amber-300" },
    cyan: { glow: "from-cyan-400/20", icon: "text-cyan-300" },
  }[tone] || { glow: "from-primary/20", icon: "text-primary" };

  return (
    <div className="console-surface group relative overflow-hidden rounded-2xl border px-4 py-4">
      <div className={`absolute inset-x-0 top-0 h-16 bg-gradient-to-b ${toneClass.glow} to-transparent opacity-70`} />
      <div className="flex items-center justify-between gap-3">
        <div className="relative text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
        <span className={`relative flex h-8 w-8 items-center justify-center rounded-xl bg-card/70 ${toneClass.icon} ring-1 ring-border/70`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="relative mt-3 text-3xl font-black leading-none text-foreground">{value}</div>
      <div className="relative mt-2 text-xs leading-5 text-muted-foreground">{caption}</div>
    </div>
  );
}

function SectionHeader({ icon: Icon, title, subtitle }) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl bg-primary/12 text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <h3 className="text-base font-bold text-foreground">{title}</h3>
        {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
    </div>
  );
}

function IconFrame({ icon: Icon, className = "" }) {
  return (
    <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/12 text-primary shadow-[inset_0_1px_0_hsl(140_30%_90%/0.08)] ${className}`}>
      <Icon className="h-5 w-5" />
    </span>
  );
}

function CollapsiblePanel({ icon: Icon, title, subtitle, meta, open, onToggle, children }) {
  return (
    <section className="console-glass overflow-hidden rounded-2xl border">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="group flex w-full flex-col gap-3 border-b border-border/60 bg-gradient-to-r from-primary/12 via-emerald-400/5 to-cyan-400/10 px-4 py-4 text-left transition-colors hover:from-primary/16 hover:via-emerald-400/8 hover:to-cyan-400/14 sm:px-5 md:flex-row md:items-center md:justify-between"
      >
        <div className="flex min-w-0 items-center gap-3">
          <IconFrame icon={Icon} />
          <div className="min-w-0">
            <div className="text-base font-bold text-foreground">{title}</div>
            {subtitle ? <div className="mt-1 text-sm leading-5 text-muted-foreground">{subtitle}</div> : null}
          </div>
        </div>
        <div className="flex flex-shrink-0 items-center gap-3">
          {meta ? (
            <div className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-primary">
              {meta}
            </div>
          ) : null}
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/70 bg-card/55 text-primary transition-colors group-hover:border-primary/35 group-hover:bg-primary/10">
            <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
          </span>
        </div>
      </button>
      {open ? <div className="p-4 sm:p-5">{children}</div> : null}
    </section>
  );
}

export default function Settings() {
  const { user } = useAuth();
  const isAdmin = isAdminUser(user);
  const cacheKey = getDashboardCacheKey(isAdmin);
  const [snapshot, setSnapshot] = useState(() => normalizeDashboardData(readDashboardCache(cacheKey) || {}));
  const [loading, setLoading] = useState(!readDashboardCache(cacheKey));
  const [loadError, setLoadError] = useState("");
  const [helpPageName, setHelpPageName] = useState("");
  const [helpQuery, setHelpQuery] = useState("");
  const [openSections, setOpenSections] = useState({
    readiness: true,
    tools: true,
    help: true,
  });
  const [openHelpSections, setOpenHelpSections] = useState(() =>
    helpSections.reduce((acc, section) => ({ ...acc, [section.label]: true }), {})
  );
  const pageHelp = getAllPageHelp();
  const selectedHelp = helpPageName ? getPageHelp(helpPageName) : null;

  const load = async () => {
    setLoading(true);
    try {
      let data;
      try {
        data = await base44.dashboard.greenhouse();
      } catch (err) {
        if (err?.status !== 404) throw err;
        data = await loadDashboardDataFallback(isAdmin);
      }
      const normalized = normalizeDashboardData(data);
      setSnapshot(normalized);
      writeDashboardCache(cacheKey, normalized);
      setLoadError("");
    } catch (err) {
      setLoadError(getErrorMessage(err, "Failed to load settings data."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [cacheKey]);

  const checklistItems = buildLaunchChecklistItems(snapshot, isAdmin);
  const completedItems = checklistItems.filter((item) => item.done);
  const pendingItems = checklistItems.filter((item) => !item.done);
  const completedCount = completedItems.length;
  const totalCount = checklistItems.length;
  const readyPercent = Math.round((completedCount / Math.max(totalCount, 1)) * 100);

  const configurationTools = [
    {
      key: "crops",
      title: "Crops & Varieties",
      description: "Crop catalog used by cycles, harvests, and grade sales.",
      icon: ListTree,
      href: `${createPageUrl("CropCycles")}?settings=crops`,
      helpPage: "CropCycles",
      group: "Operations",
    },
    {
      key: "blocks",
      title: "Greenhouse Blocks",
      description: "Structural block groups for greenhouse organization.",
      icon: Layers,
      href: `${createPageUrl("Greenhouses")}?settings=blocks`,
      helpPage: "Greenhouses",
      group: "Operations",
    },
    {
      key: "roles",
      title: "Worker Roles",
      description: "Reusable worker role catalog for team profiles.",
      icon: Users,
      href: `${createPageUrl("Workers")}?settings=roles`,
      helpPage: "Workers",
      group: "Team",
      adminOnly: true,
    },
    {
      key: "users",
      title: "Users & Access",
      description: "User accounts, roles, and admin access.",
      icon: Shield,
      href: createPageUrl("UserManagement"),
      helpPage: "UserManagement",
      group: "Admin",
      adminOnly: true,
    },
    {
      key: "activity",
      title: "Activity Log",
      description: "Audit trail for creates, updates, deletes, and logins.",
      icon: Activity,
      href: createPageUrl("ActivityLog"),
      helpPage: "ActivityLog",
      group: "Admin",
      adminOnly: true,
    },
  ].filter((tool) => !tool.adminOnly || isAdmin);

  const filteredHelpSections = useMemo(() => {
    const query = helpQuery.trim().toLowerCase();
    return helpSections
      .map((section) => ({
        ...section,
        pages: section.pages.filter((pageName) => {
          const help = pageHelp[pageName];
          if (!help) return false;
          if (!query) return true;
          return `${help.title} ${help.purpose} ${section.label}`.toLowerCase().includes(query);
        }),
      }))
      .filter((section) => section.pages.length > 0);
  }, [helpQuery, pageHelp]);

  const toggleSection = (key) => {
    setOpenSections((current) => ({ ...current, [key]: !current[key] }));
  };

  const toggleHelpSection = (label) => {
    setOpenHelpSections((current) => ({ ...current, [label]: !current[label] }));
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader
        title="Workspace Settings"
        subtitle="Setup readiness, configuration tools, and in-app help links."
        actions={
          <Button size="sm" variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className="h-4 w-4" />
            {loading ? "Refreshing" : "Refresh"}
          </Button>
        }
      />

      <ErrorBanner message={loadError} onRetry={load} />

      <CollapsiblePanel
        icon={SettingsIcon}
        title="Launch Readiness"
        subtitle="Setup progress, blockers, and configuration shortcuts."
        meta={`${completedCount} / ${totalCount} complete`}
        open={openSections.readiness}
        onToggle={() => toggleSection("readiness")}
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div>
            <SectionHeader
              icon={SettingsIcon}
              title="Setup Status"
              subtitle="A concise view of launch readiness. Completed setup remains here for audit and onboarding."
            />
            <div className="mb-4 rounded-2xl border border-primary/20 bg-card/35 p-3">
              <div className="mb-2 flex items-center justify-between text-xs font-semibold">
                <span className="uppercase tracking-[0.14em] text-muted-foreground">Progress</span>
                <span className="text-primary">{readyPercent}% ready</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-muted ring-1 ring-border/70">
                <div className="h-full rounded-full bg-gradient-to-r from-primary via-emerald-300 to-cyan-300 shadow-[0_0_18px_hsl(var(--primary)/0.45)] transition-all" style={{ width: `${readyPercent}%` }} />
              </div>
            </div>
            {pendingItems.length > 0 ? (
              <div className="grid gap-2 md:grid-cols-2">
                {pendingItems.map((item) => (
                  <Link
                    key={item.key}
                    to={item.href}
                    className="group flex items-center justify-between gap-3 rounded-xl border border-border/80 bg-muted/20 px-3 py-3 transition-colors hover:border-primary/40 hover:bg-muted/35"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <CircleDashed className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-foreground">{item.label}</div>
                        <div className="text-xs leading-5 text-muted-foreground">{item.description}</div>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 flex-shrink-0 text-primary opacity-80 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-success/35 bg-gradient-to-br from-success/14 via-success/8 to-cyan-400/8 px-4 py-4 shadow-[inset_0_1px_0_hsl(140_30%_90%/0.06)]">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/15 text-success ring-1 ring-success/30">
                    <CheckCircle2 className="h-5 w-5" />
                  </span>
                  <div>
                    <div className="text-sm font-bold text-foreground">Launch setup is complete</div>
                    <div className="text-xs text-muted-foreground">All core setup items have been completed.</div>
                  </div>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {completedItems.map((item) => (
                    <Link key={item.key} to={item.href} className="group flex items-center gap-2 rounded-xl border border-border/70 bg-card/45 px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/35 hover:bg-muted/45 hover:text-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 text-success" />
                      <span className="min-w-0 truncate">{item.label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <MetricTile icon={CheckCircle2} label="Ready" value={`${readyPercent}%`} caption={`${completedCount} of ${totalCount} setup items complete`} />
            <MetricTile icon={CircleDashed} label="Remaining" value={pendingItems.length} caption={pendingItems.length ? "Items still blocking launch readiness" : "No pending setup tasks"} tone="amber" />
            <MetricTile icon={Wrench} label="Tools" value={configurationTools.length} caption="Configuration areas available to your role" tone="cyan" />
          </div>
        </div>
      </CollapsiblePanel>

      <CollapsiblePanel
        icon={Wrench}
        title="Configuration Tools"
        subtitle="Operational setup and admin controls that should live in Settings."
        meta={`${configurationTools.length} tools`}
        open={openSections.tools}
        onToggle={() => toggleSection("tools")}
      >
        <div className="grid gap-3 lg:grid-cols-2">
          {configurationTools.map((tool) => {
            const Icon = tool.icon;
            return (
              <div key={tool.key} className="group relative overflow-hidden rounded-2xl border border-border/80 bg-card/28 p-4 transition-colors hover:border-primary/45 hover:bg-muted/25">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/55 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <IconFrame icon={Icon} />
                    <div>
                      <div className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-primary/85">{tool.group}</div>
                      <div className="mt-1 text-sm font-bold text-foreground">{tool.title}</div>
                    </div>
                  </div>
                  <ArrowRight className="hidden h-4 w-4 text-primary/70 transition-transform group-hover:translate-x-0.5 sm:block" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm leading-6 text-muted-foreground">{tool.description}</div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button asChild size="sm" variant="outline" className="h-8 px-3 text-xs">
                    <Link to={tool.href}>
                      <Wrench className="h-3.5 w-3.5" />
                      Open tool
                    </Link>
                  </Button>
                  <Button type="button" size="sm" variant="ghost" className="h-8 px-3 text-xs" onClick={() => setHelpPageName(tool.helpPage)}>
                    <BookOpen className="h-3.5 w-3.5" />
                    Open help
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CollapsiblePanel>

      <CollapsiblePanel
        icon={BookOpen}
        title="Page Help Directory"
        subtitle="Direct links and help actions grouped by app area."
        meta={`${filteredHelpSections.reduce((sum, section) => sum + section.pages.length, 0)} pages`}
        open={openSections.help}
        onToggle={() => toggleSection("help")}
      >
        <div className="mb-4 flex justify-end">
          <div className="relative w-full lg:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={helpQuery}
              onChange={(event) => setHelpQuery(event.target.value)}
              placeholder="Search help..."
              className="pl-9"
            />
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          {filteredHelpSections.map((section) => {
            const SectionIcon = section.icon;
            const sectionOpen = helpQuery.trim() ? true : openHelpSections[section.label] !== false;
            return (
              <div key={section.label} className="overflow-hidden rounded-2xl border border-border/80 bg-card/25">
                <button
                  type="button"
                  onClick={() => toggleHelpSection(section.label)}
                  aria-expanded={sectionOpen}
                  className="group flex w-full items-center justify-between gap-3 border-b border-border/60 bg-muted/20 px-4 py-3 text-left transition-colors hover:bg-muted/32"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className={`flex h-8 w-8 items-center justify-center rounded-lg bg-card/70 ring-1 ring-border/60 ${section.tone}`}>
                      <SectionIcon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">{section.label}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{section.pages.length} {section.pages.length === 1 ? "page" : "pages"}</div>
                    </div>
                  </div>
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 bg-card/55 text-primary">
                    <ChevronDown className={`h-4 w-4 transition-transform ${sectionOpen ? "rotate-180" : ""}`} />
                  </span>
                </button>
                {sectionOpen ? (
                  <div className="divide-y divide-border/55">
                    {section.pages.map((pageName) => {
                      const help = pageHelp[pageName];
                      const PageIcon = pageIconMap[pageName] || PanelTop;
                      return (
                        <div key={pageName} className="grid gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                          <div className="flex min-w-0 gap-3">
                            <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
                              <PageIcon className="h-4 w-4" />
                            </span>
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-foreground">{help.title}</div>
                              <div className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{help.purpose}</div>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2 sm:justify-end">
                            <Button asChild size="sm" variant="ghost" className="h-8 px-2.5 text-xs">
                              <Link to={createPageUrl(pageName)}>
                                <ArrowRight className="h-3.5 w-3.5" />
                                Open page
                              </Link>
                            </Button>
                            <Button type="button" size="sm" variant="ghost" className="h-8 px-2.5 text-xs" onClick={() => setHelpPageName(pageName)}>
                              <BookOpen className="h-3.5 w-3.5" />
                              Open help
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </CollapsiblePanel>

      <Modal open={!!selectedHelp} onClose={() => setHelpPageName("")} title={`${selectedHelp?.title || "Page"} Help`} size="lg">
        {selectedHelp ? (
          <div className="space-y-5">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">What this page is for</div>
              <p className="mt-2 text-sm leading-6 text-foreground">{selectedHelp.purpose}</p>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">How to use it</div>
              <div className="mt-2 space-y-2">
                {selectedHelp.steps.map((step, index) => (
                  <div key={step} className="flex gap-3 rounded-xl border border-border bg-muted/20 px-3 py-3">
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {index + 1}
                    </span>
                    <p className="text-sm leading-6 text-foreground">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
