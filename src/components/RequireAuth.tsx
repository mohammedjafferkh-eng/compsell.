import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { EmptyState } from "@/components/EmptyState";

export function RequireAuth({
  children,
  title = "Sign in to continue",
  description,
}: {
  children: ReactNode;
  title?: string;
  description?: string;
}) {
  const { user, loading } = useAuth();

  if (loading) return <Skeleton className="h-40 w-full rounded-2xl" />;
  if (!user)
    return (
      <EmptyState
        title={title}
        description={description ?? "Create a free compsell account to buy and sell components."}
        action={
          <Button asChild>
            <Link to="/auth">Sign in</Link>
          </Button>
        }
      />
    );
  return <>{children}</>;
}
