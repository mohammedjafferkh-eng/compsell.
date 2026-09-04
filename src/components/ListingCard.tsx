import { Link } from "@tanstack/react-router";
import { MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { categoryIcon, categoryLabel, rupees, timeAgo } from "@/lib/marketplace";
import { useSignedUrl } from "@/lib/storage";

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
  listing_images?: { image_url: string; sort_order: number }[];
};

export function ListingThumb({ path, alt }: { path?: string | null; alt: string }) {
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
        {listing.status === "SOLD" && (
          <Badge className="absolute left-2 top-2 bg-foreground text-background">Sold</Badge>
        )}
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
