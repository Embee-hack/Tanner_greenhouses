import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function ErrorBanner({ message, onRetry, className }) {
  if (!message) return null;

  return (
    <div className={cn("rounded-xl border border-danger/20 bg-danger/10 px-4 py-3", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-lg bg-white/70 p-1.5 text-danger">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-danger">Something needs attention</p>
            <p className="text-sm text-danger/90">{message}</p>
          </div>
        </div>

        {onRetry ? (
          <Button variant="outline" size="sm" onClick={onRetry} className="gap-1.5 self-start border-danger/30">
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        ) : null}
      </div>
    </div>
  );
}
