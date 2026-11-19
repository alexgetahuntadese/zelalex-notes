import { supabase } from "@/integrations/supabase/client";

export const CATEGORIES = ["Odoo", "Printer", "Network", "Hardware", "Software", "General ICT"] as const;
export type Snippet = { label: string; language: string; original: string; edited: string };
export type Doc = {
  id: string; title: string; category: string; system: string | null; summary: string | null;
  body: string | null; snippets: Snippet[]; images: string[]; author_id: string;
  author_email: string | null; created_at: string; updated_at: string;
};

export async function listDocs(): Promise<Doc[]> {
  const { data, error } = await supabase.from("docs").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Doc[];
}
export async function getDoc(id: string): Promise<Doc> {
  const { data, error } = await supabase.from("docs").select("*").eq("id", id).single();
  if (error) throw error;
  return data as unknown as Doc;
}
export async function signedUrls(paths: string[]): Promise<Record<string, string>> {
  if (!paths.length) return {};
  const { data } = await supabase.storage.from("screenshots").createSignedUrls(paths, 3600);
  const out: Record<string, string> = {};
  data?.forEach((d) => { if (d.path && d.signedUrl) out[d.path] = d.signedUrl; });
  return out;
}
export async function uploadScreenshot(userId: string, file: File) {
  const ext = file.name.split(".").pop() || "png";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("screenshots").upload(path, file, { contentType: file.type });
  if (error) throw error;
  return path;
}
