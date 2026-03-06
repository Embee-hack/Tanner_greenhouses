import { cn } from "@/lib/utils";

export default function FormField({ label, error, required, children, className }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <label className="text-sm font-medium text-foreground">
          {label}
          {required && <span className="text-danger ml-1">*</span>}
        </label>
      )}
      {children}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}