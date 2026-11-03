import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { EmptyState } from "@/components/EmptyState";
import { ListingGrid } from "@/components/ListingCard";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { LISTING_SELECT } from "@/lib/queries";
import type { ListingRow } from "@/components/ListingCard";

export const Route = createFileRoute("/saved")({
  head: () => ({
    meta: [
      { title: "Saved listings — compsell" },
      {
        name: "description",
        content: "All the components and projects you saved while browsing compsell.",
      },
      { property: "og:title", content: "Saved listings — compsell" },
      { property: "og:description", content: "Your saved components and projects on compsell." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SavedPage,
});

function SavedPage() {
  return (
    <AppShell>
      <h1 className="mb-4 flex items-center gap-2 text-xl font-bold">
        <Heart className="size-5 text-primary" /> Saved
      </h1>
      <RequireAuth title="Sign in to see your saved listings">
        <SavedList />
      </RequireAuth>
    </AppShell>
  );
}

function SavedList() {
  const { user } = useAuth();

  const savedQ = useQuery({
    queryKey: ["saved-listings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saved_listings")
        .select(`created_at,listings(${LISTING_SELECT})`)
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(120);
      if (error) throw error;
      return (data ?? []).map((r) => r.listings).filter(Boolean) as ListingRow[];
    },
  });

  if (savedQ.isLoading) return <Skeleton className="h-64 w-full rounded-2xl" />;

  const rows = savedQ.data ?? [];
  if (rows.length === 0) {
    return (
      <EmptyState
        title="Nothing saved yet"
        description="Tap the heart on any listing to keep it here for later."
      />
    );
  }
  return <ListingGrid listings={rows} />;
}
