import { BadgeCheck } from "lucide-react";

/** Shown next to a seller's name when their email is verified. */
export function VerifiedBadge() {
  return (
    <span
      title="Verified student — email confirmed"
      className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary"
    >
      <BadgeCheck className="size-3" />
      Verified
    </span>
  );
}
