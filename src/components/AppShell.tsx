import { Link } from "@tanstack/react-router";
import { Home, Search, PlusCircle, MessageCircle, User, Bot } from "lucide-react";
import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SiteFooter } from "@/components/SiteFooter";
import { useSiteSettings } from "@/lib/site-settings";
import { useSignedUrl } from "@/lib/storage";

const NAV = [
  { to: "/", label: "Home", icon: Home },
  { to: "/explore", label: "Explore", icon: Search },
  { to: "/sell", label: "Sell", icon: PlusCircle },
  { to: "/chats", label: "Chats", icon: MessageCircle },
  { to: "/account", label: "Profile", icon: User },
] as const;

export function Logo({ compact = false }: { compact?: boolean }) {
  const { data: settings } = useSiteSettings();
  const { data: logoUrl } = useSignedUrl("site-branding", settings?.logo_path);
  return (
    <Link to="/" className="flex items-center gap-2">
      {logoUrl ? <img src={logoUrl} alt="compsell logo" className="size-9 shrink-0 object-contain" /> : <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="6" y="6" width="12" height="12" rx="2" />
          <path d="M12 2v4M12 18v4M2 12h4M18 12h4M6 3v1M18 20v1" />
        </svg>
      </span>}
      <span className="font-display text-xl font-bold">
        compsell
        {!compact && (
          <span className="ml-2 hidden text-xs font-medium text-muted-foreground xl:inline">
            Buy. Sell. Reuse Electronics.
          </span>
        )}
      </span>
    </Link>
  );
}

export function AppShell({
  children,
  header,
  hideNav = false,
}: {
  children: ReactNode;
  header?: ReactNode;
  hideNav?: boolean;
}) {
  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <header className="sticky top-0 z-30 border-b border-border bg-card/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-5 lg:px-8">
          {header ?? (
            <>
              <Logo />
              <div className="flex items-center gap-3">
                {!hideNav && <nav aria-label="Main navigation" className="hidden items-center gap-5 md:flex">{NAV.map(({to, label}) => <Link key={to} to={to} activeOptions={{exact: to === "/"}} className="text-sm font-medium text-muted-foreground hover:text-primary" activeProps={{className: "text-primary"}}>{label}</Link>)}</nav>}
                <Button asChild variant="outline" size="sm" className="gap-1.5"><Link to="/assistant"><Bot className="size-4" /><span className="hidden sm:inline">Ask compsell</span><span className="sm:hidden">Ask AI</span></Link></Button>
              </div>
            </>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-6 lg:px-8">{children}</main>
      <SiteFooter />
      {!hideNav && (
        <nav aria-label="Mobile navigation" className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur md:hidden">
          <div className="mx-auto flex max-w-3xl items-stretch justify-between px-2">
            {NAV.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                activeOptions={{ exact: to === "/" }}
                className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground transition-colors"
                activeProps={{ className: "!text-primary" }}
              >
                {({ isActive }) => (
                  <>
                    <Icon className={cn("size-5", isActive && "stroke-[2.4]")} />
                    {label}
                  </>
                )}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
}
