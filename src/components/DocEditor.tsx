import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { ImagePlus, Plus, Trash2, Video, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORIES, isVideoPath, signedUrls, uploadAttachment, uploadScreenshot, type Doc, type Snippet } from "@/lib/docs";
import { useAuth } from "@/lib/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function DocEditor({ doc }: { doc?: Doc }) {
  const { user } = useAuth();
  const nav = useNavigate();
  const [title, setTitle] = useState(doc?.title ?? "");
  const [category, setCategory] = useState(doc?.category ?? "Odoo");
  const [system, setSystem] = useState(doc?.system ?? "");
  const [summary, setSummary] = useState(doc?.summary ?? "");
  const [body, setBody] = useState(doc?.body ?? "");
  const [snippets, setSnippets] = useState<Snippet[]>(doc?.snippets ?? []);
  const [images, setImages] = useState<string[]>(doc?.images ?? []);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const draftKey = user ? `zelalex-notes:draft:${user.id}:${doc?.id ?? "new"}` : null;

  useEffect(() => {
    if (!draftKey) return;
    setDraftReady(false);
    try {
      const cached = localStorage.getItem(draftKey);
      if (cached) {
        const draft = JSON.parse(cached) as Partial<{
          title: string; category: string; system: string; summary: string; body: string;
          snippets: Snippet[]; images: string[];
        }>;
        if (typeof draft.title === "string") setTitle(draft.title);
        if (typeof draft.category === "string") setCategory(draft.category);
        if (typeof draft.system === "string") setSystem(draft.system);
        if (typeof draft.summary === "string") setSummary(draft.summary);
        if (typeof draft.body === "string") setBody(draft.body);
        if (Array.isArray(draft.snippets)) setSnippets(draft.snippets);
        if (Array.isArray(draft.images)) setImages(draft.images);
        setDraftSaved(true);
      }
    } catch {
      try { localStorage.removeItem(draftKey); } catch { /* Browser storage is unavailable. */ }
    }
    setDraftReady(true);
  }, [draftKey]);

  useEffect(() => {
    if (!draftKey || !draftReady) return;
    setDraftSaved(false);
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(draftKey, JSON.stringify({ title, category, system, summary, body, snippets, images }));
        setDraftSaved(true);
      } catch {
        // Keep editing if browser storage is unavailable or full.
      }
    }, 500);
    return () => window.clearTimeout(timer);
  }, [draftKey, draftReady, title, category, system, summary, body, snippets, images]);

  useEffect(() => { signedUrls(images.filter((p) => !urls[p])).then((u) => setUrls((o) => ({ ...o, ...u }))); }, [images]);

  async function onFiles(files: FileList | null) {
    if (!files || !user) return;
    try {
      for (const f of Array.from(files)) {
        const p = await uploadScreenshot(user.id, f);
        setImages((i) => [...i, p]);
      }
    } catch (e) { toast.error((e as Error).message); }
  }
  async function onVideoFiles(files: FileList | null) {
    if (!files || !user) return;
    const videos = Array.from(files);
    if (videos.some((file) => !file.type.startsWith("video/"))) {
      toast.error("Choose video files only");
      return;
    }
    setUploading(true);
    try {
      for (const file of videos) {
        const path = await uploadAttachment(user.id, file);
        setImages((items) => [...items, path]);
      }
      toast.success(videos.length === 1 ? "Video uploaded" : "Videos uploaded");
    } catch (e) { toast.error((e as Error).message); }
    finally { setUploading(false); }
  }
  useEffect(() => {
    const h = (e: ClipboardEvent) => { if (e.clipboardData?.files.length) onFiles(e.clipboardData.files); };
    window.addEventListener("paste", h); return () => window.removeEventListener("paste", h);
  }, [user]);

  const upd = (i: number, k: keyof Snippet, v: string) => setSnippets((s) => s.map((x, j) => (j === i ? { ...x, [k]: v } : x)));

  async function save() {
    if (!title.trim()) { toast.error("Title is required"); return; }
    setBusy(true);
    const row = { title, category, system: system || null, summary: summary || null, body: body || null, snippets: snippets as never, images };
    const res = doc
      ? await supabase.from("docs").update(row).eq("id", doc.id).select("id").single()
      : await supabase.from("docs").insert({ ...row, author_email: user?.email ?? null, snippets: snippets as never }).select("id").single();
    setBusy(false);
    if (res.error) { toast.error(res.error.message); return; }
    if (draftKey) {
      try { localStorage.removeItem(draftKey); } catch { /* Saving the entry still succeeded. */ }
    }
    setDraftReady(false);
    toast.success("Saved");
    nav({ to: "/docs/$id", params: { id: res.data.id } });
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{doc ? "Edit entry" : "New entry"}</h1>
        {draftSaved && <span className="text-xs text-muted-foreground">Draft saved on this device</span>}
      </div>
      <section className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2"><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Custom invoice report layout" /></div>
        <div className="space-y-1.5"><Label>Category</Label>
          <Select value={category} onValueChange={setCategory}><SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-1.5"><Label>System / device / module</Label><Input value={system} onChange={(e) => setSystem(e.target.value)} placeholder="e.g. Odoo 17 – account, HP LaserJet M404" /></div>
        <div className="space-y-1.5 sm:col-span-2"><Label>Summary</Label><Input value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="One line: problem and fix" /></div>
        <div className="space-y-1.5 sm:col-span-2"><Label>Details / steps</Label><Textarea rows={8} value={body} onChange={(e) => setBody(e.target.value)} placeholder="What was the issue, what did you do, how to verify…" /></div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-medium">Attachments</h2>
          <div className="flex gap-2">
          <Label className="cursor-pointer"><span className="inline-flex items-center gap-2 rounded-md border bg-card px-3 py-1.5 text-sm"><ImagePlus className="size-4" /> Upload</span>
            <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => onFiles(e.target.files)} /></Label>
            <Label className="cursor-pointer"><span className="inline-flex items-center gap-2 rounded-md border bg-card px-3 py-1.5 text-sm"><Video className="size-4" /> Upload video</span>
              <input type="file" accept="video/*" multiple className="hidden" onChange={(e) => { onVideoFiles(e.target.files); e.currentTarget.value = ""; }} /></Label>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Add screenshots or video clips. You can also paste a screenshot (Ctrl+V) anywhere on this page.</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {images.map((p) => (
            <div key={p} className="relative overflow-hidden rounded-md border bg-muted">
              {urls[p] && (isVideoPath(p)
                ? <video src={urls[p]} controls preload="metadata" className="aspect-video w-full bg-black object-contain" />
                : <img src={urls[p]} alt="" className="aspect-video w-full object-cover" />)}
              <button aria-label="Remove attachment" className="absolute right-1 top-1 rounded bg-card p-1" onClick={() => setImages((i) => i.filter((x) => x !== p))}><X className="size-3" /></button>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between"><h2 className="font-medium">Code changes</h2>
          <Button variant="outline" size="sm" onClick={() => setSnippets((s) => [...s, { label: "", language: "python", original: "", edited: "" }])}><Plus /> Add code</Button></div>
        {snippets.map((s, i) => (
          <div key={i} className="space-y-3 rounded-md border bg-card p-4">
            <div className="flex gap-2">
              <Input placeholder="File or label, e.g. models/sale_order.py" value={s.label} onChange={(e) => upd(i, "label", e.target.value)} />
              <Input className="w-32" placeholder="language" value={s.language} onChange={(e) => upd(i, "language", e.target.value)} />
              <Button size="icon" variant="ghost" aria-label="Remove code" onClick={() => setSnippets((x) => x.filter((_, j) => j !== i))}><Trash2 /></Button>
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              <div className="space-y-1.5"><Label>Original code</Label><Textarea rows={10} spellCheck={false} className="font-mono text-xs" value={s.original} onChange={(e) => upd(i, "original", e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Edited code</Label><Textarea rows={10} spellCheck={false} className="font-mono text-xs" value={s.edited} onChange={(e) => upd(i, "edited", e.target.value)} /></div>
            </div>
          </div>
        ))}
      </section>

      <div className="flex justify-end gap-2 border-t pt-6">
        <Button variant="ghost" onClick={() => history.back()}>Cancel</Button>
        <Button onClick={save} disabled={busy || uploading}>{uploading ? "Uploading…" : busy ? "Saving…" : "Save entry"}</Button>
      </div>
    </div>
  );
}
