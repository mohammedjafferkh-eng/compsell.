import { Link } from "@tanstack/react-router";
import { Calculator } from "lucide-react";
import { CATEGORIES } from "@/lib/marketplace";
import { cn } from "@/lib/utils";

export function CategoryChips({
  value,
  onChange,
  showCalculator = false,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
  showCalculator?: boolean;
}) {
  return (
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 py-1">
      <Chip active={!value} onClick={() => onChange(null)} label="All" />
      {CATEGORIES.map(({ value: v, label, icon: Icon }) => (
        <Chip
          key={v}
          active={value === v}
          onClick={() => onChange(value === v ? null : v)}
          label={label}
          icon={<Icon className="size-3.5" />}
        />
      ))}
      {showCalculator && (
        <Link
          to="/selling-guide"
          search={{ tab: "calculator" }}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
        >
          <Calculator className="size-3.5" />
          Selling calculator
        </Link>
      )}
    </div>
  );
}

function Chip({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-foreground hover:bg-accent",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
