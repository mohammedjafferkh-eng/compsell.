import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { ListingForm, type ListingFormValues } from "@/components/ListingForm";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { uploadImage } from "@/lib/storage";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/listing/$id/edit")({
  head: () => ({
    meta: [
      { title: "Edit listing — compsell" },
      { name: "description", content: "Update photos, price, quantity and details of your listing." },
      { property: "og:title", content: "Edit listing — compsell" },
      { property: "og:description", content: "Update your compsell listing details." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EditPage,
});

function EditPage() {
  return (
    <AppShell>
      <h1 className="mb-5 text-xl font-bold">Edit listing</h1>
      <RequireAuth title="Sign in to edit your listing">
        <EditForm />
      </RequireAuth>
    </AppShell>
  );
}

function EditForm() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [values, setValues] = useState<ListingFormValues | null>(null);

  const listingQ = useQuery({
    queryKey: ["listing-edit", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select("*,listing_images(id,image_url,sort_order)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const listing = listingQ.data;

  useEffect(() => {
    if (listing && !values) {
      setValues({
        title: listing.title,
        category: listing.category,
        condition: listing.condition,
        price: String(listing.price),
        quantity: String(listing.quantity),
        description: listing.description ?? "",
        city: listing.city ?? "",
        campus: listing.campus ?? "",
      });
    }
  }, [listing, values]);

  if (listingQ.isLoading || !values) return <Skeleton className="h-64 w-full rounded-2xl" />;
  if (!listing || listing.seller_id !== user?.id)
    return <EmptyState title="You can only edit your own listings" />;

  const images = [...(listing.listing_images ?? [])].sort((a, b) => a.sort_order - b.sort_order);

  async function removeImage(imageId: string) {
    const img = images.find((i) => i.id === imageId);
    await supabase.from("listing_images").delete().eq("id", imageId);
    if (img) await supabase.storage.from("listing-images").remove([img.image_url]);
    qc.invalidateQueries({ queryKey: ["listing-edit", id] });
    qc.invalidateQueries({ queryKey: ["listing", id] });
  }

  async function submit() {
    if (!user || !values) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from("listings")
        .update({
          title: values.title.trim(),
          category: values.category,
          condition: values.condition,
          price: Number(values.price) || 0,
          quantity: Math.max(0, Number(values.quantity) || 0),
          description: values.description.trim() || null,
          city: values.city || null,
          campus: values.campus || null,
        })
        .eq("id", id);
      if (error) throw error;

      if (files.length) {
        const paths = await Promise.all(
          files.map((f) => uploadImage("listing-images", user.id, f, `${id}-`)),
        );
        await supabase.from("listing_images").insert(
          paths.map((p, i) => ({
            listing_id: id,
            image_url: p,
            sort_order: images.length + i,
          })),
        );
      }

      qc.invalidateQueries({ queryKey: ["listings"] });
      qc.invalidateQueries({ queryKey: ["listing", id] });
      toast.success("Listing updated");
      navigate({ to: "/listing/$id", params: { id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update listing");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ListingForm
      values={values}
      onChange={setValues}
      existing={images.map((i) => ({ id: i.id, image_url: i.image_url }))}
      onRemoveExisting={removeImage}
      files={files}
      onFilesChange={setFiles}
      onSubmit={submit}
      submitting={busy}
      submitLabel="Save changes"
    />
  );
}
