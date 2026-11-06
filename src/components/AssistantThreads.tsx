import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { timeAgo } from "@/lib/marketplace";

const STARTERS = [
  "Which sensor should I use for a line-follower robot?",
  "What's a fair price for a used Arduino Uno?",
  "Find me a cheap ESP32 on compsell",
  "Project ideas for a 2nd-year ECE mini project",
];

export function useCreateThread() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  return async (firstMessage?: string) => {
    if (!user) return undefined;
    const { data, error } = await supabase
      .from("ai_threads")
      .insert({ user_id: user.id })
      .select("id")
      .single();
    if (error) {
      toast.error(error.message);
      return undefined;
    }
    qc.invalidateQueries({ queryKey: ["ai-threads"] });
    navigate({
      to: "/assistant/$threadId",
      params: { threadId: data.id },
      search: firstMessage ? { q: firstMessage } : {},
    });
    return undefined;
  };
}

export function ThreadList() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const create = useCreateThread();
  const { data, isLoading } = useQuery({
    queryKey: ["ai-threads", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_threads")
        .select("id,title,updated_at")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  async function remove(id: string) {
    const { error } = await supabase.from("ai_threads").delete().eq("id", id);
    if (error) toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["ai-threads"] });
  }

  return (
    <div>
      <div className="circuit rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Bot className="size-6" />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-lg font-bold">compsell AI</h1>
            <p className="text-xs text-muted-foreground">
              Your electronics buddy — picks parts, prices listings, finds deals on campus.
            </p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {STARTERS.map((s) => (
            <button
              key={s}
              onClick={() => create(s)}
              className="rounded-full border border-border bg-background px-3 py-1.5 text-left text-xs hover:border-primary"
            >
              {s}
            </button>
          ))}
        </div>
        <Button className="mt-3 w-full" onClick={() => create()}>
          <Plus className="size-4" /> New chat
        </Button>
      </div>

      <h2 className="mb-2 mt-5 text-sm font-semibold">Your chats</h2>
      {isLoading ? (
        <Skeleton className="h-24 w-full rounded-2xl" />
      ) : (data ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">No chats yet — start one above.</p>
      ) : (
        <div className="space-y-2">
          {(data ?? []).map((t) => (
            <div key={t.id} className="flex items-center gap-2 rounded-2xl border border-border bg-card p-3">
              <Link
                to="/assistant/$threadId"
                params={{ threadId: t.id }}
                className="min-w-0 flex-1"
              >
                <div className="truncate text-sm font-medium">{t.title}</div>
                <div className="text-[11px] text-muted-foreground">{timeAgo(t.updated_at)}</div>
              </Link>
              <button
                onClick={() => remove(t.id)}
                aria-label={`Delete chat ${t.title}`}
                className="p-1 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
