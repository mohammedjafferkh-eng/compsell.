import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Save, Upload, LockKeyhole } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { DEFAULT_ABOUT, useSiteSettings, useSiteEditor } from "@/lib/site-settings";
import { uploadImage, useSignedUrl } from "@/lib/storage";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/site-settings")({head: () => ({meta: [{title: "Site editor — compsell"}, {name: "description", content: "Founder-only editing for compsell."}, {property: "og:title", content: "Site editor — compsell"}, {property: "og:description", content: "Private site editing."}, {property: "og:type", content: "website"}, {name: "twitter:card", content: "summary"}, {name: "robots", content: "noindex"}]}), component: SiteEditor});
function SiteEditor() {
  const { user } = useAuth();
  const { data: allowed, isLoading } = useSiteEditor(user?.id);
  return <AppShell><h1 className="mb-6 text-3xl font-bold">Site editor</h1>{!user ? <div className="py-10"><LockKeyhole className="mb-4 size-8 text-primary" /><p className="mb-5">Sign in with your founder account to edit the site.</p><Button asChild><Link to="/auth">Sign in</Link></Button></div> : isLoading ? <p>Checking access…</p> : allowed ? <EditorForm /> : <p className="py-10">Only the founder’s account can edit this site.</p>}</AppShell>;
}
function EditorForm() {
  const { user } = useAuth();
  const { data } = useSiteSettings();
  const qc = useQueryClient();
  const [form, setForm] = useState({founder_name: "Mohammed Jaffar kh", founder_bio: "", about_text: DEFAULT_ABOUT, founder_photo: null as string | null, logo_path: null as string | null});
  const [busy, setBusy] = useState(false);
  const {data: logo} = useSignedUrl("site-branding", form.logo_path);
  const {data: photo} = useSignedUrl("site-branding", form.founder_photo);
  useEffect(() => { if (data) setForm({founder_name: data.founder_name, founder_bio: data.founder_bio, about_text: data.about_text, founder_photo: data.founder_photo, logo_path: data.logo_path}); }, [data]);
  async function upload(file: File, field: "logo_path" | "founder_photo") {
    if (!user) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) { toast.error("Choose a PNG, JPG or WebP image under 5 MB."); return; }
    setBusy(true);
    try { const path = await uploadImage("site-branding", user.id, file); setForm(prev => ({...prev, [field]: path})); toast.success("Image ready. Save changes to publish it."); } catch { toast.error("Image upload failed. Please try again."); } finally { setBusy(false); }
  }
  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    try { const {error} = await supabase.from("site_settings").upsert({id: "main", ...form, updated_at: new Date().toISOString()}); if (error) throw error; await qc.invalidateQueries({queryKey: ["site-settings"]}); toast.success("Site updated"); } catch { toast.error("Could not save site changes."); } finally { setBusy(false); }
  }
  return <form onSubmit={save} className="max-w-2xl space-y-7"><div className="grid gap-6 sm:grid-cols-2">{([{field: "logo_path", label: "Site logo", url: logo}, {field: "founder_photo", label: "Founder photo", url: photo}] as const).map(({field,label,url}) => <div key={field}><Label htmlFor={field}>{label}</Label>{url && <img src={url} alt={label} className="my-3 h-28 w-28 rounded-md object-contain" />}<label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-primary"><Upload className="size-4" /> Upload image<input id={field} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" disabled={busy} onChange={e => {const file=e.target.files?.[0]; if (file) void upload(file, field);}} /></label></div>)}</div><div className="space-y-2"><Label htmlFor="founder-name">Founder name</Label><Input id="founder-name" required maxLength={120} value={form.founder_name} onChange={e => setForm({...form, founder_name: e.target.value})} /></div><div className="space-y-2"><Label htmlFor="founder-bio">Founder story</Label><Textarea id="founder-bio" rows={6} maxLength={5000} value={form.founder_bio} onChange={e => setForm({...form, founder_bio: e.target.value})} /></div><div className="space-y-2"><Label htmlFor="about-text">About compsell</Label><Textarea id="about-text" rows={5} maxLength={5000} value={form.about_text} onChange={e => setForm({...form, about_text: e.target.value})} /></div><Button type="submit" disabled={busy}><Save className="size-4" />{busy ? "Saving…" : "Save changes"}</Button></form>;
}