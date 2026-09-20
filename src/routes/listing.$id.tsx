import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MapPin, MessageCircle, Package, Pencil, ArrowLeft, ShieldAlert, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { StarRating } from "@/components/StarRating";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile, useProfileWhatsapp, LISTING_SELECT, type Profile } from "@/lib/queries";
import { useSignedUrl } from "@/lib/storage";
import { categoryIcon, categoryLabel, rupees, timeAgo } from "@/lib/marketplace";

export const Route = createFileRoute("/listing/$id")({
  head: () => ({
    meta: [
      { title: "Component listing — compsell" },
      {
        name: "description",
        content:
          "See photos, price, condition, quantity and pickup location for this electronics component, then message the seller on compsell.",
      },
      { property: "og:title", content: "Component listing — compsell" },
      {
        property: "og:description",
        content: "Photos, price, condition and pickup details for this component.",
      },
    ],
  }),
  component: ListingDetail,
});

function ListingDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const listingQ = useQuery({
    queryKey: ["listing", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select(LISTING_SELECT)
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const listing = listingQ.data;
  const roleQ = useQuery({
    queryKey: ["my-owner-role", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user?.id ?? "")
        .eq("role", "owner")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const sellerQ = useProfile(listing?.seller_id);
  const seller = sellerQ.data as Profile | null | undefined;
  const sellerWhatsapp = useProfileWhatsapp(listing?.seller_id, !!user).data ?? null;

  const reviewsQ = useQuery({
    queryKey: ["reviews", listing?.seller_id],
    enabled: !!listing?.seller_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("id,rating,comment,created_at,reviewer_id")
        .eq("reviewed_user_id", listing!.seller_id)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
  });

  async function contactSeller() {
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    if (!listing) return;
    try {
      const { data: existing } = await supabase
        .from("conversations")
        .select("id")
        .eq("listing_id", listing.id)
        .eq("buyer_id", user.id)
        .maybeSingle();
      if (existing) {
        navigate({ to: "/chat/$id", params: { id: existing.id } });
        return;
      }
      const { data, error } = await supabase
        .from("conversations")
        .insert({ listing_id: listing.id, buyer_id: user.id, seller_id: listing.seller_id })
        .select("id")
        .single();
      if (error) throw error;
      navigate({ to: "/chat/$id", params: { id: data.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start the chat");
    }
  }

  async function moderateDelete() {
    if (!listing || !roleQ.data) return;
    const paths = (listing.listing_images ?? []).map((image) => image.image_url);
    try {
      if (paths.length) await supabase.storage.from("listing-images").remove(paths);
      const { error } = await supabase.from("listings").delete().eq("id", listing.id);
      if (error) throw error;
      toast.success("Listing removed");
      navigate({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove listing");
    }
  }

  if (listingQ.isLoading) {
    return (
      <AppShell>
        <Skeleton className="aspect-square w-full rounded-2xl" />
        <Skeleton className="mt-4 h-8 w-32" />
        <Skeleton className="mt-2 h-5 w-full" />
      </AppShell>
    );
  }

  if (!listing) {
    return (
      <AppShell>
        <EmptyState
          title="Listing not found"
          description="It may have been removed by the seller."
          action={
            <Button asChild>
              <Link to="/">Back to browse</Link>
            </Button>
          }
        />
      </AppShell>
    );
  }

  const images = [...(listing.listing_images ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const Icon = categoryIcon(listing.category);
  const isMine = user?.id === listing.seller_id;

  return (
    <AppShell
      header={
        <div className="flex w-full items-center gap-2">
          <button onClick={() => navigate({ to: "/" })} aria-label="Back">
            <ArrowLeft className="size-5" />
          </button>
          <span className="truncate font-display font-semibold">{listing.title}</span>
        </div>
      }
    >
      <div className="no-scrollbar -mx-4 flex snap-x gap-2 overflow-x-auto px-4">
        {images.length === 0 ? (
          <div className="circuit grid aspect-square w-full place-items-center rounded-2xl bg-secondary">
            <Icon className="size-10 text-muted-foreground/60" />
          </div>
        ) : (
          images.map((img) => <Photo key={img.image_url} path={img.image_url} alt={listing.title} />)
        )}
      </div>

      <div className="mt-4 flex items-start justify-between gap-3">
        <div>
          <div className="price text-3xl">{rupees(listing.price)}</div>
          <h1 className="mt-1 text-lg font-semibold leading-snug">{listing.title}</h1>
        </div>
        {listing.status === "SOLD" ? (
          <Badge className="bg-foreground text-background">Sold</Badge>
        ) : (
          <Badge variant="secondary" className="shrink-0">
            {listing.quantity} left
          </Badge>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <Badge variant="outline" className="gap-1">
          <Icon className="size-3" /> {categoryLabel(listing.category)}
        </Badge>
        <Badge variant="outline">{listing.condition}</Badge>
        <Badge variant="outline" className="gap-1">
          <Package className="size-3" /> Qty {listing.quantity}
        </Badge>
        <span className="text-muted-foreground">Listed {timeAgo(listing.created_at)}</span>
      </div>

      {listing.description && (
        <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-foreground/90">
          {listing.description}
        </p>
      )}

      <div className="mt-4 flex items-center gap-2 rounded-2xl border border-border bg-card p-3 text-sm">
        <MapPin className="size-4 text-primary" />
        <span>
          Pickup: {listing.campus || "—"}
          {listing.city ? `, ${listing.city}` : ""}
        </span>
      </div>

      {seller && (
        <Link
          to="/profile/$id"
          params={{ id: seller.id }}
          className="mt-3 flex items-center gap-3 rounded-2xl border border-border bg-card p-3"
        >
          <SellerAvatar profile={seller} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{seller.name}</div>
            <StarRating value={Number(seller.rating)} count={seller.review_count} />
          </div>
          <span className="text-xs text-primary">View profile</span>
        </Link>
      )}

      {roleQ.data && !isMine && (
        <section className="mt-4 rounded-2xl border border-destructive/30 bg-destructive/5 p-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-destructive">
            <ShieldAlert className="size-4" /> Owner moderation
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Remove this listing if it is unrelated, unsafe, spam, or otherwise inappropriate.
          </p>
          <Button variant="destructive" size="sm" className="mt-3" onClick={moderateDelete}>
            <Trash2 className="size-4" /> Delete listing
          </Button>
        </section>
      )}

      <div className="fixed inset-x-0 bottom-16 z-20 border-t border-border bg-card/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-3xl gap-2">
          {isMine ? (
            <>
              <Button asChild variant="outline" className="flex-1">
                <Link to="/listing/$id/edit" params={{ id: listing.id }}>
                  <Pencil className="size-4" /> Edit listing
                </Link>
              </Button>
              <Button asChild className="flex-1">
                <Link to="/my-listings">My listings</Link>
              </Button>
            </>
          ) : (
            <>
              <Button className="flex-1" onClick={contactSeller} disabled={listing.status === "SOLD"}>
                <MessageCircle className="size-4" />
                {listing.status === "SOLD" ? "Sold out" : "Contact seller"}
              </Button>
              {sellerWhatsapp && (
                <Button asChild variant="outline">
                  <a
                    href={`https://wa.me/${sellerWhatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(
                      `Hi, is "${listing.title}" still available on compsell?`,
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    WhatsApp
                  </a>
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {(reviewsQ.data ?? []).length > 0 && (
        <section className="mb-24 mt-6">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Seller reviews
          </h2>
          <div className="space-y-2">
            {(reviewsQ.data ?? []).map((r) => (
              <div key={r.id} className="rounded-2xl border border-border bg-card p-3">
                <StarRating value={r.rating} />
                {r.comment && <p className="mt-1 text-sm">{r.comment}</p>}
                <p className="mt-1 text-[11px] text-muted-foreground">{timeAgo(r.created_at)}</p>
              </div>
            ))}
          </div>
        </section>
      )}
      <div className="h-20" />
    </AppShell>
  );
}

function Photo({ path, alt }: { path: string; alt: string }) {
  const { data: url } = useSignedUrl("listing-images", path);
  return url ? (
    <img
      src={url}
      alt={alt}
      className="aspect-square w-[85%] shrink-0 snap-center rounded-2xl object-cover sm:w-[60%]"
    />
  ) : (
    <div className="aspect-square w-[85%] shrink-0 rounded-2xl bg-secondary sm:w-[60%]" />
  );
}

export function SellerAvatar({ profile }: { profile: Profile }) {
  const { data: url } = useSignedUrl("avatars", profile.avatar_url);
  return (
    <Avatar className="size-10">
      {url && <AvatarImage src={url} alt={profile.name} />}
      <AvatarFallback>{profile.name.slice(0, 2).toUpperCase()}</AvatarFallback>
    </Avatar>
  );
}
