export default function AnalyticsPanel({ title, subtitle, children }) {
  return (
    <div className="bg-card rounded-2xl border border-border p-4 sm:p-5">
      <div className="mb-4">
        <h3 className="font-semibold text-sm text-foreground">{title}</h3>
        {subtitle ? <p className="text-xs text-muted-foreground mt-1">{subtitle}</p> : null}
      </div>
      {children}
    </div>
  );
}
