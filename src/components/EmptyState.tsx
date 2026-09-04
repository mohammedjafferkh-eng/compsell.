import { CircuitBoard } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="circuit rounded-2xl border border-dashed border-border bg-card/60 px-6 py-12 text-center">
      <CircuitBoard className="mx-auto size-8 text-muted-foreground/60" />
      <h3 className="mt-3 text-base font-semibold">{title}</h3>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
