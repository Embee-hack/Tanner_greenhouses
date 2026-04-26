export default function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="flex items-start justify-between gap-3 mb-6">
      <div className="min-w-0 flex-1">
        <h2 className="text-xl font-bold text-foreground">{title}</h2>
        {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {actions && (
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
          {actions}
        </div>
      )}
    </div>
  );
}
