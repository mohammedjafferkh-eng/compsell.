import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Minus, Pencil, Trash2, CheckCircle2, HandCoins, ShieldAlert, Check, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { EmptyState } from "@/components/EmptyState";
import { ListingThumb } from "@/components/ListingCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { useOwnerRole, LISTING_SELECT } from "@/lib/queries";
import { rupees, timeAgo } from "@/lib/marketplace";

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

type OfferRow = {
  id: string;
  listing_id: string;
  buyer_id: string;
  amount: number | string;
  counter_amount: number | string | null;
  status: string;
  created_at: string;
  listings?: { title: string } | null;
};

type ReportRow = {
  id: string;
  listing_id: string;
  reporter_id: string;
  reason: string;
  created_at: string;
  listings?: { title: string } | null;
};

function MyListings() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const roleQ = useOwnerRole(user?.id);
  const isOwner = !!roleQ.data;

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
        <TabsTrigger value="offers" className="flex-1">
          Offers
        </TabsTrigger>
        {isOwner && (
          <TabsTrigger value="reports" className="flex-1">
            Reports
          </TabsTrigger>
        )}
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

      <TabsContent value="offers" className="mt-4">
        <OffersTab />
      </TabsContent>

      {isOwner && (
        <TabsContent value="reports" className="mt-4">
          <ReportsTab />
        </TabsContent>
      )}
    </Tabs>
  );
}

