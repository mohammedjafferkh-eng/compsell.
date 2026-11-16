import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/AppShell";

export const Route = createFileRoute("/reset-password")({head: () => ({meta: [{title: "Reset your password — compsell"}, {name: "description", content: "Securely recover your compsell account password."}, {property: "og:title", content: "Reset your password — compsell"}, {property: "og:description", content: "Recover access to your compsell account."}, {property: "og:type", content: "website"}, {name: "twitter:card", content: "summary"}, {name: "robots", content: "noindex"}]}), component: ResetPassword});
function ResetPassword() {
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const recovery = hash.get("type") === "recovery";
    const { data: {subscription} } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "PASSWORD_RECOVERY" || recovery)) setReady(true);
    });
    if (recovery) void supabase.auth.getSession().then(({data}) => {if (data.session) setReady(true);});
    return () => subscription.unsubscribe();
  }, []);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError("");
    if (password !== confirm) {setError("Your passwords do not match."); return;}
    setBusy(true);
    const {error: failure} = await supabase.auth.updateUser({password});
    setBusy(false);
    if (failure) {setError("This reset link may have expired. Request a new one and try again."); return;}
    setDone(true);
  }
  return <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-5 py-10"><Logo compact /><h1 className="mt-8 text-3xl font-bold">{done ? "Password updated" : "Choose a new password"}</h1>{done ? <Button asChild className="mt-6"><Link to="/account">Continue to your account</Link></Button> : ready ? <form onSubmit={submit} className="mt-6 space-y-4"><div className="space-y-2"><Label htmlFor="new-password">New password</Label><Input id="new-password" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} /></div><div className="space-y-2"><Label htmlFor="confirm-password">Confirm new password</Label><Input id="confirm-password" type="password" autoComplete="new-password" required minLength={8} value={confirm} onChange={e => setConfirm(e.target.value)} /></div>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<Button type="submit" disabled={busy}>{busy ? "Updating…" : "Update password"}</Button></form> : <div className="mt-6"><p className="text-sm text-muted-foreground">Open the reset link from your email to choose a new password. If it has expired, request another link.</p><Button asChild variant="outline" className="mt-5"><Link to="/auth">Back to sign in</Link></Button></div>}</div>;
}