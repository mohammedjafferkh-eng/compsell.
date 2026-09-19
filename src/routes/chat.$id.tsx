import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Send } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { EmptyState } from "@/components/EmptyState";
import { ListingThumb } from "@/components/ListingCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile, type Profile } from "@/lib/queries";
import { rupees } from "@/lib/marketplace";

export const Route = createFileRoute("/chat/$id")({
  head: () => ({
    meta: [
      { title: "Conversation — compsell" },
      { name: "description", content: "Chat with the buyer or seller about this component listing." },
      { property: "og:title", content: "Conversation — compsell" },
      { property: "og:description", content: "Chat about this component listing on compsell." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ChatPage,
});

function ChatPage() {
  return (
    <AppShell hideNav>
      <RequireAuth title="Sign in to open this chat">
        <ChatRoom />
      </RequireAuth>
    </AppShell>
  );
}

function ChatRoom() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const convoQ = useQuery({
    queryKey: ["conversation", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select(
          "id,buyer_id,seller_id,listing_id,listings(id,title,price,quantity,status,listing_images(image_url,sort_order))",
        )
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const messagesQ = useQuery({
    queryKey: ["messages", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("id,sender_id,message,created_at")
        .eq("conversation_id", id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel(`messages-${id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${id}` },
        () => qc.invalidateQueries({ queryKey: ["messages", id] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, qc]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messagesQ.data]);

  const convo = convoQ.data;
  const otherId = convo ? (convo.buyer_id === user?.id ? convo.seller_id : convo.buyer_id) : undefined;
  const { data: otherProfile } = useProfile(otherId);
  const other = otherProfile as (Profile & { whatsapp?: string | null }) | null | undefined;

  async function send() {
    const body = text.trim();
    if (!body || !user) return;
    setSending(true);
    const { error } = await supabase
      .from("messages")
      .insert({ conversation_id: id, sender_id: user.id, message: body });
    setSending(false);
    if (error) return toast.error(error.message);
    setText("");
    qc.invalidateQueries({ queryKey: ["messages", id] });
    qc.invalidateQueries({ queryKey: ["conversations"] });
  }

  if (convoQ.isLoading) return <Skeleton className="h-64 w-full rounded-2xl" />;
  if (!convo) return <EmptyState title="Conversation not found" />;

  const listing = convo.listings as {
    id: string;
    title: string;
    price: number | string;
    quantity: number;
    status: string;
    listing_images?: { image_url: string; sort_order: number }[];
  } | null;
  const cover = [...(listing?.listing_images ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0];

  return (
    <div className="flex min-h-[calc(100vh-7rem)] flex-col">
      <div className="flex items-center gap-2 pb-3">
        <button onClick={() => navigate({ to: "/chats" })} aria-label="Back to chats">
          <ArrowLeft className="size-5" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="truncate font-display font-semibold">{other?.name ?? "Conversation"}</div>
          <div className="truncate text-xs text-muted-foreground">
            {other?.campus || other?.city || ""}
          </div>
        </div>
        {other?.whatsapp && (
          <Button asChild size="sm" variant="outline">
            <a
              href={`https://wa.me/${other.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(
                `Hi, about "${listing?.title ?? "your listing"}" on compsell`,
              )}`}
              target="_blank"
              rel="noreferrer"
            >
              WhatsApp
            </a>
          </Button>
        )}
      </div>

      {listing && (
        <Link
          to="/listing/$id"
          params={{ id: listing.id }}
          className="flex items-center gap-3 rounded-2xl border border-border bg-card p-2"
        >
          <div className="w-12 shrink-0">
            <ListingThumb path={cover?.image_url} alt={listing.title} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{listing.title}</div>
            <div className="price text-xs">{rupees(listing.price)}</div>
          </div>
          <span className="text-[11px] text-muted-foreground">
            {listing.status === "SOLD" ? "Sold" : `${listing.quantity} left`}
          </span>
        </Link>
      )}

      <div className="flex-1 space-y-2 py-4">
        {(messagesQ.data ?? []).length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Say hello and ask about pickup or price.
          </p>
        )}
        {(messagesQ.data ?? []).map((m) => {
          const mine = m.sender_id === user?.id;
          return (
            <div key={m.id} className={mine ? "flex justify-end" : "flex justify-start"}>
              <div
                className={
                  mine
                    ? "max-w-[80%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm text-primary-foreground"
                    : "max-w-[80%] rounded-2xl rounded-bl-sm bg-secondary px-3 py-2 text-sm text-secondary-foreground"
                }
              >
                {m.message}
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <form
        className="sticky bottom-0 flex gap-2 border-t border-border bg-background py-3"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Message..."
          aria-label="Message"
        />
        <Button type="submit" disabled={sending || !text.trim()} aria-label="Send">
          <Send className="size-4" />
        </Button>
      </form>
    </div>
  );
}
