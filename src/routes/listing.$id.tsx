import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  MapPin,
  MessageCircle,
  Package,
  Pencil,
  ArrowLeft,
  ShieldAlert,
  Trash2,
  FolderGit2,
  Flag,
  BadgeCheck,
  UserPlus,
  UserCheck,
  HandCoins,
  Check,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { StarRating } from "@/components/StarRating";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile, useFollowState, useOwnerRole, LISTING_SELECT, type Profile } from "@/lib/queries";
import { useSignedUrl } from "@/lib/storage";
import { categoryIcon, categoryLabel, rupees, timeAgo } from "@/lib/marketplace";
import { VerifiedBadge } from "@/components/VerifiedBadge";

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

type OfferRow = {
  id: string;
  amount: number | string;
  counter_amount: number | string | null;
  status: string;
  created_at: string;
};

function ListingDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

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
  const roleQ = useOwnerRole(user?.id);
  const sellerQ = useProfile(listing?.seller_id);
  const seller = sellerQ.data as (Profile & { whatsapp?: string | null }) | null | undefined;

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

  const offersQ = useQuery({
    queryKey: ["offers", id, user?.id],
    enabled: !!user && !!listing && user.id !== listing.seller_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listing_offers")
        .select("*")
        .eq("listing_id", id)
        .eq("buyer_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as OfferRow[];
    },
  });

  const receivedCountQ = useQuery({
    queryKey: ["offers-received", id],
    enabled: !!user && !!listing && user.id === listing.seller_id,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("listing_offers")
        .select("id", { count: "exact", head: true })
        .eq("listing_id", id)
        .eq("status", "PENDING");
      if (error) throw error;
      return count ?? 0;
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
    if (!listing || !roleQ.data) return undefined;
    const paths = (listing.listing_images ?? []).map((image) => image.image_url);
    try {
      if (paths.length) await supabase.storage.from("listing-images").remove(paths);
      const { error } = await supabase.from("listings").delete().eq("id", listing.id);
      if (error) throw error;
      toast.success("Listing removed");
      navigate({ to: "/" });
      return undefined;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove listing");
      return undefined;
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
  const activeOffer = (offersQ.data ?? []).find((o) =>
    ["PENDING", "ACCEPTED", "COUNTERED"].includes(o.status),
  );

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
        {listing.is_project && (
          <Badge className="gap-1 bg-primary text-primary-foreground">
            <FolderGit2 className="size-3" /> Completed project
          </Badge>
        )}
        <span className="text-muted-foreground">Listed {timeAgo(listing.created_at)}</span>
      </div>

      {listing.description && (
        <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-foreground/90">
          {listing.description}
        </p>
      )}

      {listing.is_project && (
        <section className="mt-4 rounded-2xl border border-border bg-card p-4">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold">
            <FolderGit2 className="size-4 text-primary" /> About this project
          </h2>
          {listing.components_used && (
            <p className="mt-2 text-sm text-foreground/90">
              <span className="font-medium">Components used: </span>
              {listing.components_used}
            </p>
          )}
          {(listing.includes_code || listing.includes_report || listing.includes_hardware) && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {listing.includes_code && <Badge variant="secondary">Source code</Badge>}
              {listing.includes_report && <Badge variant="secondary">Report / docs</Badge>}
              {listing.includes_hardware && <Badge variant="secondary">Working hardware</Badge>}
            </div>
          )}
        </section>
      )}

      <div className="mt-4 flex items-center gap-2 rounded-2xl border border-border bg-card p-3 text-sm">
        <MapPin className="size-4 text-primary" />
        <span>
          Pickup: {listing.campus || "—"}
          {listing.city ? `, ${listing.city}` : ""}
        </span>
      </div>

      {seller && (
        <div className="mt-3 flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
          <Link
            to="/profile/$id"
            params={{ id: seller.id }}
            className="flex min-w-0 flex-1 items-center gap-3"
          >
            <SellerAvatar profile={seller} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 truncate text-sm font-semibold">
                {seller.name}
                {seller.verified && <VerifiedBadge />}
              </div>
              <StarRating value={Number(seller.rating)} count={seller.review_count} />
            </div>
            <span className="text-xs text-primary">View profile</span>
          </Link>
          {user && !isMine && <FollowButton sellerId={seller.id} />}
        </div>
      )}

      {isMine && listing.status === "ACTIVE" && (receivedCountQ.data ?? 0) > 0 && (
        <Link
          to="/my-listings"
          className="mt-3 flex items-center gap-2 rounded-2xl border border-primary/30 bg-primary/5 p-3 text-sm font-medium text-primary"
        >
          <HandCoins className="size-4" />
          {receivedCountQ.data} pending offer{(receivedCountQ.data ?? 0) > 1 ? "s" : ""} on this listing
          — manage in My listings
        </Link>
      )}

      {!isMine && listing.status === "ACTIVE" && (
        <OfferBox listingId={listing.id} activeOffer={activeOffer} onContact={contactSeller} />
      )}

      {user && !isMine && (
        <ReportDialog listingId={listing.id} />
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
              {seller?.whatsapp && (
                <Button asChild variant="outline">
                  <a
                    href={`https://wa.me/${seller.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(
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

function FollowButton({ sellerId }: { sellerId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const followQ = useFollowState(user?.id, sellerId);
  const following = followQ.data ?? false;

  const toggle = useMutation({
    mutationFn: async () => {
      if (!user) return undefined;
      if (following) {
        await supabase
          .from("seller_follows")
          .delete()
          .eq("follower_id", user.id)
          .eq("seller_id", sellerId);
        return undefined;
      }
      await supabase.from("seller_follows").insert({ follower_id: user.id, seller_id: sellerId });
      return undefined;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["follow", user?.id, sellerId] });
      qc.invalidateQueries({ queryKey: ["follower-count", sellerId] });
      qc.invalidateQueries({ queryKey: ["follow-feed"] });
      toast.success(following ? "Unfollowed" : "Following — their items show on your home page");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not update"),
  });

  return (
    <Button
      size="sm"
      variant={following ? "secondary" : "outline"}
      className="shrink-0"
      onClick={() => toggle.mutate()}
      disabled={toggle.isPending}
    >
      {following ? <UserCheck className="size-4" /> : <UserPlus className="size-4" />}
      {following ? "Following" : "Follow"}
    </Button>
  );
}

function OfferBox({
  listingId,
  activeOffer,
  onContact,
}: {
  listingId: string;
  activeOffer: OfferRow | undefined;
  onContact: () => void;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["offers", listingId] });
  };

  async function makeOffer() {
    if (!user) return;
    const value = Number(amount);
    if (!value || value <= 0) {
      toast.error("Enter the amount you'd like to offer");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.from("listing_offers").insert({
        listing_id: listingId,
        buyer_id: user.id,
        seller_id: "",
        amount: value,
      });
      if (error) throw error;
      toast.success("Offer sent to the seller");
      setAmount("");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send offer");
    } finally {
      setBusy(false);
    }
  }

  async function acceptCounter(offer: OfferRow) {
    if (!user) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from("listing_offers")
        .update({
          status: "ACCEPTED",
          amount: offer.counter_amount,
          counter_amount: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", offer.id);
      if (error) throw error;
      await supabase.rpc("offer_notify", {
        p_offer_id: offer.id,
        p_sender: user.id,
        p_message: `I accept your counter offer of ${rupees(Number(offer.counter_amount))}.`,
      });
      toast.success("Counter offer accepted — chat with the seller to finish the deal");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not accept offer");
    } finally {
      setBusy(false);
    }
  }

  async function declineCounter(offer: OfferRow) {
    setBusy(true);
    try {
      const { error } = await supabase
        .from("listing_offers")
        .update({ status: "DECLINED", updated_at: new Date().toISOString() })
        .eq("id", offer.id);
      if (error) throw error;
      toast.success("Counter offer declined");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not decline offer");
    } finally {
      setBusy(false);
    }
  }

  if (!user) return null;

  return (
    <section className="mt-3 rounded-2xl border border-border bg-card p-4">
      <h2 className="flex items-center gap-1.5 text-sm font-semibold">
        <HandCoins className="size-4 text-primary" /> Price negotiation
      </h2>
      {!activeOffer ? (
        <>
          <p className="mt-1 text-xs text-muted-foreground">
            Think the price is too high? Send your own offer — the seller can accept, counter or decline.
          </p>
          <div className="mt-2 flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₹</span>
              <input
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
                placeholder="Your offer"
                className="h-10 w-full rounded-xl border border-border bg-background pl-7 pr-3 text-sm outline-none focus:border-primary"
              />
            </div>
            <Button onClick={makeOffer} disabled={busy}>
              Send offer
            </Button>
          </div>
        </>
      ) : activeOffer.status === "PENDING" ? (
        <p className="mt-2 text-sm">
          Your offer of <span className="price font-semibold">{rupees(Number(activeOffer.amount))}</span> is
          waiting for the seller's response.
        </p>
      ) : activeOffer.status === "ACCEPTED" ? (
        <div className="mt-2">
          <p className="flex items-center gap-1.5 text-sm font-medium text-primary">
            <Check className="size-4" /> Offer of {rupees(Number(activeOffer.amount))} accepted!
          </p>
          <Button size="sm" className="mt-2" onClick={onContact}>
            <MessageCircle className="size-4" /> Message the seller
          </Button>
        </div>
      ) : activeOffer.status === "COUNTERED" ? (
        <div className="mt-2">
          <p className="text-sm">
            Seller countered at{" "}
            <span className="price font-semibold">{rupees(Number(activeOffer.counter_amount))}</span>
          </p>
          <div className="mt-2 flex gap-2">
            <Button size="sm" onClick={() => acceptCounter(activeOffer)} disabled={busy}>
              <Check className="size-4" /> Accept
            </Button>
            <Button size="sm" variant="outline" onClick={() => declineCounter(activeOffer)} disabled={busy}>
              <X className="size-4" /> Decline
            </Button>
          </div>
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">
          Your last offer was declined. Send a new one if you're still interested.
        </p>
      )}
    </section>
  );
}

function ReportDialog({ listingId }: { listingId: string }) {
  const { user } = useAuth();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!user) return undefined;
    if (!reason.trim()) {
      toast.error("Tell us briefly what's wrong");
      return undefined;
    }
    setBusy(true);
    try {
      const { error } = await supabase
        .from("listing_reports")
        .insert({ listing_id: listingId, reporter_id: user.id, reason: reason.trim() });
      if (error) throw error;
      toast.success("Report sent — thanks for keeping compsell clean");
      setReason("");
      return undefined;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send report");
      return undefined;
    } finally {
      setBusy(false);
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive">
          <Flag className="size-3.5" /> Report this listing
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Report this listing</AlertDialogTitle>
          <AlertDialogDescription>
            Seen unnecessary photos, spam or something unsafe? Tell us what's wrong and the compsell team
            will review it.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Textarea
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Photos are not of the actual item / inappropriate / spam"
        />
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={submit} disabled={busy}>
            {busy ? "Sending..." : "Send report"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
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
