import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { ListingForm, type ListingFormValues } from "@/components/ListingForm";
import { supabase } from "@/integrations/supabase/client";
import { uploadImage } from "@/lib/storage";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/lib/queries";

export const Route = createFileRoute("/sell")({
  head: () => ({
    meta: [
      { title: "Sell a component — compsell" },
      {
        name: "description",
        content:
          "List your spare boards, sensors or modules on compsell in a minute: photos, price in rupees, quantity and pickup campus.",
      },
      { property: "og:title", content: "Sell a component — compsell" },
      {
        property: "og:description",
        content: "List your spare boards, sensors or modules on compsell in a minute.",
      },
    ],
  }),
  component: SellPage,
});

function SellPage() {
  return (
    <AppShell>
      <h1 className="text-xl font-bold">Sell a component</h1>
      <p className="mb-5 mt-1 text-sm text-muted-foreground">
        Add up to 5 photos so buyers know exactly what they're getting.
      </p>
      <RequireAuth title="Sign in to list a component">
        <SellForm />
      </RequireAuth>
    </AppShell>
  );
}

function SellForm() {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [values, setValues] = useState<ListingFormValues>({
    title: "",
    category: "",
    condition: "",
    price: "",
    quantity: "1",
    description: "",
    city: "",
    campus: "",
    is_project: false,
    components_used: "",
    includes_code: false,
    includes_report: false,
    includes_hardware: false,
  });

  const filled = {
    ...values,
    city: values.city || profile?.city || "",
    campus: values.campus || profile?.campus || "",
  };

  async function submit() {
    if (!user) return;
    if (!filled.category || !filled.condition) {
      toast.error("Pick a category and condition");
      return;
    }
    setBusy(true);
    try {
      const { data: listing, error } = await supabase
        .from("listings")
        .insert({
          seller_id: user.id,
          title: filled.title.trim(),
          category: filled.category,
          condition: filled.condition,
          price: Number(filled.price) || 0,
          quantity: Math.max(1, Number(filled.quantity) || 1),
          description: filled.description.trim() || null,
          city: filled.city || null,
          campus: filled.campus || null,
          is_project: filled.is_project,
          components_used: filled.components_used.trim() || null,
          includes_code: filled.includes_code,
          includes_report: filled.includes_report,
          includes_hardware: filled.includes_hardware,
        })
        .select("id")
        .single();
      if (error) throw error;

      if (files.length) {
        const paths = await Promise.all(
          files.map((f) => uploadImage("listing-images", user.id, f, `${listing.id}-`)),
        );
        const { error: imgErr } = await supabase.from("listing_images").insert(
          paths.map((p, i) => ({ listing_id: listing.id, image_url: p, sort_order: i })),
        );
        if (imgErr) throw imgErr;
      }

      qc.invalidateQueries({ queryKey: ["listings"] });
      toast.success("Listing published");
      navigate({ to: "/listing/$id", params: { id: listing.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not publish listing");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ListingForm
      values={filled}
      onChange={setValues}
      files={files}
      onFilesChange={setFiles}
      onSubmit={submit}
      submitting={busy}
      submitLabel="Publish listing"
    />
  );
}
