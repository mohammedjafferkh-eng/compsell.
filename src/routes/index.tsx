import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Search, Plus, MapPin, Sparkles, ListChecks, ArrowRight } from "lucide-react";
import { AppShell, Logo } from "@/components/AppShell";
import { CategoryChips } from "@/components/CategoryChips";
import { ListingGrid } from "@/components/ListingCard";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useListings, useProfile } from "@/lib/queries";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "compsell — Buy, sell and reuse electronics components" },
      {
        name: "description",
        content:
          "Browse ESP32 boards, sensors, motors and modules for sale near your campus. List your spare components in a minute on compsell.",
      },
      { property: "og:title", content: "compsell — Buy, sell and reuse electronics components" },
      {
        property: "og:description",
        content: "Browse ESP32 boards, sensors, motors and modules for sale near your campus.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const [category, setCategory] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);

  const place = { city: profile?.city ?? null, campus: profile?.campus ?? null };
  const nearby = useListings({ sort: "nearby", category }, place);
  const latest = useListings({ sort: "newest", category }, place);

  const nearbyRows = (nearby.data ?? []).filter(
    (l) =>
      (profile?.campus && l.campus?.toLowerCase() === profile.campus.toLowerCase()) ||
      (profile?.city && l.city?.toLowerCase() === profile.city.toLowerCase()),
  );

  return (
    <AppShell>
      <section className="circuit -mx-4 -mt-4 border-b border-border bg-card px-4 pb-5 pt-5">
        <h1 className="text-2xl font-bold leading-tight">
          Buy. Sell. <span className="text-primary">Reuse Electronics.</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Spare components from makers and students near you.
        </p>

        <form
          className="mt-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            navigate({ to: "/explore", search: { q } });
          }}
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search ESP32, sensors, motors..."
              className="h-11 rounded-xl bg-background pl-9"
              aria-label="Search components"
            />
          </div>
          <Button type="submit" className="h-11 rounded-xl px-4">
            Search
          </Button>
        </form>

        <div className="mt-3 flex items-center gap-2">
          <Button asChild size="sm" className="rounded-full">
            <Link to="/sell">
              <Plus className="size-4" /> Sell a Component
            </Link>
          </Button>
          {profile?.campus || profile?.city ? (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="size-3.5" />
              {profile.campus || profile.city}
            </span>
          ) : (
            <Link to="/account" className="text-xs text-primary">
              Set your campus for nearby results
            </Link>
          )}
        </div>
      </section>

      <div className="pt-3">
        <CategoryChips value={category} onChange={setCategory} showCalculator />
      </div>

      <section className="mt-5">
        <Link
          to="/selling-guide"
          search={{ tab: "how" }}
          className="circuit rounded-2xl border border-border bg-card p-4 shadow-card"
        >
          <ListChecks className="size-5 text-primary" />
          <h2 className="mt-3 text-sm font-semibold">How it works</h2>
          <p className="mt-1 text-xs text-muted-foreground">List, chat, meet, reuse.</p>
          <ArrowRight className="mt-3 size-4 text-primary" />
        </Link>
      </section>

      {nearbyRows.length > 0 && (
        <section className="mt-4">
          <SectionTitle icon={<MapPin className="size-4 text-primary" />} title="Nearby listings" />
          <ListingGrid listings={nearbyRows.slice(0, 6)} />
        </section>
      )}

      <section className="mt-6">
        <SectionTitle icon={<Sparkles className="size-4 text-primary" />} title="Latest listings" />
        {latest.isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[3/4] rounded-2xl" />
            ))}
          </div>
        ) : (latest.data ?? []).length === 0 ? (
          <EmptyState
            title="No listings yet"
            description="Be the first to list a spare component."
            action={
              <Button asChild>
                <Link to="/sell">Sell a Component</Link>
              </Button>
            }
          />
        ) : (
          <ListingGrid listings={latest.data ?? []} />
        )}
      </section>
    </AppShell>
  );
}

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <h2 className="mb-2.5 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
      {icon}
      {title}
    </h2>
  );
}

export { Logo };
