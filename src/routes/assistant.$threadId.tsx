import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, Bot, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { askAssistant } from "@/lib/ai.functions";

export const Route = createFileRoute("/assistant/$threadId")({
  validateSearch: (s: Record<string, unknown>) => ({
    q: typeof s["q"] === "string" ? s["q"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Chat — compsell AI" },
      { name: "description", content: "Your conversation with compsell AI." },
      { property: "og:title", content: "Chat — compsell AI" },
      { property: "og:description", content: "Your conversation with compsell AI." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ThreadPage,
});

type Msg = { id: string; role: string; content: string };

function ThreadPage() {
  const { threadId } = Route.useParams();
  const { q } = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const ask = useServerFn(askAssistant);
  const [text, setText] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const sentStarter = useRef(false);

  const threadQ = useQuery({
    queryKey: ["ai-thread", threadId],
    queryFn: async () => {
      const { data, error } = await supabase.from("ai_threads").select("id,title").eq("id", threadId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const msgsQ = useQuery({
    queryKey: ["ai-messages", threadId],
    queryFn: async (): Promise<Msg[]> => {
      const { data, error } = await supabase
        .from("ai_messages")
        .select("id,role,content")
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  async function send(body: string) {
    const msg = body.trim();
    if (!msg || pending) return undefined;
    setPending(msg);
    setText("");
    try {
      await ask({ data: { threadId, message: msg } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "compsell AI could not answer");
      setText(msg);
    } finally {
      await qc.invalidateQueries({ queryKey: ["ai-messages", threadId] });
      qc.invalidateQueries({ queryKey: ["ai-thread", threadId] });
      qc.invalidateQueries({ queryKey: ["ai-threads"] });
      setPending(null);
      inputRef.current?.focus();
    }
    return undefined;
  }

  useEffect(() => {
    if (q && !sentStarter.current && msgsQ.data && msgsQ.data.length === 0) {
      sentStarter.current = true;
      navigate({ to: "/assistant/$threadId", params: { threadId }, search: {}, replace: true });
      send(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, msgsQ.data]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [msgsQ.data, pending]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [threadId]);

  if (threadQ.isLoading) return <Skeleton className="h-64 w-full rounded-2xl" />;
  if (!threadQ.data)
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        Chat not found. <Link to="/assistant" className="text-primary underline">Back to chats</Link>
      </p>
    );

  const msgs = msgsQ.data ?? [];

  return (
    <div className="flex min-h-[calc(100vh-7rem)] flex-col">
      <div className="flex items-center gap-2 pb-3">
        <button onClick={() => navigate({ to: "/assistant" })} aria-label="Back to AI chats">
          <ArrowLeft className="size-5" />
        </button>
        <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
          <Bot className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate font-display font-semibold">{threadQ.data.title}</div>
          <div className="text-[11px] text-muted-foreground">compsell AI</div>
        </div>
      </div>

      <div className="flex-1 space-y-3 py-3">
        {msgs.length === 0 && !pending && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Ask about parts, prices, project ideas or listings on compsell.
          </p>
        )}
        {msgs.map((m) => (
          <Bubble key={m.id} role={m.role} content={m.content} />
        ))}
        {pending && (
          <>
            <Bubble role="user" content={pending} />
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Bot className="size-4 text-primary" />
              <span className="animate-pulse">compsell AI is thinking...</span>
            </div>
          </>
        )}
        <div ref={endRef} />
      </div>

      <form
        className="sticky bottom-0 flex items-end gap-2 border-t border-border bg-background py-3"
        onSubmit={(e) => {
          e.preventDefault();
          send(text);
        }}
      >
        <Textarea
          ref={inputRef}
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(text);
            }
          }}
          placeholder="Ask compsell AI..."
          aria-label="Message compsell AI"
          className="max-h-32 min-h-10 resize-none"
        />
        <Button type="submit" disabled={!!pending || !text.trim()} aria-label="Send">
          <Send className="size-4" />
        </Button>
      </form>
    </div>
  );
}

function Bubble({ role, content }: { role: string; content: string }) {
  if (role === "user")
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm text-primary-foreground">
          {content}
        </div>
      </div>
    );
  return (
    <div className="flex gap-2">
      <Bot className="mt-1 size-4 shrink-0 text-primary" />
      <div className="ai-md min-w-0 flex-1 text-sm leading-relaxed">
        <ReactMarkdown
          components={{
            a: ({ href, children }) =>
              href?.startsWith("/") ? (
                <a href={href} className="font-medium text-primary underline">{children}</a>
              ) : (
                <a href={href} target="_blank" rel="noreferrer" className="text-primary underline">{children}</a>
              ),
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
}
