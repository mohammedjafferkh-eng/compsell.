import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function StarRating({
  value,
  size = "sm",
  count,
  onChange,
}: {
  value: number;
  size?: "sm" | "md";
  count?: number;
  onChange?: (v: number) => void;
}) {
  const px = size === "sm" ? "size-3.5" : "size-6";
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(i)}
          className={cn("disabled:cursor-default", onChange && "cursor-pointer")}
          aria-label={`${i} star${i > 1 ? "s" : ""}`}
        >
          <Star
            className={cn(
              px,
              i <= Math.round(value)
                ? "fill-warning stroke-warning"
                : "fill-transparent stroke-muted-foreground/50",
            )}
          />
        </button>
      ))}
      {typeof count === "number" && (
        <span className="ml-1 text-xs text-muted-foreground">
          {value ? value.toFixed(1) : "New"}
          {count > 0 && ` (${count})`}
        </span>
      )}
    </span>
  );
}
