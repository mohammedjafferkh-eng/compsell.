import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Cpu, Recycle, Users } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { DEFAULT_ABOUT, useSiteSettings } from "@/lib/site-settings";

export const Route = createFileRoute("/about")({
  head: () => ({ meta: [{ title: "About compsell — A second life for electronics" }, { name: "description", content: "Meet the student electronics exchange built around buying, selling and reusing components and projects." }, { property: "og:title", content: "About compsell — A second life for electronics" }, { property: "og:description", content: "From one workbench to the next: the idea behind compsell." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: About,
});
function About() {
  const { data } = useSiteSettings();
  return <AppShell><section className="py-10 sm:py-16"><p className="font-mono text-xs uppercase text-primary">About / compsell</p><h1 className="mt-5 max-w-2xl text-4xl font-bold leading-tight sm:text-5xl">Good electronics.<br /><span className="text-primary">Not the end of the story.</span></h1><p className="mt-7 max-w-2xl whitespace-pre-line text-lg leading-relaxed text-muted-foreground">{data?.about_text || DEFAULT_ABOUT}</p></section><section className="grid gap-8 border-y border-border py-10 sm:grid-cols-3">{[{Icon: Cpu, title: "More making", text: "Find the part that brings your next idea to life."}, {Icon: Users, title: "Closer connections", text: "Connect with students and makers around your campus."}, {Icon: Recycle, title: "Less waste", text: "Keep useful components in projects, not in drawers."}].map(({Icon,title,text}) => <div key={title}><Icon className="size-6 text-primary" /><h2 className="mt-4 text-xl font-semibold">{title}</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p></div>)}</section><div className="flex flex-wrap gap-3 py-10"><Button asChild><Link to="/explore" search={{ q: "" }}>Find your next component <ArrowRight className="size-4" /></Link></Button><Button asChild variant="outline"><Link to="/founder">Meet the founder</Link></Button></div></AppShell>;
}