import { LayoutGrid, LogOut } from "lucide-react";
import { Link } from "react-router-dom";
import CurrencySelector from "@/components/navigation/CurrencySelector.jsx";
import NotificationPanel from "@/components/shared/NotificationPanel.jsx";
import { useAuth } from "@/lib/AuthContext";

export default function HeaderControls({ showNotifications = true }) {
  const { logout, user } = useAuth();
  const isAdmin = user?.role === "admin";

  return (
    <div className="flex items-center gap-3">
      <Link
        to="/modules"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-foreground border border-primary/80 rounded-lg px-3 py-1.5 bg-primary hover:bg-primary/90 transition-all shadow-sm"
      >
        <LayoutGrid className="w-3.5 h-3.5" />
        <span className="hidden sm:block">Switch Modules</span>
      </Link>
      <CurrencySelector />
      {showNotifications && isAdmin && <NotificationPanel />}
      <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
      <span className="text-xs text-muted-foreground hidden sm:block">Live</span>
      {user && (
        <span className="text-xs text-muted-foreground hidden sm:block truncate max-w-[140px]">
          {user.full_name || user.email}
        </span>
      )}
      <button
        onClick={() => logout(false)}
        title="Sign out"
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg px-2.5 py-1.5 bg-muted/50 hover:bg-muted transition-all"
      >
        <LogOut className="w-3.5 h-3.5" />
        <span className="hidden sm:block">Sign out</span>
      </button>
    </div>
  );
}
