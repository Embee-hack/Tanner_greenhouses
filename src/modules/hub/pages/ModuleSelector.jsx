import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Clock3 } from "lucide-react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { goatsClient, poultryClient } from "@/api/moduleClient";
import HeaderControls from "@/components/navigation/HeaderControls.jsx";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { moduleList, getModuleOpenPath, getStoredModuleKey, moduleRegistry } from "@/lib/modules";

const defaultStats = {
  greenhouse: "Loading summary...",
  poultry: "Loading summary...",
  goats: "Loading summary...",
};

export default function ModuleSelector() {
  const [stats, setStats] = useState(defaultStats);

  useEffect(() => {
    let cancelled = false;

    const loadStats = async () => {
      try {
        const [greenhouses, poultry, goats] = await Promise.all([
          base44.entities.Greenhouse.list("code"),
          poultryClient.getDashboard(),
          goatsClient.getDashboard(),
        ]);

        if (cancelled) return;

        setStats({
          greenhouse: `${greenhouses.filter((item) => item.status === "active").length} active greenhouses`,
          poultry: `${poultry?.summary?.active_flocks || 0} active flocks`,
          goats: `${goats?.summary?.total_goats || 0} registered goats`,
        });
      } catch (_error) {
        if (!cancelled) {
          setStats({
            greenhouse: "Greenhouse data ready",
            poultry: "Poultry module ready",
            goats: "Goat module ready",
          });
        }
      }
    };

    loadStats();

    return () => {
      cancelled = true;
    };
  }, []);

  const lastModuleKey = useMemo(() => getStoredModuleKey(), []);
  const lastModule = lastModuleKey ? moduleRegistry[lastModuleKey] : null;

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

          <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {moduleList.map((moduleItem) => {
              const Icon = moduleItem.icon;
              return (
                <article
                  key={moduleItem.key}
                  className={`rounded-[28px] border ${moduleItem.border} bg-gradient-to-br ${moduleItem.accent} p-6 shadow-sm`}
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
