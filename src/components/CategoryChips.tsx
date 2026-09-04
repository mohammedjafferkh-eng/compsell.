import { CATEGORIES } from "@/lib/marketplace";
import { cn } from "@/lib/utils";

export function CategoryChips({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
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
