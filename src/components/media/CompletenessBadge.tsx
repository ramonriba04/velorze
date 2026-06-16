import { CheckCircle2, AlertCircle } from "lucide-react";

type Props = { items: { label: string; done: boolean }[] };

export function CompletenessBadge({ items }: Props) {
  const done = items.filter((i) => i.done).length;
  const pct = Math.round((done / Math.max(items.length, 1)) * 100);
  const complete = done === items.length;
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">
          {complete ? "Profile complete" : `Profile ${pct}% complete`}
        </p>
        <span className={`text-xs px-2 py-0.5 rounded-full ${complete ? "bg-success/15 text-success" : "bg-warning/15 text-warning"}`}>
          {done}/{items.length}
        </span>
      </div>
      <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full transition-all ${complete ? "bg-success" : "bg-primary"}`} style={{ width: `${pct}%` }} />
      </div>
      <ul className="mt-3 space-y-1 text-xs">
        {items.map((i) => (
          <li key={i.label} className="flex items-center gap-2">
            {i.done ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
            ) : (
              <AlertCircle className="h-3.5 w-3.5 text-warning" />
            )}
            <span className={i.done ? "text-muted-foreground" : ""}>{i.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
