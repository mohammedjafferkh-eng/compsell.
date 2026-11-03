import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { LogOut, Camera, Package, Heart } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { StarRating } from "@/components/StarRating";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile, type Profile } from "@/lib/queries";
import { uploadImage, useSignedUrl } from "@/lib/storage";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "My profile — compsell" },
      {
        name: "description",
        content: "Update your compsell name, photo, city, campus and WhatsApp number.",
      },
      { property: "og:title", content: "My profile — compsell" },
      { property: "og:description", content: "Update your compsell profile details." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  return (
    <AppShell>
      <h1 className="mb-4 text-xl font-bold">My profile</h1>
      <RequireAuth title="Sign in to view your profile">
        <AccountBody />
      </RequireAuth>
    </AppShell>
  );
}

function AccountBody() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: profile, isLoading } = useProfile(user?.id);
  const p = profile as (Profile & { whatsapp?: string | null }) | null | undefined;

  const [form, setForm] = useState({ name: "", city: "", campus: "", whatsapp: "" });
  const [busy, setBusy] = useState(false);
  const { data: avatarUrl } = useSignedUrl("avatars", p?.avatar_url);

  const activeCount = useQuery({
    queryKey: ["my-active-count", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("listings")
        .select("id", { count: "exact", head: true })
        .eq("seller_id", user!.id)
        .eq("status", "ACTIVE");
      if (error) throw error;
      return count ?? 0;
    },
  });

  useEffect(() => {
    if (p)
      setForm({
        name: p.name ?? "",
        city: p.city ?? "",
        campus: p.campus ?? "",
        whatsapp: p.whatsapp ?? "",
      });
  }, [p]);

  async function save() {
    if (!user) return undefined;
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        name: form.name.trim() || "New user",
        city: form.city.trim() || null,
        campus: form.campus.trim() || null,
        whatsapp: form.whatsapp.trim() || null,
      })
      .eq("id", user.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return undefined;
    }
    qc.invalidateQueries({ queryKey: ["profile", user.id] });
    toast.success("Profile saved");
    return undefined;
  }

  async function changeAvatar(file: File) {
    if (!user) return;
    try {
      const path = await uploadImage("avatars", user.id, file);
      const { error } = await supabase.from("profiles").update({ avatar_url: path }).eq("id", user.id);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["profile", user.id] });
      toast.success("Photo updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    }
  }

  async function handleSignOut() {
    await qc.cancelQueries();
    qc.clear();
    await signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (isLoading) return <Skeleton className="h-64 w-full rounded-2xl" />;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4">
        <label className="relative cursor-pointer">
          <Avatar className="size-16">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={form.name} />}
            <AvatarFallback>{(form.name || "U").slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <span className="absolute -bottom-1 -right-1 grid size-6 place-items-center rounded-full bg-primary text-primary-foreground">
            <Camera className="size-3.5" />
          </span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && changeAvatar(e.target.files[0])}
          />
        </label>
        <div className="min-w-0">
          <div className="truncate font-semibold">{form.name || "Your name"}</div>
          <div className="truncate text-xs text-muted-foreground">
            {p?.campus || p?.city || "Add your campus"}
          </div>
          <StarRating value={Number(p?.rating ?? 0)} count={p?.review_count ?? 0} />
        </div>
      </div>

      <div className="grid gap-2">
        <Button asChild variant="outline" className="w-full justify-between">
          <Link to="/my-listings">
            <span className="inline-flex items-center gap-2">
              <Package className="size-4" /> My listings
            </span>
            <span className="text-muted-foreground">{activeCount.data ?? 0} active</span>
          </Link>
        </Button>
        <Button asChild variant="outline" className="w-full justify-between">
          <Link to="/saved">
            <span className="inline-flex items-center gap-2">
              <Heart className="size-4" /> Saved listings
            </span>
            <span className="text-muted-foreground">View →</span>
          </Link>
        </Button>
      </div>

      <div className="space-y-4 rounded-2xl border border-border bg-card p-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              placeholder="Chennai"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="campus">Campus / area</Label>
            <Input
              id="campus"
              value={form.campus}
              onChange={(e) => setForm({ ...form, campus: e.target.value })}
              placeholder="SRM Kattankulathur"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="whatsapp">WhatsApp number (optional)</Label>
          <Input
            id="whatsapp"
            value={form.whatsapp}
            onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
            placeholder="+91 98765 43210"
          />
          <p className="text-xs text-muted-foreground">
            Shown on your listings as a backup way for buyers to reach you.
          </p>
        </div>
        <Button className="w-full" onClick={save} disabled={busy}>
          {busy ? "Saving..." : "Save profile"}
        </Button>
      </div>

      <Button variant="ghost" className="w-full text-destructive" onClick={handleSignOut}>
        <LogOut className="size-4" /> Sign out
      </Button>
    </div>
  );
}
