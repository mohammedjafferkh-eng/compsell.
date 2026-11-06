import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Bot, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { writeListing } from "@/lib/ai.functions";
import { rupees } from "@/lib/marketplace";

export type AiDraft = {
  title: string;
  description: string;
  category: string;
  condition: string;
  price: number;
  priceReason: string;
};

export function AiListingWriter({
  isProject,
  onApply,
}: {
  isProject: boolean;
  onApply: (d: AiDraft) => void;
}) {
  const run = useServerFn(writeListing);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<AiDraft | null>(null);

  async function go() {
    setBusy(true);
    try {
      const d = await run({ data: { notes, isProject } });
      setLast(d);
      onApply(d);
      toast.success("Listing filled in — check and edit before publishing");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI could not write this");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="circuit mb-5 rounded-2xl border border-primary/30 bg-primary/5 p-3">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <span className="grid size-7 place-items-center rounded-lg bg-primary text-primary-foreground">
          <Bot className="size-4" />
        </span>
        AI listing writer
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Type a quick note — the AI writes the title, description and suggests a fair price.
      </p>
      <Textarea
        className="mt-2 bg-card"
        rows={2}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="esp32 used 6 months, works fine, with usb cable"
        aria-label="Notes for the AI listing writer"
      />
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          {last && last.price > 0 ? `Suggested ${rupees(last.price)} · ${last.priceReason}` : ""}
        </span>
        <Button type="button" size="sm" onClick={go} disabled={busy || notes.trim().length < 3}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Bot className="size-4" />}
          {busy ? "Writing..." : "Write it for me"}
        </Button>
      </div>
    </div>
  );
}
