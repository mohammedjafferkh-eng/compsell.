import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FolderGit2, Plus } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { ListingGrid } from "@/components/ListingCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { LISTING_SELECT } from "@/lib/queries";

export const Route = createFileRoute("/projects")({
  head: () => ({
    meta: [
      { title: "Completed projects — compsell" },
      {
        name: "description",
        content:
          "Buy ready-made student projects — ESP32 builds, IoT kits, robotics — with code, report and working hardware included. Sell your own finished project too.",
      },
      { property: "og:title", content: "Completed projects — compsell" },
      {
        property: "og:description",
        content: "Buy and sell finished student projects with code, report and hardware included.",
      },
    ],
  }),
  component: ProjectsPage,
});

function ProjectsPage() {
  const projectsQ = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select(LISTING_SELECT)
        .eq("is_project", true)
        .eq("status", "ACTIVE")
        .order("created_at", { ascending: false })
        .limit(60);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <AppShell>
      <div className="circuit rounded-2xl border border-border bg-card p-4">
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <FolderGit2 className="size-5 text-primary" /> Completed projects
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ready-made builds from seniors and makers — with code, report and working hardware, straight from
          your campus.
        </p>
        <Button asChild size="sm" className="mt-3">
          <Link to="/sell">
            <Plus className="size-4" /> Sell your project
          </Link>
        </Button>
      </div>

      <section className="mt-5">
        {projectsQ.isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[3/4] rounded-2xl" />
            ))}
          </div>
        ) : (projectsQ.data ?? []).length === 0 ? (
          <EmptyState
            title="No projects listed yet"
            description="Finished a lab project or a hackathon build? Sell it to a junior who needs it."
            action={
              <Button asChild>
                <Link to="/sell">Sell your project</Link>
              </Button>
            }
          />
        ) : (
          <ListingGrid listings={projectsQ.data ?? []} />
        )}
      </section>
    </AppShell>
  );
}
