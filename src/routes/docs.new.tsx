import { createFileRoute } from "@tanstack/react-router";
import { AuthGate } from "@/components/AuthGate";
import { DocEditor } from "@/components/DocEditor";

export const Route = createFileRoute("/docs/new")({
  head: () => ({ meta: [
    { title: "New entry — ICT Logbook" }, { name: "description", content: "Document a new fix or customization." },
    { property: "og:title", content: "New entry — ICT Logbook" }, { property: "og:description", content: "Document a new fix or customization." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: () => <AuthGate><DocEditor /></AuthGate>,
});