function OffersTab() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [counterValue, setCounterValue] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const offersQ = useQuery({
    queryKey: ["my-offers", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listing_offers")
        .select("*,listings(title)")
        .eq("seller_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as OfferRow[];
    },
  });

  const buyersQ = useQuery({
    queryKey: ["offer-buyers", user?.id],
    enabled: (offersQ.data ?? []).length > 0,
    queryFn: async () => {
      const ids = [...new Set((offersQ.data ?? []).map((o) => o.buyer_id))];
      const { data, error } = await supabase
        .from("profiles")
        .select("id,name")
        .in("id", ids);
      if (error) throw error;
      return new Map((data ?? []).map((p) => [p.id, p.name]));
    },
  });

  if (offersQ.isLoading) return <Skeleton className="h-40 w-full rounded-2xl" />;

  const offers = offersQ.data ?? [];
  if (offers.length === 0) {
    return <EmptyState title="No offers yet" description="When buyers make an offer on your listings it shows up here." />;
  }

  const notify = (offerId: string, message: string) =>
    user
      ? supabase.rpc("offer_notify", { p_offer_id: offerId, p_sender: user.id, p_message: message })
      : Promise.resolve({ error: null });

  async function act(offer: OfferRow, action: "ACCEPTED" | "COUNTERED" | "DECLINED", counter?: number) {
    setBusyId(offer.id);
    try {
      const patch: Record<string, unknown> = { status: action, updated_at: new Date().toISOString() };
      if (action === "COUNTERED") patch.counter_amount = counter;
      const { error } = await supabase.from("listing_offers").update(patch).eq("id", offer.id);
      if (error) throw error;
      const title = offer.listings?.title ?? "your listing";
      const text =
        action === "ACCEPTED"
          ? `Your offer of ${rupees(Number(offer.amount))} for "${title}" was accepted — chat here to finish the deal.`
          : action === "COUNTERED"
            ? `Counter offer: ${rupees(counter ?? 0)} for "${title}".`
            : `Your offer of ${rupees(Number(offer.amount))} for "${title}" was declined.`;
      await notify(offer.id, text);
      qc.invalidateQueries({ queryKey: ["my-offers", user?.id] });
      qc.invalidateQueries({ queryKey: ["offers", offer.listing_id] });
      toast.success(
        action === "ACCEPTED" ? "Offer accepted" : action === "COUNTERED" ? "Counter offer sent" : "Offer declined",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update offer");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-3">
      {offers.map((offer) => {
        const buyerName = buyersQ.data?.get(offer.buyer_id) ?? "Buyer";
        return (
          <div key={offer.id} className="rounded-2xl border border-border bg-card p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{offer.listings?.title ?? "Listing"}</p>
                <p className="text-xs text-muted-foreground">
                  {buyerName} offered {rupees(Number(offer.amount))} · {timeAgo(offer.created_at)}
                </p>
              </div>
              <Badge
                variant={offer.status === "PENDING" ? "secondary" : "outline"}
                className={offer.status === "ACCEPTED" ? "text-primary" : undefined}
              >
                {offer.status.charAt(0) + offer.status.slice(1).toLowerCase()}
              </Badge>
            </div>
            {offer.status === "PENDING" && (
              <div className="mt-3 space-y-2">
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => act(offer, "ACCEPTED")} disabled={busyId === offer.id}>
                    <Check className="size-3.5" /> Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const v = Number(counterValue[offer.id]);
                      if (!v || v <= 0) {
                        toast.error("Enter your counter price first");
                        return;
                      }
                      act(offer, "COUNTERED", v);
                    }}
                    disabled={busyId === offer.id}
                  >
                    <HandCoins className="size-3.5" /> Counter
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => act(offer, "DECLINED")}
                    disabled={busyId === offer.id}
                  >
                    <X className="size-3.5" /> Decline
                  </Button>
                </div>
                <div className="relative w-40">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">₹</span>
                  <Input
                    inputMode="numeric"
                    className="h-9 pl-6"
                    placeholder="Counter price"
                    value={counterValue[offer.id] ?? ""}
                    onChange={(e) =>
                      setCounterValue({ ...counterValue, [offer.id]: e.target.value.replace(/[^\d.]/g, "") })
                    }
                  />
                </div>
              </div>
            )}
            {offer.status === "COUNTERED" && offer.counter_amount != null && (
              <p className="mt-2 text-xs text-muted-foreground">
                You countered at {rupees(Number(offer.counter_amount))} — waiting for the buyer.
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ReportsTab() {
  const qc = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);

  const reportsQ = useQuery({
    queryKey: ["listing-reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listing_reports")
        .select("*,listings(title)")
        .eq("resolved", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ReportRow[];
    },
  });

  if (reportsQ.isLoading) return <Skeleton className="h-40 w-full rounded-2xl" />;

  const reports = reportsQ.data ?? [];
  if (reports.length === 0) {
    return <EmptyState title="No open reports" description="Reported listings from users will appear here." />;
  }

  async function markHandled(id: string) {
    setBusyId(id);
    const { error } = await supabase.from("listing_reports").update({ resolved: true }).eq("id", id);
    setBusyId(null);
    if (error) {
      toast.error(error.message);
      return undefined;
    }
    qc.invalidateQueries({ queryKey: ["listing-reports"] });
    toast.success("Report handled");
    return undefined;
  }

  async function deleteListing(report: ReportRow) {
    setBusyId(report.id);
    try {
      const { data: imgs } = await supabase
        .from("listing_images")
        .select("image_url")
        .eq("listing_id", report.listing_id);
      const paths = (imgs ?? []).map((i) => i.image_url);
      if (paths.length) await supabase.storage.from("listing-images").remove(paths);
      const { error } = await supabase.from("listings").delete().eq("id", report.listing_id);
      if (error) throw error;
      await supabase.from("listing_reports").update({ resolved: true }).eq("id", report.id);
      qc.invalidateQueries({ queryKey: ["listing-reports"] });
      qc.invalidateQueries({ queryKey: ["listings"] });
      toast.success("Listing deleted and report handled");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete listing");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-3">
      {reports.map((report) => (
        <div key={report.id} className="rounded-2xl border border-destructive/30 bg-destructive/5 p-3">
          <div className="flex items-start gap-2">
            <ShieldAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
            <div className="min-w-0">
              <Link
                to="/listing/$id"
                params={{ id: report.listing_id }}
                className="truncate text-sm font-medium underline-offset-2 hover:underline"
              >
                {report.listings?.title ?? "Listing"}
              </Link>
              <p className="mt-1 text-sm">{report.reason}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">Reported {timeAgo(report.created_at)}</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="destructive"
              onClick={() => deleteListing(report)}
              disabled={busyId === report.id}
            >
              <Trash2 className="size-3.5" /> Delete listing
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => markHandled(report.id)}
              disabled={busyId === report.id}
            >
              <CheckCircle2 className="size-3.5" /> Mark handled
            </Button>
          </div>
        </div>
      ))}
    </div>
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
