import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MapPin, UserPlus, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { StarRating } from "@/components/StarRating";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { Button } from "@/components/ui/button";
import { ListingGrid } from "@/components/ListingCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile, useFollowState, useFollowerCount, LISTING_SELECT, type Profile } from "@/lib/queries";
import { useSignedUrl } from "@/lib/storage";
import { timeAgo } from "@/lib/marketplace";

export const Route = createFileRoute("/profile/$id")({
  head: () => ({
    meta: [
      { title: "Seller profile — compsell" },
      {
        name: "description",
        content: "See a seller's campus, rating, reviews and the components they have for sale.",
      },
      { property: "og:title", content: "Seller profile — compsell" },
      { property: "og:description", content: "Seller rating, reviews and active component listings." },
    ],
  }),
  component: PublicProfile,
});

function PublicProfile() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const { data: profile, isLoading } = useProfile(id);
  const p = profile as Profile | null | undefined;
  const { data: avatarUrl } = useSignedUrl("avatars", p?.avatar_url);
  const followQ = useFollowState(user?.id, id);
  const followersQ = useFollowerCount(id);
  const qc = useQueryClient();
  const following = followQ.data ?? false;
  const isMe = user?.id === id;

  const toggleFollow = useMutation({
    mutationFn: async () => {
      if (!user) return undefined;
      if (following) {
        await supabase.from("seller_follows").delete().eq("follower_id", user.id).eq("seller_id", id);
        return undefined;
      }
      await supabase.from("seller_follows").insert({ follower_id: user.id, seller_id: id });
      return undefined;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["follow", user?.id, id] });
      qc.invalidateQueries({ queryKey: ["follower-count", id] });
      qc.invalidateQueries({ queryKey: ["follow-feed"] });
      toast.success(following ? "Unfollowed" : `Following ${p?.name ?? "seller"}`);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not update"),
  });

  const listingsQ = useQuery({
    queryKey: ["seller-listings", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select(LISTING_SELECT)
        .eq("seller_id", id)
        .eq("status", "ACTIVE")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const reviewsQ = useQuery({
    queryKey: ["reviews", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("id,rating,comment,created_at")
        .eq("reviewed_user_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  if (isLoading) return <AppShell><Skeleton className="h-32 w-full rounded-2xl" /></AppShell>;
  if (!p)
    return (
      <AppShell>
        <EmptyState title="Seller not found" />
      </AppShell>
    );

  return (
    <AppShell>
      <div className="circuit flex items-center gap-4 rounded-2xl border border-border bg-card p-4">
        <Avatar className="size-16">
          {avatarUrl && <AvatarImage src={avatarUrl} alt={p.name} />}
          <AvatarFallback>{p.name.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h1 className="flex items-center gap-1.5 truncate text-lg font-semibold">
            {p.name}
            {p.verified && <VerifiedBadge />}
          </h1>
          {(p.campus || p.city) && (
            <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="size-3" />
              {[p.campus, p.city].filter(Boolean).join(", ")}
            </p>
          )}
          <StarRating value={Number(p.rating)} count={p.review_count} />
          <p className="mt-0.5 text-xs text-muted-foreground">
            {followersQ.data ?? 0} follower{(followersQ.data ?? 0) === 1 ? "" : "s"}
          </p>
        </div>
        {user && !isMe && (
          <Button
            size="sm"
            variant={following ? "secondary" : "outline"}
            className="shrink-0"
            onClick={() => toggleFollow.mutate()}
            disabled={toggleFollow.isPending}
          >
            {following ? <UserCheck className="size-4" /> : <UserPlus className="size-4" />}
            {following ? "Following" : "Follow"}
          </Button>
        )}
      </div>

      <section className="mt-6">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Active listings
        </h2>
        {listingsQ.isLoading ? (
          <Skeleton className="h-40 w-full rounded-2xl" />
        ) : (listingsQ.data ?? []).length === 0 ? (
          <EmptyState title="No active listings" />
        ) : (
          <ListingGrid listings={listingsQ.data ?? []} />
        )}
      </section>

      <section className="mb-8 mt-6">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Reviews
        </h2>
        {(reviewsQ.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No reviews yet.</p>
        ) : (
          <div className="space-y-2">
            {(reviewsQ.data ?? []).map((r) => (
              <div key={r.id} className="rounded-2xl border border-border bg-card p-3">
                <StarRating value={r.rating} />
                {r.comment && <p className="mt-1 text-sm">{r.comment}</p>}
                <p className="mt-1 text-[11px] text-muted-foreground">{timeAgo(r.created_at)}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
