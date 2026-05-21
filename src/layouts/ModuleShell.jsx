import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { ChevronRight, Menu, X } from "lucide-react";
import HeaderControls from "@/components/navigation/HeaderControls.jsx";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/AuthContext";
import { isAdminUser } from "@/lib/roles.js";
import { moduleRegistry, setStoredModuleKey } from "@/lib/modules";

export default function ModuleShell({ moduleKey, navItems, footerCopy }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { user } = useAuth();
  const moduleItem = moduleRegistry[moduleKey];
  const Icon = moduleItem.icon;
  const isOwner = isAdminUser(user);
  const visibleNavItems = useMemo(
    () => navItems.filter((item) => !item.ownerOnly || isOwner),
    [isOwner, navItems]
  );

  useEffect(() => {
    setStoredModuleKey(moduleKey);
  }, [moduleKey]);

  const currentItem = useMemo(
    () =>
      [...visibleNavItems]
        .sort((a, b) => b.path.length - a.path.length)
        .find((item) => location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)),
    [location.pathname, visibleNavItems]
  );

  const pageTitle = currentItem?.label || moduleItem.shortLabel;

  return (
    <div className={cn("flex h-screen overflow-hidden bg-background text-foreground", moduleItem.themeClass)}>
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/55 backdrop-blur-md lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col w-72 bg-card/88 border-r border-border/70 shadow-[18px_0_55px_hsl(150_45%_5%/0.3)] backdrop-blur-2xl transition-transform duration-300 ease-in-out lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center gap-3 px-6 py-5 border-b border-border/70">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center flex-shrink-0 shadow-[0_0_24px_hsl(var(--primary)/0.28)]">
            <Icon className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <div className="font-bold text-sm text-foreground leading-tight">{moduleItem.shortLabel}</div>
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
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150",
                  isActive
                    ? "bg-primary/24 text-foreground ring-1 ring-primary/35 shadow-[inset_0_1px_0_hsl(140_30%_90%/0.08),0_10px_28px_hsl(var(--primary)/0.12)]"
                    : "text-foreground/70 hover:text-foreground hover:bg-muted/70"
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

        <div className="px-6 py-4 border-t border-border/70">
          <div className="text-xs text-muted-foreground">
            <div className="font-semibold text-foreground mb-0.5">{moduleItem.label}</div>
            <div>{footerCopy || moduleItem.description}</div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="flex items-center gap-4 px-4 md:px-6 py-4 border-b border-border/70 bg-card/72 backdrop-blur-2xl sticky top-0 z-20 shadow-[0_12px_36px_hsl(150_45%_5%/0.18)]">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-muted-foreground hover:text-foreground">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold text-foreground truncate">{pageTitle}</h1>
            <p className="text-xs text-muted-foreground truncate">
              {moduleItem.shortLabel} module{!isOwner ? " · Farm Manager" : ""}
            </p>
          </div>
          <HeaderControls />
        </header>

        <main className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_50%_0%,hsl(var(--primary)/0.08),transparent_28rem)]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
