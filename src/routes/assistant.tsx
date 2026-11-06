import { createFileRoute, Outlet, useMatchRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { ThreadList } from "@/components/AssistantThreads";

export const Route = createFileRoute("/assistant")({
  head: () => ({
    meta: [
      { title: "Ask compsell AI — compsell" },
      {
        name: "description",
        content: "Chat with compsell AI to pick components, price your parts and find listings on campus.",
      },
      { property: "og:title", content: "Ask compsell AI — compsell" },
      { property: "og:description", content: "Your electronics buddy: picks parts, prices listings, finds deals." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AssistantLayout,
});

function AssistantLayout() {
  const matchRoute = useMatchRoute();
  const inThread = !!matchRoute({ to: "/assistant/$threadId" });
  return (
    <AppShell hideNav={inThread}>
      <RequireAuth title="Sign in to chat with compsell AI">
        {inThread ? <Outlet /> : <ThreadList />}
      </RequireAuth>
    </AppShell>
  );
}
