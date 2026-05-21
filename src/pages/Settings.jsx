import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, HelpCircle, Layers, ListTree, Settings as SettingsIcon, Shield, Users } from "lucide-react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import LaunchChecklist from "@/components/shared/LaunchChecklist.jsx";
import ErrorBanner from "@/components/shared/ErrorBanner.jsx";
import Modal from "@/components/shared/Modal";
import { Button } from "@/components/ui/button";
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

export default function Settings() {
  const { user } = useAuth();
  const isAdmin = isAdminUser(user);
  const cacheKey = getDashboardCacheKey(isAdmin);
  const [snapshot, setSnapshot] = useState(() => normalizeDashboardData(readDashboardCache(cacheKey) || {}));
  const [loading, setLoading] = useState(!readDashboardCache(cacheKey));
  const [loadError, setLoadError] = useState("");
  const [helpPageName, setHelpPageName] = useState("");
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
  const completedCount = checklistItems.filter((item) => item.done).length;
  const settingsTools = [
    {
      key: "crops",
      title: "Crops & Varieties",
      description: "Manage the crop catalog used by crop cycles, harvests, and sales.",
      icon: ListTree,
      href: `${createPageUrl("CropCycles")}?settings=crops`,
      helpPage: "CropCycles",
    },
    {
      key: "blocks",
      title: "Greenhouse Blocks",
      description: "Create and edit structural blocks used to group greenhouses.",
      icon: Layers,
      href: `${createPageUrl("Greenhouses")}?settings=blocks`,
      helpPage: "Greenhouses",
    },
    {
      key: "roles",
      title: "Worker Roles",
      description: "Manage the reusable worker role catalog used in team profiles.",
      icon: Users,
      href: `${createPageUrl("Workers")}?settings=roles`,
      helpPage: "Workers",
      adminOnly: true,
    },
    {
      key: "users",
      title: "Users & Access",
      description: "Create users, update roles, and manage who can access admin features.",
      icon: Shield,
      href: createPageUrl("UserManagement"),
      helpPage: "UserManagement",
      adminOnly: true,
    },
    {
      key: "activity",
      title: "Activity Log",
      description: "Review audit history for important creates, updates, deletes, and sign-ins.",
      icon: Activity,
      href: createPageUrl("ActivityLog"),
      helpPage: "ActivityLog",
      adminOnly: true,
    },
  ].filter((tool) => !tool.adminOnly || isAdmin);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader
        title="Settings"
        subtitle="Setup status and workflow guidance for the greenhouse module."
        actions={
          <Button size="sm" variant="outline" onClick={load} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </Button>
        }
      />

      <ErrorBanner message={loadError} onRetry={load} />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <LaunchChecklist items={checklistItems} title="Setup Checklist" mode="full" />

        <div className="bg-card rounded-2xl border border-border p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-4">
            <SettingsIcon className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Readiness Summary</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border bg-muted/30 px-3 py-3">
              <div className="text-xs text-muted-foreground">Completed</div>
              <div className="mt-1 text-xl font-semibold text-foreground">{completedCount}</div>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 px-3 py-3">
              <div className="text-xs text-muted-foreground">Remaining</div>
              <div className="mt-1 text-xl font-semibold text-foreground">{Math.max(0, checklistItems.length - completedCount)}</div>
            </div>
          </div>
          <div className="mt-4 rounded-xl border border-border px-3 py-3 text-sm leading-6 text-muted-foreground">
            The dashboard only shows launch checklist items while they are incomplete. Once every setup step is complete, this Settings page becomes the permanent place to review setup status.
          </div>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-4">
          <SettingsIcon className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Configuration Tools</h3>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {settingsTools.map((tool) => {
            const Icon = tool.icon;
            return (
              <div key={tool.key} className="rounded-xl border border-border px-3 py-3">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-foreground">{tool.title}</div>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{tool.description}</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button asChild size="sm" variant="outline" className="h-8 px-2.5 text-xs font-semibold">
                    <Link to={tool.href}>Open tool</Link>
                  </Button>
                  <Button type="button" size="sm" variant="ghost" className="h-8 px-2.5 text-xs font-semibold" onClick={() => setHelpPageName(tool.helpPage)}>
                    Open help
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-4">
          <HelpCircle className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Page Guide</h3>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Object.entries(pageHelp).map(([pageName, help]) => (
            <div key={pageName} className="rounded-xl border border-border px-3 py-3">
              <div className="text-sm font-semibold text-foreground">{help.title}</div>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{help.purpose}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button asChild size="sm" variant="ghost" className="h-8 px-2 text-xs font-semibold">
                  <Link to={`/${pageName}`}>Open page</Link>
                </Button>
                <Button type="button" size="sm" variant="ghost" className="h-8 px-2 text-xs font-semibold" onClick={() => setHelpPageName(pageName)}>
                  Open help
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

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
