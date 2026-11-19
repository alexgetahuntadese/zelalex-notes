import { createFileRoute, Link, Outlet, useMatchRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AuthGate } from "@/components/AuthGate";
import { CodeCompare } from "@/components/CodeCompare";
import { getDoc, signedUrls } from "@/lib/docs";
import { useAuth } from "@/lib/use-auth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/docs/$id")({
  head: () => ({ meta: [
    { title: "Entry — ICT Logbook" }, { name: "description", content: "Documented fix with screenshots and code changes." },
    { property: "og:title", content: "Entry — ICT Logbook" }, { property: "og:description", content: "Documented fix with screenshots and code changes." },
    { property: "og:type", content: "article" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: Page,
});

function Page() {
  const match = useMatchRoute();
  if (match({ to: "/docs/$id/edit", fuzzy: true })) return <Outlet />;
  return <AuthGate><View /></AuthGate>;
}

function View() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const { data: d, isLoading } = useQuery({ queryKey: ["doc", id], queryFn: () => getDoc(id) });
  const { data: urls = {} } = useQuery({ queryKey: ["urls", id, d?.images], queryFn: () => signedUrls(d!.images), enabled: !!d });
  if (isLoading || !d) return <p className="font-mono text-sm text-muted-foreground">loading…</p>;
  async function del() {
    if (!confirm("Delete this entry?")) return undefined;
    const { error } = await supabase.from("docs").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    nav({ to: "/" });
  }
  return (
    <article className="space-y-8">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="size-4" /> All entries</Link>
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-muted-foreground">
          <span className="rounded bg-accent px-1.5 py-0.5 font-semibold uppercase text-accent-foreground">{d.category}</span>
          {d.system && <span>{d.system}</span>}<span>· {d.author_email} · {new Date(d.created_at).toLocaleString()}</span></div>
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-3xl font-semibold tracking-tight">{d.title}</h1>
          <div className="flex shrink-0 gap-2">
            <Button asChild variant="outline" size="sm"><Link to="/docs/$id/edit" params={{ id }}><Pencil /> Edit</Link></Button>
            {user?.id === d.author_id && <Button variant="ghost" size="icon" aria-label="Delete" onClick={del}><Trash2 /></Button>}
          </div>
        </div>
        {d.summary && <p className="text-lg text-muted-foreground">{d.summary}</p>}
      </header>
      {d.body && <div className="whitespace-pre-wrap rounded-md border bg-card p-5 leading-relaxed">{d.body}</div>}
      {d.images.length > 0 && (
        <section className="space-y-3"><h2 className="font-medium">Screenshots</h2>
          <div className="grid gap-3 sm:grid-cols-2">{d.images.map((p) => urls[p] && (
            <a key={p} href={urls[p]} target="_blank" rel="noreferrer"><img src={urls[p]} alt="" className="w-full rounded-md border" /></a>))}</div>
        </section>)}
      {d.snippets.length > 0 && (
        <section className="space-y-6"><h2 className="font-medium">Code changes</h2>{d.snippets.map((s, i) => <CodeCompare key={i} s={s} />)}</section>)}
    </article>
  );
}
