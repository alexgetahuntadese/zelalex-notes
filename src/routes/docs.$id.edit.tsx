import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AuthGate } from "@/components/AuthGate";
import { DocEditor } from "@/components/DocEditor";
import { getDoc } from "@/lib/docs";

export const Route = createFileRoute("/docs/$id/edit")({
  head: () => ({ meta: [
    { title: "Edit entry — ICT Logbook" }, { name: "description", content: "Update a documented fix." },
    { property: "og:title", content: "Edit entry — ICT Logbook" }, { property: "og:description", content: "Update a documented fix." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: () => <AuthGate><Edit /></AuthGate>,
});

function Edit() {
  const { id } = Route.useParams();
  const { data } = useQuery({ queryKey: ["doc", id], queryFn: () => getDoc(id) });
  return data ? <DocEditor key={data.updated_at} doc={data} /> : <p className="font-mono text-sm text-muted-foreground">loading…</p>;
}
