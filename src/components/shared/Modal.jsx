import { createPortal } from "react-dom";
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

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 pt-16 sm:pt-20">
      <div className="fixed inset-0 bg-black/62 backdrop-blur-md" onClick={onClose} />
      <div className={cn(
        "console-glass relative w-full max-h-[calc(100vh-5rem)] overflow-hidden flex flex-col rounded-2xl border bg-card/95",
        sizeMap[size]
      )}>
        <div className="flex items-center justify-between p-5 border-b border-border/70 bg-card/80 backdrop-blur-xl z-10 flex-shrink-0">
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-full hover:bg-muted"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto">{children}</div>
      </div>
    </div>,
    document.body
  );
}
