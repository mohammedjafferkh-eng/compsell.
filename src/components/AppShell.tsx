import { Link } from "@tanstack/react-router";
import { Home, Search, PlusCircle, MessageCircle, User } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Home", icon: Home },
  { to: "/explore", label: "Explore", icon: Search },
  { to: "/sell", label: "Sell", icon: PlusCircle },
  { to: "/chats", label: "Chats", icon: MessageCircle },
  { to: "/account", label: "Profile", icon: User },
] as const;

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2">
      <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="6" y="6" width="12" height="12" rx="2" />
          <path d="M12 2v4M12 18v4M2 12h4M18 12h4M6 3v1M18 20v1" />
        </svg>
      </span>
      <span className="font-display text-lg font-bold tracking-tight">
        compsell
        {!compact && (
          <span className="ml-2 hidden text-xs font-medium text-muted-foreground sm:inline">
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
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-30 border-b border-border bg-card/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-4">
          {header ?? <Logo />}
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-4">{children}</main>
      {!hideNav && (
        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur">
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
