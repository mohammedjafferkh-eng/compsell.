import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Plus, MapPin, Sparkles, ListChecks, FolderGit2, ArrowRight, Users } from "lucide-react";
import { AppShell, Logo } from "@/components/AppShell";
import { CategoryChips } from "@/components/CategoryChips";
import { ListingGrid } from "@/components/ListingCard";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useListings, useProfile, LISTING_SELECT } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import workbench from "@/assets/components-workbench.jpg";
import { DEFAULT_ABOUT, useSiteSettings } from "@/lib/site-settings";

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
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
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
  const { data: settings } = useSiteSettings();

  const place = { city: profile?.city ?? null, campus: profile?.campus ?? null };
  const nearby = useListings({ sort: "nearby", category }, place);
  const latest = useListings({ sort: "newest", category }, place);

  const nearbyRows = (nearby.data ?? []).filter(
    (l) =>
      (profile?.campus && l.campus?.toLowerCase() === profile.campus.toLowerCase()) ||
      (profile?.city && l.city?.toLowerCase() === profile.city.toLowerCase()),
  );

  const followFeed = useQuery({
    queryKey: ["follow-feed", user?.id],
    enabled: !!user && !category,
    queryFn: async () => {
      if (!user) return [];
      const { data: follows, error } = await supabase
        .from("seller_follows")
        .select("seller_id")
        .eq("follower_id", user.id);
      if (error) throw error;
      const ids = (follows ?? []).map((f) => f.seller_id);
      if (!ids.length) return [];
      const { data, error: e2 } = await supabase
        .from("listings")
        .select(LISTING_SELECT)
        .in("seller_id", ids)
        .eq("status", "ACTIVE")
        .order("created_at", { ascending: false })
        .limit(6);
      if (e2) throw e2;
      return data ?? [];
    },
  });

  return (
    <AppShell>
      <section className="market-hero relative -mx-5 -mt-6 overflow-hidden border-b border-border lg:-mx-8">
        <img src={workbench} alt="ESP32, Arduino, breadboard and scientific calculator on a workbench" width={1920} height={1024} fetchPriority="high" className="market-hero-image absolute inset-0 h-full w-full object-cover" />
        <div className="relative z-10 max-w-xl px-5 py-12 sm:max-w-[58%] sm:py-14 lg:px-8">
        <p className="mb-5 flex items-center gap-2 font-mono text-xs uppercase text-primary"><span className="size-2 rounded-full bg-primary" /> The student electronics exchange</p>
        <h1 className="font-display text-5xl font-bold leading-none sm:text-6xl">compsell<span className="text-primary">.</span></h1>
        <p className="mt-5 font-display text-2xl font-medium leading-tight sm:text-3xl">Buy. Sell.<br /><span className="text-primary">Reuse Electronics.</span></p>
        <p className="mt-4 max-w-sm text-sm leading-relaxed text-foreground/80">Your next build starts with someone’s spare. Find components, calculators and completed projects near you.</p>

        <form
          className="mt-6 flex gap-2"
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
              className="h-11 rounded-md bg-card pl-9"
              aria-label="Search components"
            />
          </div>
          <Button type="submit" aria-label="Search" className="h-11 rounded-md px-3">
            <ArrowRight className="size-5" />
          </Button>
        </form>

        <div className="mt-3 flex items-center gap-2">
          <Button asChild size="sm" variant="outline" className="bg-card">
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
            <span className="text-xs text-foreground/70">Made for students &amp; makers</span>
          )}
        </div>
        </div>
      </section>

      <div className="border-b border-border pb-5 pt-5">
        <CategoryChips value={category} onChange={setCategory} showCalculator />
      </div>

      <section className="mt-6 grid grid-cols-2 divide-x divide-border border-y border-border">
        <Link
          to="/selling-guide"
          search={{ tab: "how" }}
          className="group p-4 transition-colors hover:bg-secondary sm:p-6"
        >
          <ListChecks className="size-5 text-primary" />
          <h2 className="mt-3 text-sm font-semibold">How it works</h2>
          <p className="mt-1 text-xs text-muted-foreground">List, chat, meet, reuse.</p>
          <ArrowRight className="mt-3 size-4 text-primary" />
        </Link>
        <Link
          to="/projects"
          className="group p-4 transition-colors hover:bg-secondary sm:p-6"
        >
          <FolderGit2 className="size-5 text-primary" />
          <h2 className="mt-3 text-sm font-semibold">Completed projects</h2>
          <p className="mt-1 text-xs text-muted-foreground">Buy ready-made builds with code &amp; report.</p>
          <ArrowRight className="mt-3 size-4 text-primary" />
        </Link>
      </section>

      {nearbyRows.length > 0 && (
        <section className="mt-4">
          <SectionTitle icon={<MapPin className="size-4 text-primary" />} title="Nearby listings" />
          <ListingGrid listings={nearbyRows.slice(0, 6)} />
        </section>
      )}

      {followFeed.data && followFeed.data.length > 0 && (
        <section className="mt-6">
          <SectionTitle icon={<Users className="size-4 text-primary" />} title="From sellers you follow" />
          <ListingGrid listings={followFeed.data} />
        </section>
      )}

      <section className="mt-10">
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
      <section className="mt-14 grid gap-6 border-t border-border py-10 md:grid-cols-[1fr_1.5fr]">
        <div><p className="font-mono text-xs uppercase text-primary">01 / Why compsell</p><h2 className="mt-4 text-3xl font-semibold">A second life.<br />A new possibility.</h2></div>
        <div><p className="max-w-xl text-base leading-relaxed text-muted-foreground">{settings?.about_text || DEFAULT_ABOUT}</p><div className="mt-6 flex flex-wrap gap-4"><Button asChild variant="outline"><Link to="/about">About compsell <ArrowRight className="size-4" /></Link></Button><Button asChild variant="ghost"><Link to="/founder">Meet the founder <ArrowRight className="size-4" /></Link></Button></div></div>
      </section>
    </AppShell>
  );
}

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <h2 className="mb-5 flex items-center gap-2 text-xl font-semibold text-foreground">
      {icon}
      {title}
    </h2>
  );
}

export { Logo };
