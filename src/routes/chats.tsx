import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { EmptyState } from "@/components/EmptyState";
import { ListingThumb } from "@/components/ListingCard";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { rupees, timeAgo } from "@/lib/marketplace";

export const Route = createFileRoute("/chats")({
  head: () => ({
    meta: [
      { title: "Chats — compsell" },
      { name: "description", content: "Your buyer and seller conversations about components on compsell." },
      { property: "og:title", content: "Chats — compsell" },
      { property: "og:description", content: "Your compsell buyer and seller conversations." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ChatsPage,
});

function ChatsPage() {
  return (
    <AppShell>
      <h1 className="mb-4 text-xl font-bold">Chats</h1>
      <RequireAuth title="Sign in to see your chats">
        <ChatList />
      </RequireAuth>
    </AppShell>
  );
}

function ChatList() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["conversations", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select(
          "id,created_at,buyer_id,seller_id,listings(id,title,price,listing_images(image_url,sort_order)),messages(message,created_at)",
        )
        .or(`buyer_id.eq.${user!.id},seller_id.eq.${user!.id}`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  if (isLoading) return <Skeleton className="h-32 w-full rounded-2xl" />;
  if ((data ?? []).length === 0)
    return (
      <EmptyState
        title="No conversations yet"
        description="Message a seller from any listing and it will show up here."
      />
    );

  return (
    <div className="space-y-2">
      {(data ?? []).map((c) => {
        const listing = c.listings as {
          title: string;
          price: number | string;
          listing_images?: { image_url: string; sort_order: number }[];
        } | null;
        const msgs = [...((c.messages as { message: string; created_at: string }[]) ?? [])].sort(
          (a, b) => +new Date(b.created_at) - +new Date(a.created_at),
        );
        const last = msgs[0];
        const cover = [...(listing?.listing_images ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0];
        return (
          <Link
            key={c.id}
            to="/chat/$id"
            params={{ id: c.id }}
            className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-card"
          >
            <div className="w-14 shrink-0">
              <ListingThumb path={cover?.image_url} alt={listing?.title ?? "Listing"} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-sm font-medium">{listing?.title ?? "Listing"}</span>
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  {timeAgo(last?.created_at ?? c.created_at)}
                </span>
              </div>
              <p className="truncate text-xs text-muted-foreground">
                {last?.message ?? "No messages yet"}
              </p>
              {listing && <span className="price text-xs">{rupees(listing.price)}</span>}
            </div>
            <span className="text-[11px] text-muted-foreground">
              {c.seller_id === user?.id ? "Selling" : "Buying"}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
