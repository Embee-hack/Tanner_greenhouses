import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, CircleDashed, Clock3 } from "lucide-react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { goatsClient, poultryClient } from "@/api/moduleClient";
import ErrorBanner from "@/components/shared/ErrorBanner.jsx";
import HeaderControls from "@/components/navigation/HeaderControls.jsx";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/errors.js";
import { moduleList, getModuleOpenPath, getStoredModuleKey, moduleRegistry } from "@/lib/modules";

const defaultStats = {
  greenhouse: "Loading summary...",
  poultry: "Loading summary...",
  goats: "Loading summary...",
};

const defaultLaunchReadiness = [
  { key: "greenhouse", label: "Greenhouse", ready: false, note: "Checking setup..." },
  { key: "poultry", label: "Poultry", ready: false, note: "Checking setup..." },
  { key: "goats", label: "Goats", ready: false, note: "Checking setup..." },
];

const getSettledValue = (result, fallback) => (result.status === "fulfilled" ? result.value : fallback);

const getFailureMessage = (result) =>
  result.status === "rejected" ? getErrorMessage(result.reason, "Failed to load readiness data.") : "";

export default function ModuleSelector() {
  const [stats, setStats] = useState(defaultStats);
  const [launchReadiness, setLaunchReadiness] = useState(defaultLaunchReadiness);
  const [loadError, setLoadError] = useState("");

  const loadStats = async () => {
    const [greenhousesResult, cyclesResult, inventoryResult, poultryResult, goatsResult] = await Promise.allSettled([
      base44.entities.Greenhouse.list("code"),
      base44.entities.CropCycle.list(),
      base44.entities.InventoryItem.list("name"),
      poultryClient.getDashboard(),
      goatsClient.getDashboard(),
    ]);

    const greenhouses = getSettledValue(greenhousesResult, []);
    const cycles = getSettledValue(cyclesResult, []);
    const inventoryItems = getSettledValue(inventoryResult, []);
    const poultry = getSettledValue(poultryResult, null);
    const goats = getSettledValue(goatsResult, null);

    const activeGreenhouses = greenhouses.filter((item) => item.status === "active").length;
    const activeCycles = cycles.filter((item) => item.status === "active").length;
    const activeFlocks = poultry?.summary?.active_flocks || 0;
    const activeHouses = poultry?.summary?.active_houses || 0;
    const activePens = goats?.summary?.active_pens || 0;
    const totalGoats = goats?.summary?.total_goats || 0;
    const greenhouseLoaded =
      greenhousesResult.status === "fulfilled" &&
      cyclesResult.status === "fulfilled" &&
      inventoryResult.status === "fulfilled";
    const poultryLoaded = poultryResult.status === "fulfilled";
    const goatsLoaded = goatsResult.status === "fulfilled";

    setStats({
      greenhouse: greenhouseLoaded ? `${activeGreenhouses} active greenhouses` : "Greenhouse data unavailable",
      poultry: poultryLoaded ? `${activeFlocks} active flocks` : "Poultry data unavailable",
      goats: goatsLoaded ? `${totalGoats} registered goats` : "Goat data unavailable",
    });
    setLaunchReadiness([
      {
        key: "greenhouse",
        label: "Greenhouse",
        ready: greenhouseLoaded && activeGreenhouses > 0 && activeCycles > 0 && inventoryItems.length > 0,
        note:
          !greenhouseLoaded
            ? "Could not confirm readiness."
            : activeGreenhouses === 0
              ? "Add your first greenhouse."
              : activeCycles === 0
                ? "Start an active crop cycle."
                : inventoryItems.length === 0
                  ? "Add inventory before operations start."
                  : "Core greenhouse operations are ready.",
      },
      {
        key: "poultry",
        label: "Poultry",
        ready: poultryLoaded && activeHouses > 0 && activeFlocks > 0,
        note:
          !poultryLoaded
            ? "Could not confirm readiness."
            : activeHouses === 0
              ? "Create a poultry house."
              : activeFlocks === 0
                ? "Register the first flock."
                : "Poultry operations are ready.",
      },
      {
        key: "goats",
        label: "Goats",
        ready: goatsLoaded && activePens > 0 && totalGoats > 0,
        note:
          !goatsLoaded
            ? "Could not confirm readiness."
            : activePens === 0
              ? "Create a goat pen."
              : totalGoats === 0
                ? "Register your first goat."
                : "Goat operations are ready.",
      },
    ]);

    const failures = [greenhousesResult, cyclesResult, inventoryResult, poultryResult, goatsResult]
      .map(getFailureMessage)
      .filter(Boolean);
    setLoadError(failures[0] || "");
  };

  useEffect(() => {
    loadStats();
  }, []);

  const lastModuleKey = useMemo(() => getStoredModuleKey(), []);
  const lastModule = lastModuleKey ? moduleRegistry[lastModuleKey] : null;
  const hasPendingReadiness = launchReadiness.some((item) => !item.ready);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/90 backdrop-blur-sm">
        <div className="px-4 md:px-6 py-4 flex items-center gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Farm Management Platform</p>
            <h1 className="text-lg font-semibold text-foreground">Module Selection</h1>
          </div>
          <HeaderControls />
        </div>
      </header>

      <main className="p-4 md:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <section className="rounded-[28px] border border-border bg-gradient-to-br from-primary/8 via-card to-accent/10 p-6 md:p-8">
            <p className="text-sm font-medium text-primary">Welcome back</p>
            <h2 className="text-3xl md:text-4xl font-black text-foreground mt-2">Select a farm section</h2>
            <p className="text-sm md:text-base text-muted-foreground mt-3 max-w-2xl">
              Enter one operating area at a time. Each module keeps its own dashboard, records, forms, and analytics.
            </p>

            {lastModule ? (
              <div className="mt-6 inline-flex items-center gap-3 rounded-2xl border border-border bg-card/80 px-4 py-3">
                <Clock3 className="w-4 h-4 text-primary" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">Continue to last module</p>
                  <p className="text-xs text-muted-foreground">{lastModule.label}</p>
                </div>
                <Button asChild size="sm" className="ml-2">
                  <Link to={getModuleOpenPath(lastModule.key)}>Continue</Link>
                </Button>
              </div>
            ) : null}
          </section>

          <ErrorBanner message={loadError} onRetry={loadStats} />

          {hasPendingReadiness ? (
            <section className="rounded-[28px] border border-border bg-card p-6">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Launch Readiness</p>
                  <h2 className="text-xl font-bold text-foreground mt-1">What still needs setup</h2>
                </div>
                <div className="text-sm text-muted-foreground">
                  {launchReadiness.filter((item) => item.ready).length} of {launchReadiness.length} modules ready
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {launchReadiness.map((item) => (
                  <div key={item.key} className="rounded-2xl border border-border p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        {item.ready ? <CheckCircle2 className="h-4 w-4 text-success" /> : <CircleDashed className="h-4 w-4 text-muted-foreground" />}
                        <h3 className="text-sm font-semibold text-foreground">{item.label}</h3>
                      </div>
                      <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold", item.ready ? "bg-success/10 text-success" : "bg-muted text-muted-foreground")}>
                        {item.ready ? "Ready" : "Setup Needed"}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-3">{item.note}</p>
                    <Button asChild variant="outline" size="sm" className="mt-4">
                      <Link to={getModuleOpenPath(item.key)}>Open {item.label}</Link>
                    </Button>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {moduleList.map((moduleItem) => {
              const Icon = moduleItem.icon;
              return (
                <article
                  key={moduleItem.key}
                  className={`rounded-[28px] border ${moduleItem.border} ${moduleItem.accent} p-6 shadow-sm`}
                >
                  <div className="w-14 h-14 rounded-2xl bg-card/90 border border-border flex items-center justify-center shadow-sm">
                    <Icon className={cn("w-7 h-7", moduleItem.iconClass)} />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mt-5">{moduleItem.label}</h3>
                  <p className="text-sm text-muted-foreground mt-2 min-h-[72px]">{moduleItem.description}</p>
                  <div className="rounded-2xl bg-card/80 border border-border px-4 py-3 mt-5">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Quick summary</p>
                    <p className="text-sm font-semibold text-foreground mt-1">{stats[moduleItem.key]}</p>
                  </div>
                  <Button asChild className={cn("w-full mt-5 justify-between", moduleItem.buttonClass)}>
                    <Link to={moduleItem.openPath}>
                      Open Module
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </Button>
                </article>
              );
            })}
          </section>
        </div>
      </main>
    </div>
  );
}
