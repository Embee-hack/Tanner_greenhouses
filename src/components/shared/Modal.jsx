import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Modal({ open, onClose, title, children, size = "md" }) {
  if (!open) return null;

  const sizeMap = {
    sm: "max-w-md",
    md: "max-w-xl",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={cn(
        "relative bg-card rounded-2xl border border-border shadow-2xl w-full max-h-[90vh] overflow-y-auto",
        sizeMap[size]
      )}>
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card z-10">
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-muted"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}