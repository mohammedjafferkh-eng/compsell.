import { Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Heart, MapPin } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { categoryIcon, categoryLabel, rupees, timeAgo } from "@/lib/marketplace";
import { useSavedIds } from "@/lib/queries";
import { useSignedUrl } from "@/lib/storage";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

export type ListingRow = {
  id: string;
  title: string;
  category: string;
  condition: string;
  price: number | string;
  quantity: number;
  city: string | null;
  campus: string | null;
  status: string;
  created_at: string;
  is_project?: boolean;
  listing_images?: { image_url: string; sort_order: number }[];
};

export function ListingThumb({ path, alt }: { path?: string | null | undefined; alt: string }) {
  const { data: url } = useSignedUrl("listing-images", path);
  const Icon = categoryIcon("kits");
  if (!url) {
    return (
      <div className="circuit grid aspect-square w-full place-items-center rounded-xl bg-secondary">
        <Icon className="size-7 text-muted-foreground/60" />
      </div>
    );
  }
  return (
    <img
      src={url}
      alt={alt}
      loading="lazy"
      className="aspect-square w-full rounded-xl object-cover"
    />
  );
}

export function SaveButton({ listingId, className }: { listingId: string; className?: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const savedQ = useSavedIds(user?.id);
  const saved = savedQ.data?.has(listingId) ?? false;

  const toggle = useMutation({
    mutationFn: async () => {
      if (!user) return undefined;
      if (saved) {
        await supabase
          .from("saved_listings")
          .delete()
          .eq("user_id", user.id)
          .eq("listing_id", listingId);
        return undefined;
      }
      await supabase.from("saved_listings").insert({ user_id: user.id, listing_id: listingId });
      return undefined;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["saved-ids", user?.id] });
      qc.invalidateQueries({ queryKey: ["saved-listings", user?.id] });
      toast.success(saved ? "Removed from saved" : "Saved — find it on your Saved page");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not save"),
  });

  if (!user) return null;
  return (
    <button
      type="button"
      aria-label={saved ? "Remove from saved" : "Save listing"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle.mutate();
      }}
      className={cn(
        "absolute right-2 top-2 z-10 grid size-8 place-items-center rounded-full bg-background/85 shadow-card backdrop-blur transition-colors",
        saved ? "text-primary" : "text-foreground/70 hover:text-primary",
        className,
      )}
    >
      <Heart className={cn("size-4", saved && "fill-current")} />
    </button>
  );
}

export function ListingCard({ listing }: { listing: ListingRow }) {
  const cover = [...(listing.listing_images ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0];
  const Icon = categoryIcon(listing.category);

  return (
    <Link
      to="/listing/$id"
      params={{ id: listing.id }}
      className="group flex flex-col gap-2 rounded-2xl border border-border bg-card p-2.5 shadow-card transition-shadow hover:shadow-pop"
    >
      <div className="relative">
        <ListingThumb path={cover?.image_url} alt={listing.title} />
        {listing.status === "SOLD" ? (
          <Badge className="absolute left-2 top-2 bg-foreground text-background">Sold</Badge>
        ) : (
          listing.is_project && (
            <Badge className="absolute left-2 top-2 bg-primary text-primary-foreground">Project</Badge>
          )
        )}
        <SaveButton listingId={listing.id} />
      </div>
      <div className="px-0.5 pb-1">
        <div className="price text-base">{rupees(listing.price)}</div>
        <h3 className="line-clamp-2 text-sm font-medium leading-snug">{listing.title}</h3>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Icon className="size-3" />
            {categoryLabel(listing.category)}
          </span>
          <span>·</span>
          <span>{listing.condition}</span>
        </div>
        <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="inline-flex min-w-0 items-center gap-1">
            <MapPin className="size-3 shrink-0" />
            <span className="truncate">{listing.campus || listing.city || "India"}</span>
          </span>
          <span>{timeAgo(listing.created_at)}</span>
        </div>
      </div>
    </Link>
  );
}

export function ListingGrid({ listings }: { listings: ListingRow[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {listings.map((l) => (
        <ListingCard key={l.id} listing={l} />
      ))}
    </div>
  );
}
