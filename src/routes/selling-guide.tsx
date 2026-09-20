import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Calculator, Camera, MessageCircle, PackageCheck, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { rupees } from "@/lib/marketplace";

export const Route = createFileRoute("/selling-guide")({
  validateSearch: (search: Record<string, unknown>) => ({
    tab: search["tab"] === "how" ? "how" : "calculator",
  }),
  head: () => ({
    meta: [
      { title: "Selling calculator and guide — compsell" },
      {
        name: "description",
        content: "Estimate a fair selling price and learn how buying and selling electronics works on compsell.",
      },
      { property: "og:title", content: "Selling calculator and guide — compsell" },
      {
        property: "og:description",
        content: "Estimate a fair electronics resale price and learn the compsell process.",
      },
    ],
  }),
  component: SellingGuide,
});

function SellingGuide() {
  const { tab } = Route.useSearch();
  const [original, setOriginal] = useState("500");
  const [age, setAge] = useState("12");
  const [condition, setCondition] = useState("85");

  const estimate = useMemo(() => {
    const price = Math.max(0, Number(original) || 0);
    const months = Math.max(0, Number(age) || 0);
    const quality = Math.min(100, Math.max(20, Number(condition) || 0));
    const ageFactor = Math.max(0.35, 1 - months * 0.018);
    return Math.round(price * ageFactor * (quality / 100) / 10) * 10;
  }, [original, age, condition]);

  return (
    <AppShell>
      <h1 className="text-xl font-bold">Selling help</h1>
      <p className="mt-1 text-sm text-muted-foreground">Price fairly, describe honestly, and arrange a safe pickup.</p>

      <Tabs defaultValue={tab} className="mt-5">
        <TabsList className="w-full">
          <TabsTrigger value="calculator" className="flex-1">Calculator</TabsTrigger>
          <TabsTrigger value="how" className="flex-1">How it works</TabsTrigger>
        </TabsList>

        <TabsContent value="calculator" className="mt-4">
          <div className="circuit rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 font-semibold">
              <Calculator className="size-5 text-primary" /> Suggested selling price
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="original">Original price (₹)</Label>
                <Input id="original" inputMode="numeric" value={original} onChange={(e) => setOriginal(e.target.value.replace(/\D/g, ""))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="age">Age in months</Label>
                <Input id="age" inputMode="numeric" value={age} onChange={(e) => setAge(e.target.value.replace(/\D/g, ""))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="condition">Condition (%)</Label>
                <Input id="condition" inputMode="numeric" value={condition} onChange={(e) => setCondition(e.target.value.replace(/\D/g, ""))} />
              </div>
            </div>
            <div className="mt-5 border-t border-border pt-4">
              <p className="text-xs uppercase text-muted-foreground">Suggested range</p>
              <p className="price mt-1 text-3xl">{rupees(Math.round(estimate * 0.9))} – {rupees(Math.round(estimate * 1.1))}</p>
              <p className="mt-2 text-xs text-muted-foreground">This is a guide, not a guaranteed sale price. Rarity, demand, damage, and missing parts may change the value.</p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="how" className="mt-4 space-y-3">
          <Step icon={Camera} number="1" title="Create an honest listing" text="Add clear photos, working condition, quantity, price, and your pickup area." />
          <Step icon={MessageCircle} number="2" title="Chat with a buyer" text="Answer questions and agree on the final price, pickup point, and time." />
          <Step icon={ShieldCheck} number="3" title="Meet safely" text="Use a public campus or city location. Test the component before completing payment." />
          <Step icon={PackageCheck} number="4" title="Update your stock" text="Tap Sold one after each sale. At zero quantity, compsell marks the listing Sold automatically." />
          <div className="rounded-2xl border border-border bg-secondary p-4 text-sm">
            Payments and delivery are arranged directly between buyer and seller. Never share OTPs or account passwords.
          </div>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

function Step({ icon: Icon, number, title, text }: { icon: typeof Camera; number: string; title: string; text: string }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-border bg-card p-4">
      <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
        <Icon className="size-4" />
      </div>
      <div>
        <p className="text-xs font-semibold text-primary">STEP {number}</p>
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}