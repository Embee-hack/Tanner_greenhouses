import { useState, useRef, useEffect } from "react";
import { LayoutGrid, LogOut, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import CurrencySelector from "@/components/navigation/CurrencySelector.jsx";
import NotificationPanel from "@/components/shared/NotificationPanel.jsx";
import { useAuth } from "@/lib/AuthContext";
import { isAdminUser } from "@/lib/roles.js";
import { cn } from "@/lib/utils";

const getInitials = (name) =>
  String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("") || "?";

export default function HeaderControls({ showNotifications = true }) {
  const { logout, user } = useAuth();
  const isAdmin = isAdminUser(user);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const displayName = user?.full_name || user?.email || "User";

  return (
    <div className="flex items-center gap-2">
      {/* Live indicator */}
      <div className="flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-full bg-success animate-pulse flex-shrink-0" />
        <span className="text-xs text-muted-foreground hidden md:block">Live</span>
      </div>

      {/* Currency — admin only */}
      {isAdmin && <CurrencySelector />}

      {/* Notifications — admin only */}
      {showNotifications && isAdmin && <NotificationPanel />}

      {/* User account button — always visible, opens dropdown */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-2 rounded-full border border-border/80 bg-muted/45 hover:bg-muted/70 px-2 py-1.5 transition-colors shadow-[inset_0_1px_0_hsl(140_30%_90%/0.05)]"
          aria-label="Account menu"
        >
          {/* Avatar initials */}
          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
            <span className="text-[10px] font-bold text-primary-foreground leading-none">
              {getInitials(displayName)}
            </span>
          </div>
          {/* Name — truncated, always shown */}
          <span className="text-xs font-medium text-foreground max-w-[100px] truncate hidden xs:block sm:block">
            {displayName.split(" ")[0]}
          </span>
          <ChevronDown className={cn("w-3 h-3 text-muted-foreground transition-transform flex-shrink-0", menuOpen && "rotate-180")} />
        </button>

        {menuOpen && (
          <div className="console-glass absolute right-0 top-full mt-1.5 z-50 bg-card/95 border border-border/80 rounded-2xl py-1.5 min-w-[180px]">
            {/* Full name header */}
            <div className="px-4 py-2 border-b border-border/70 mb-1">
              <div className="text-xs font-semibold text-foreground truncate">{displayName}</div>
              {user?.email && user.full_name && (
                <div className="text-xs text-muted-foreground truncate">{user.email}</div>
              )}
            </div>

            <Link
              to="/modules"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2 text-xs text-foreground hover:bg-muted/70 transition-colors"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-muted-foreground" />
              Switch Modules
            </Link>

            <button
              onClick={() => { setMenuOpen(false); logout(false); }}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-danger hover:bg-danger/10 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
