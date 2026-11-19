import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search } from "lucide-react";
import { AuthGate } from "@/components/AuthGate";
import { CATEGORIES, listDocs } from "@/lib/docs";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "ICT Logbook — Team fix & customization docs" },
    { name: "description", content: "Document Odoo customizations, printer fixes and ICT work with screenshots and before/after code." },
    { property: "og:title", content: "ICT Logbook" },
    { property: "og:description", content: "Team documentation for Odoo, printers and ICT fixes." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: () => <AuthGate><DocList /></AuthGate>,
});

function DocList() {
  const { data = [], isLoading } = useQuery({ queryKey: ["docs"], queryFn: listDocs });
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  const t = q.toLowerCase();
  const rows = data.filter((d) => (!cat || d.category === cat) &&
    (!t || [d.title, d.summary, d.system, d.body, ...d.snippets.map((s) => s.label + s.edited + s.original)].join(" ").toLowerCase().includes(t)));
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Logbook</h1>
        <p className="text-sm text-muted-foreground">{data.length} entries — customizations, fixes and procedures.</p>
      </div>
      <div className="relative"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search titles, notes and code…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <div className="flex flex-wrap gap-2">
        {[null, ...CATEGORIES].map((c) => (
          <button key={c ?? "all"} onClick={() => setCat(c)}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${cat === c ? "border-primary bg-primary text-primary-foreground" : "bg-card"}`}>{c ?? "All"}</button>
        ))}
      </div>
      {isLoading ? <p className="font-mono text-sm text-muted-foreground">loading…</p> : rows.length === 0 ? (
        <div className="rounded-md border border-dashed p-10 text-center text-sm text-muted-foreground">No entries yet. <Link to="/docs/new" className="text-foreground underline">Write the first one</Link>.</div>
      ) : (
        <ul className="divide-y rounded-md border bg-card">
          {rows.map((d) => (
            <li key={d.id}><Link to="/docs/$id" params={{ id: d.id }} className="flex items-start justify-between gap-4 p-4 hover:bg-muted">
              <div className="min-w-0">
                <div className="flex items-center gap-2"><span className="rounded bg-accent px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase text-accent-foreground">{d.category}</span>
                  <span className="truncate font-medium">{d.title}</span></div>
                {d.summary && <p className="mt-1 truncate text-sm text-muted-foreground">{d.summary}</p>}
              </div>
              <div className="shrink-0 text-right font-mono text-xs text-muted-foreground">
                {new Date(d.created_at).toLocaleDateString()}<div>{d.snippets.length} code · {d.images.length} img</div></div>
            </Link></li>
          ))}
        </ul>
      )}
    </div>
  );
}
