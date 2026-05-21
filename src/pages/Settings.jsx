import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  CircleDashed,
  Layers,
  ListTree,
  RefreshCw,
  Search,
  Settings as SettingsIcon,
  Shield,
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
  { label: "Overview", pages: ["Dashboard"] },
  { label: "Operations", pages: ["Greenhouses", "GreenhouseDailyLogs", "CropCycles", "Harvests", "Inventory"] },
  { label: "Nursery", pages: ["NurseryBatches", "NurseryDailyLogs"] },
  { label: "Plant Health", pages: ["Incidents", "Treatments"] },
  { label: "Finance", pages: ["Sales", "Expenses"] },
  { label: "Team", pages: ["Workers", "WorkerAttendance", "WorkerGrievances"] },
  { label: "Planning", pages: ["FarmCalendar", "Compare"] },
  { label: "Administration", pages: ["UserManagement", "ActivityLog", "Settings"] },
];

function MetricTile({ label, value, caption, icon: Icon }) {
  return (
    <div className="console-surface rounded-2xl border px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="mt-3 text-3xl font-black leading-none text-foreground">{value}</div>
      <div className="mt-2 text-xs text-muted-foreground">{caption}</div>
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

export default function Settings() {
  const { user } = useAuth();
  const isAdmin = isAdminUser(user);
  const cacheKey = getDashboardCacheKey(isAdmin);
  const [snapshot, setSnapshot] = useState(() => normalizeDashboardData(readDashboardCache(cacheKey) || {}));
  const [loading, setLoading] = useState(!readDashboardCache(cacheKey));
  const [loadError, setLoadError] = useState("");
  const [helpPageName, setHelpPageName] = useState("");
  const [helpQuery, setHelpQuery] = useState("");
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

      <section className="console-glass rounded-2xl border p-4 sm:p-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div>
            <SectionHeader
              icon={SettingsIcon}
              title="Setup Status"
              subtitle="A concise view of launch readiness. Completed setup remains here for audit and onboarding."
            />
            <div className="mb-4 h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${readyPercent}%` }} />
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
              <div className="rounded-2xl border border-success/30 bg-success/10 px-4 py-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  <div>
                    <div className="text-sm font-bold text-foreground">Launch setup is complete</div>
                    <div className="text-xs text-muted-foreground">All core setup items have been completed.</div>
                  </div>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {completedItems.map((item) => (
                    <Link key={item.key} to={item.href} className="rounded-xl border border-border/70 bg-card/35 px-3 py-2 text-xs text-muted-foreground hover:border-primary/35 hover:text-foreground">
                      <CheckCircle2 className="mr-1 inline h-3.5 w-3.5 text-success" />
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <MetricTile icon={CheckCircle2} label="Ready" value={`${readyPercent}%`} caption={`${completedCount} of ${totalCount} setup items complete`} />
            <MetricTile icon={CircleDashed} label="Remaining" value={pendingItems.length} caption={pendingItems.length ? "Items still blocking launch readiness" : "No pending setup tasks"} />
            <MetricTile icon={Wrench} label="Tools" value={configurationTools.length} caption="Configuration areas available to your role" />
          </div>
        </div>
      </section>

      <section className="console-glass rounded-2xl border p-4 sm:p-5">
        <SectionHeader
          icon={Wrench}
          title="Configuration Tools"
          subtitle="Operational setup and admin controls that should live in Settings."
        />
        <div className="overflow-hidden rounded-2xl border border-border/80">
          {configurationTools.map((tool) => {
            const Icon = tool.icon;
            return (
              <div key={tool.key} className="grid gap-3 border-b border-border/60 px-4 py-4 last:border-b-0 lg:grid-cols-[180px_minmax(0,1fr)_auto] lg:items-center">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/12 text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{tool.group}</div>
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-foreground">{tool.title}</div>
                  <div className="mt-1 text-xs leading-5 text-muted-foreground">{tool.description}</div>
                </div>
                <div className="flex flex-wrap gap-2 lg:justify-end">
                  <Button asChild size="sm" variant="outline" className="h-8 px-3 text-xs">
                    <Link to={tool.href}>Open tool</Link>
                  </Button>
                  <Button type="button" size="sm" variant="ghost" className="h-8 px-3 text-xs" onClick={() => setHelpPageName(tool.helpPage)}>
                    Open help
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="console-glass rounded-2xl border p-4 sm:p-5">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <SectionHeader
            icon={BookOpen}
            title="Page Help Directory"
            subtitle="Every app area keeps a direct page link and a mandatory Open help action."
          />
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
          {filteredHelpSections.map((section) => (
            <div key={section.label} className="rounded-2xl border border-border/80 bg-card/25">
              <div className="border-b border-border/60 px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
                {section.label}
              </div>
              <div className="divide-y divide-border/55">
                {section.pages.map((pageName) => {
                  const help = pageHelp[pageName];
                  return (
                    <div key={pageName} className="grid gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-foreground">{help.title}</div>
                        <div className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{help.purpose}</div>
                      </div>
                      <div className="flex flex-wrap gap-2 sm:justify-end">
                        <Button asChild size="sm" variant="ghost" className="h-8 px-2.5 text-xs">
                          <Link to={createPageUrl(pageName)}>Open page</Link>
                        </Button>
                        <Button type="button" size="sm" variant="ghost" className="h-8 px-2.5 text-xs" onClick={() => setHelpPageName(pageName)}>
                          Open help
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

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
