import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Minus, Pencil, Trash2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { EmptyState } from "@/components/EmptyState";
import { ListingThumb } from "@/components/ListingCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { LISTING_SELECT } from "@/lib/queries";
import { rupees } from "@/lib/marketplace";

export const Route = createFileRoute("/my-listings")({
  head: () => ({
    meta: [
      { title: "My listings — compsell" },
      {
        name: "description",
        content: "Manage your compsell listings: edit details, reduce stock, mark sold or delete.",
      },
      { property: "og:title", content: "My listings — compsell" },
      { property: "og:description", content: "Manage your compsell listings and stock." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MyListingsPage,
});

function MyListingsPage() {
  return (
    <AppShell>
      <h1 className="mb-4 text-xl font-bold">My listings</h1>
      <RequireAuth title="Sign in to see your listings">
        <MyListings />
      </RequireAuth>
    </AppShell>
  );
}

type Row = {
  id: string;
  title: string;
  price: number | string;
  quantity: number;
  status: string;
  listing_images?: { image_url: string; sort_order: number }[];
};

function MyListings() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["my-listings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select(LISTING_SELECT)
        .eq("seller_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["my-listings"] });
    qc.invalidateQueries({ queryKey: ["listings"] });
  };

  async function setQuantity(row: Row, qty: number) {
    const { error } = await supabase
      .from("listings")
      .update({ quantity: Math.max(0, qty) })
      .eq("id", row.id);
    if (error) {
      toast.error(error.message);
      return undefined;
    }
    toast.success(qty <= 0 ? "Marked as sold" : `Stock updated to ${qty}`);
    refresh();
    return undefined;
  }

  async function markSold(row: Row) {
    const { error } = await supabase
      .from("listings")
      .update({ quantity: 0, status: "SOLD" })
      .eq("id", row.id);
    if (error) {
      toast.error(error.message);
      return undefined;
    }
    toast.success("Marked as sold");
    refresh();
    return undefined;
  }

  async function remove(row: Row) {
    const { error } = await supabase.from("listings").delete().eq("id", row.id);
    if (error) {
      toast.error(error.message);
      return undefined;
    }
    toast.success("Listing deleted");
    refresh();
    return undefined;
  }

  if (isLoading) return <Skeleton className="h-40 w-full rounded-2xl" />;

  const rows = (data ?? []) as Row[];
  const active = rows.filter((r) => r.status === "ACTIVE");
  const sold = rows.filter((r) => r.status === "SOLD");

  return (
    <Tabs defaultValue="active">
      <TabsList className="w-full">
        <TabsTrigger value="active" className="flex-1">
          Active ({active.length})
        </TabsTrigger>
        <TabsTrigger value="sold" className="flex-1">
          Sold ({sold.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="active" className="mt-4 space-y-3">
        {active.length === 0 ? (
          <EmptyState
            title="No active listings"
            description="List a spare component and buyers nearby will see it."
            action={
              <Button asChild>
                <Link to="/sell">Sell a Component</Link>
              </Button>
            }
          />
        ) : (
          active.map((row) => (
            <RowCard
              key={row.id}
              row={row}
              onDecrement={() => setQuantity(row, row.quantity - 1)}
              onMarkSold={() => markSold(row)}
              onDelete={() => remove(row)}
            />
          ))
        )}
      </TabsContent>

      <TabsContent value="sold" className="mt-4 space-y-3">
        {sold.length === 0 ? (
          <EmptyState title="Nothing sold yet" />
        ) : (
          sold.map((row) => (
            <RowCard key={row.id} row={row} onRestock={() => setQuantity(row, 1)} onDelete={() => remove(row)} />
          ))
        )}
      </TabsContent>
    </Tabs>
  );
}

function RowCard({
  row,
  onDecrement,
  onMarkSold,
  onDelete,
  onRestock,
}: {
  row: Row;
  onDecrement?: () => void;
  onMarkSold?: () => void;
  onDelete: () => void;
  onRestock?: () => void;
}) {
  const cover = [...(row.listing_images ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0];
  return (
    <div className="rounded-2xl border border-border bg-card p-3 shadow-card">
      <div className="flex gap-3">
        <div className="w-20 shrink-0">
          <ListingThumb path={cover?.image_url} alt={row.title} />
        </div>
        <div className="min-w-0 flex-1">
          <Link to="/listing/$id" params={{ id: row.id }} className="line-clamp-2 text-sm font-medium">
            {row.title}
          </Link>
          <div className="mt-1 flex items-center gap-2">
            <span className="price text-sm">{rupees(row.price)}</span>
            <Badge variant={row.status === "SOLD" ? "default" : "secondary"} className="text-[10px]">
              {row.status === "SOLD" ? "Sold" : `${row.quantity} in stock`}
            </Badge>
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {onDecrement && (
          <Button size="sm" variant="outline" onClick={onDecrement}>
            <Minus className="size-3.5" /> Sold one
          </Button>
        )}
        {onMarkSold && (
          <Button size="sm" variant="outline" onClick={onMarkSold}>
            <CheckCircle2 className="size-3.5" /> Mark as sold
          </Button>
        )}
        {onRestock && (
          <Button size="sm" variant="outline" onClick={onRestock}>
            Relist
          </Button>
        )}
        <Button size="sm" variant="outline" asChild>
          <Link to="/listing/$id/edit" params={{ id: row.id }}>
            <Pencil className="size-3.5" /> Edit
          </Link>
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="ghost" className="text-destructive">
              <Trash2 className="size-3.5" /> Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this listing?</AlertDialogTitle>
              <AlertDialogDescription>
                This removes the listing and its photos permanently.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
