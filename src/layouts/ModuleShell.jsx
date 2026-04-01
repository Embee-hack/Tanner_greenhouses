import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { ChevronRight, Menu, X } from "lucide-react";
import HeaderControls from "@/components/navigation/HeaderControls.jsx";
import { cn } from "@/lib/utils";
import { moduleRegistry, setStoredModuleKey } from "@/lib/modules";

export default function ModuleShell({ moduleKey, navItems, footerCopy }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const moduleItem = moduleRegistry[moduleKey];
  const Icon = moduleItem.icon;

  useEffect(() => {
    setStoredModuleKey(moduleKey);
  }, [moduleKey]);

  const currentItem = useMemo(
    () =>
      [...navItems]
        .sort((a, b) => b.path.length - a.path.length)
        .find((item) => location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)),
    [location.pathname, navItems]
  );

  const pageTitle = currentItem?.label || moduleItem.shortLabel;

  return (
    <div className={cn("flex h-screen overflow-hidden bg-background", moduleItem.themeClass)}>
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col w-72 bg-card border-r border-border transition-transform duration-300 ease-in-out lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center gap-3 px-6 py-5 border-b border-border">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
            <Icon className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <div className="font-bold text-sm text-foreground leading-tight">{moduleItem.shortLabel}</div>
            <div className="text-xs text-muted-foreground">Farm Management Platform</div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto lg:hidden text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-foreground/70 hover:text-foreground hover:bg-muted"
                )
              }
              end={item.path === `/${moduleKey}`}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 truncate">{item.label}</span>
              {location.pathname === item.path && <ChevronRight className="w-3 h-3 opacity-70" />}
            </NavLink>
          ))}
        </nav>

        <div className="px-6 py-4 border-t border-border">
          <div className="text-xs text-muted-foreground">
            <div className="font-semibold text-foreground mb-0.5">{moduleItem.label}</div>
            <div>{footerCopy || moduleItem.description}</div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="flex items-center gap-4 px-4 md:px-6 py-4 border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-20">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-muted-foreground hover:text-foreground">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold text-foreground truncate">{pageTitle}</h1>
            <p className="text-xs text-muted-foreground truncate">{moduleItem.shortLabel} module</p>
          </div>
          <HeaderControls />
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
