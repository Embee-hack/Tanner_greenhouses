import { useState, useEffect, useRef } from "react";
import { Bell, X, CheckCheck, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  subscribeToNotifications, markAllRead, markRead, clearNotifications, removeNotification
} from "@/components/shared/NotificationStore.jsx";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

const PRIORITY_STYLES = {
  critical: {
    dot: "bg-red-500",
    badge: "bg-red-100 text-red-700 border-red-200",
    bar: "border-l-red-500",
    label: "CRITICAL",
  },
  high: {
    dot: "bg-orange-500",
    badge: "bg-orange-100 text-orange-700 border-orange-200",
    bar: "border-l-orange-400",
    label: "HIGH",
  },
  medium: {
    dot: "bg-yellow-500",
    badge: "bg-yellow-100 text-yellow-700 border-yellow-200",
    bar: "border-l-yellow-400",
    label: "MEDIUM",
  },
  info: {
    dot: "bg-blue-400",
    badge: "bg-blue-50 text-blue-600 border-blue-200",
    bar: "border-l-blue-400",
    label: "INFO",
  },
};

const CATEGORY_EMOJI = {
  harvest: "🌿",
  incident: "🐛",
  expense: "💸",
  sales: "📦",
  treatment: "🧪",
  cycle: "🔄",
  population: "🌱",
  inventory: "📋",
  calendar: "📅",
  info: "ℹ️",
};

export default function NotificationPanel() {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = subscribeToNotifications(setNotifications);
    return unsub;
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const unread = notifications.filter(n => !n.read).length;

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => { setOpen(o => !o); if (!open) { /* panel opens, don't auto-read */ } }}
        className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
      >
        <Bell className="w-4.5 h-4.5 w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-[360px] max-w-[calc(100vw-24px)] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
            <Bell className="w-4 h-4 text-primary" />
            <span className="font-bold text-sm text-foreground flex-1">Notifications</span>
            {unread > 0 && (
              <span className="text-xs bg-red-100 text-red-600 font-semibold px-2 py-0.5 rounded-full">{unread} new</span>
            )}
            <button
              onClick={markAllRead}
              title="Mark all read"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <CheckCheck className="w-4 h-4" />
            </button>
            <button
              onClick={clearNotifications}
              title="Clear all"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Priority legend */}
          <div className="flex gap-2 px-4 py-2 bg-muted/20 border-b border-border/50 flex-wrap">
            {["critical", "high", "medium", "info"].map(p => (
              <span key={p} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span className={cn("w-2 h-2 rounded-full", PRIORITY_STYLES[p].dot)} />
                {PRIORITY_STYLES[p].label}
              </span>
            ))}
          </div>

          {/* List */}
          <div className="max-h-[420px] overflow-y-auto divide-y divide-border/50">
            {notifications.length === 0 ? (
              <div className="px-4 py-10 text-center text-muted-foreground text-sm">No notifications yet. Actions you or your team take will appear here.</div>
            ) : (
              notifications.map(n => {
                const ps = PRIORITY_STYLES[n.priority] || PRIORITY_STYLES.info;
                return (
                  <div
                    key={n.id}
                    onClick={() => {
                      markRead(n.id);
                      if (n.page) {
                        setOpen(false);
                        navigate(createPageUrl(n.page));
                      }
                    }}
                    className={cn(
                      "flex items-start gap-3 px-4 py-3 border-l-4 cursor-pointer transition-colors group",
                      ps.bar,
                      n.read ? "bg-card hover:bg-muted/20 opacity-70" : "bg-muted/10 hover:bg-muted/30",
                      n.page && "hover:bg-primary/5"
                    )}
                  >
                    <div className="text-xl leading-none mt-0.5 flex-shrink-0">
                      {CATEGORY_EMOJI[n.category] || "ℹ️"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-xs leading-snug", n.read ? "text-muted-foreground" : "text-foreground font-medium")}>
                        {n.message}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={cn("text-[10px] px-1.5 py-0.5 rounded border font-semibold", ps.badge)}>
                          {ps.label}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(n.timestamp), { addSuffix: true })}
                        </span>
                        {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-primary ml-auto flex-shrink-0" />}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeNotification(n.id);
                      }}
                      className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                      title="Delete notification"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t border-border text-center">
              <span className="text-[10px] text-muted-foreground">{notifications.length} total · Click items to mark as read</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
