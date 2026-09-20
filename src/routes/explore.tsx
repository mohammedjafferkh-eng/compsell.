import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { CategoryChips } from "@/components/CategoryChips";
import { ListingGrid } from "@/components/ListingCard";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CONDITIONS, SORTS } from "@/lib/marketplace";
import { useListings, useProfile } from "@/lib/queries";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/explore")({
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search["q"] === "string" ? search["q"] : "",
  }),
  head: () => ({
    meta: [
      { title: "Search components — compsell" },
      {
        name: "description",
        content:
          "Filter electronics listings by category, condition, price in rupees, and city or campus on compsell.",
      },
      { property: "og:title", content: "Search components — compsell" },
      {
        property: "og:description",
        content: "Filter electronics listings by category, condition, price and campus.",
      },
    ],
  }),
  component: Explore,
});

function Explore() {
  const { q: initialQ } = Route.useSearch();
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);

  const [q, setQ] = useState(initialQ);
  const [category, setCategory] = useState<string | null>(null);
  const [condition, setCondition] = useState<string | null>(null);
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const [place, setPlace] = useState("");
  const [sort, setSort] = useState<string>("newest");
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading } = useListings(
    {
      q,
      category,
      condition,
      min: min ? Number(min) : null,
      max: max ? Number(max) : null,
      place,
      sort,
    },
    { city: profile?.city ?? null, campus: profile?.campus ?? null },
  );

  return (
    <AppShell>
      <h1 className="sr-only">Search electronics components</h1>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search ESP32, sensors, motors..."
          className="h-11 rounded-xl bg-card pl-9"
          aria-label="Search components"
        />
      </div>

      <div className="mt-3 flex items-center gap-2">
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="h-9 w-[170px] rounded-full bg-card text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORTS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          className="h-9 rounded-full"
          onClick={() => setShowFilters((v) => !v)}
        >
          <SlidersHorizontal className="size-3.5" /> Filters
        </Button>
      </div>

      <CategoryChips value={category} onChange={setCategory} />

      {showFilters && (
        <div className="mt-2 grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Condition</Label>
            <Select
              value={condition ?? "any"}
              onValueChange={(v) => setCondition(v === "any" ? null : v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any condition</SelectItem>
                {CONDITIONS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>City / campus</Label>
            <Input
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              placeholder="e.g. VIT Vellore"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Min price (₹)</Label>
            <Input
              inputMode="numeric"
              value={min}
              onChange={(e) => setMin(e.target.value.replace(/\D/g, ""))}
              placeholder="0"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Max price (₹)</Label>
            <Input
              inputMode="numeric"
              value={max}
              onChange={(e) => setMax(e.target.value.replace(/\D/g, ""))}
              placeholder="5000"
            />
          </div>
        </div>
      )}

      <p className="mt-4 text-xs text-muted-foreground">
        {isLoading ? "Searching..." : `${data?.length ?? 0} listings`}
      </p>

      <div className="mt-2">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[3/4] rounded-2xl" />
            ))}
          </div>
        ) : (data ?? []).length === 0 ? (
          <EmptyState
            title="Nothing matched"
            description="Try a different keyword, wider price range or another category."
          />
        ) : (
          <ListingGrid listings={data ?? []} />
        )}
      </div>
    </AppShell>
  );
}
