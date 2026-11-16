import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Cpu, Recycle } from "lucide-react";

const PARTS = ["ESP32", "Arduino", "Sensors", "Resistors", "Scientific calculators", "Motors", "Raspberry Pi", "Completed projects"];
export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border">
      <div className="overflow-hidden border-b border-border bg-primary py-5 text-primary-foreground" aria-label="Electronics on compsell">
        <div className="component-ticker flex w-max items-center">
          {[0, 1].map((copy) => <div key={copy} aria-hidden={copy === 1} className="flex shrink-0 items-center">{PARTS.map((name) => <span key={name} className="flex items-center gap-7 pr-7 font-display text-lg font-medium"><Cpu className="size-5 opacity-60" />{name}</span>)}</div>)}
        </div>
      </div>
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 sm:grid-cols-[2fr_1fr_1fr] lg:px-8">
        <div><Link to="/" className="font-display text-3xl font-bold">compsell<span className="text-primary">.</span></Link><p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">Buy. Sell. Reuse Electronics.<br />Less waste. More making.</p><div className="mt-5 flex items-center gap-2 text-xs text-muted-foreground"><Recycle className="size-4 text-primary" /> Built around a second life.</div></div>
        <div><h2 className="mb-4 font-mono text-xs uppercase text-muted-foreground">Marketplace</h2><div className="flex flex-col items-start gap-3 text-sm"><Link to="/explore" className="hover:text-primary">Explore components</Link><Link to="/projects" className="hover:text-primary">Completed projects</Link><Link to="/sell" className="hover:text-primary">Sell a component <ArrowUpRight className="inline size-3.5" /></Link></div></div>
        <div><h2 className="mb-4 font-mono text-xs uppercase text-muted-foreground">The people behind it</h2><div className="flex flex-col items-start gap-3 text-sm"><Link to="/about" className="hover:text-primary">About compsell</Link><Link to="/founder" className="hover:text-primary">Meet the founder</Link><Link to="/selling-guide" search={{ tab: "how" }} className="hover:text-primary">How it works</Link></div></div>
      </div>
      <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-3 border-t border-border px-5 py-5 text-xs text-muted-foreground lg:px-8"><span>© compsell · Made for makers.</span><span>From one workbench to the next.</span></div>
    </footer>
  );
}