import { Copy } from "lucide-react";
import { toast } from "sonner";
import type { Snippet } from "@/lib/docs";

function Pane({ title, code, other, kind }: { title: string; code: string; other: string; kind: "removed" | "added" }) {
  const otherSet = new Set(other.split("\n"));
  const lines = code ? code.split("\n") : [];
  return (
    <div className="min-w-0 overflow-hidden rounded-md bg-code-bg text-code-fg">
      <div className="flex items-center justify-between border-b border-code-fg/10 px-3 py-2 font-mono text-xs">
        <span className="opacity-70">{title}</span>
        <button aria-label={`Copy ${title}`} className="opacity-70 hover:opacity-100" onClick={() => { navigator.clipboard.writeText(code); toast.success("Copied"); }}><Copy className="size-3.5" /></button>
      </div>
      <pre className="overflow-x-auto py-2 font-mono text-xs leading-5">
        {lines.length === 0 && <div className="px-3 opacity-50">— empty —</div>}
        {lines.map((l, i) => (
          <div key={i} className={`flex px-3 ${!otherSet.has(l) && other ? (kind === "removed" ? "bg-diff-removed" : "bg-diff-added") : ""}`}>
            <span className="mr-3 w-6 shrink-0 select-none text-right opacity-40">{i + 1}</span><span className="whitespace-pre">{l || " "}</span>
          </div>
        ))}
      </pre>
    </div>
  );
}

export function CodeCompare({ s }: { s: Snippet }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium">{s.label || "Code change"}<span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">{s.language || "text"}</span></div>
      <div className="grid gap-3 lg:grid-cols-2">
        <Pane title="ORIGINAL" code={s.original} other={s.edited} kind="removed" />
        <Pane title="EDITED" code={s.edited} other={s.original} kind="added" />
      </div>
    </div>
  );
}
