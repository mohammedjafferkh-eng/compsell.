import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, UserRound, Settings2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useSiteSettings, useSiteEditor } from "@/lib/site-settings";
import { useSignedUrl } from "@/lib/storage";

export const Route = createFileRoute("/founder")({
  head: () => ({ meta: [{ title: "Meet the founder — compsell" }, { name: "description", content: "Meet Mohammed Jaffar kh, the founder behind compsell." }, { property: "og:title", content: "Meet the founder — compsell" }, { property: "og:description", content: "The person behind the student electronics exchange." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: Founder,
});
function Founder() {
  const { user } = useAuth();
  const { data } = useSiteSettings();
  const { data: allowed } = useSiteEditor(user?.id);
  const { data: photo } = useSignedUrl("site-branding", data?.founder_photo);
  return <AppShell><section className="py-10 sm:py-16"><div className="flex items-center justify-between gap-4"><p className="font-mono text-xs uppercase text-primary">02 / The founder</p>{allowed && <Button asChild variant="outline" size="sm"><Link to="/site-settings"><Settings2 className="size-4" /> Edit site</Link></Button>}</div><div className="mt-10 grid items-start gap-10 md:grid-cols-[1fr_1.5fr]"><div className="aspect-square max-w-sm overflow-hidden rounded-lg bg-secondary">{photo ? <img src={photo} alt={data?.founder_name || "Founder"} className="h-full w-full object-cover" /> : <div className="flex h-full flex-col items-center justify-center gap-5"><UserRound className="size-20 text-primary/50" /><span className="font-mono text-sm text-muted-foreground">The person behind compsell</span></div>}</div><div><p className="text-sm font-medium text-primary">Founder / compsell</p><h1 className="mt-3 break-words text-4xl font-bold leading-tight sm:text-5xl">{data?.founder_name || "Mohammed Jaffar kh"}</h1>{data?.founder_bio && <p className="mt-6 whitespace-pre-line text-lg leading-relaxed text-muted-foreground">{data.founder_bio}</p>}<p className="mt-6 text-sm text-muted-foreground">Buy. Sell. Reuse Electronics.</p><Button asChild variant="outline" className="mt-8"><Link to="/about">The idea behind compsell <ArrowUpRight className="size-4" /></Link></Button></div></div></section></AppShell>;
}