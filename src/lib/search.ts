import type { Doc } from "@/lib/docs";

export type DocHit = { doc: Doc; score: number; where: string[] };

const WEIGHTS = { title: 5, summary: 3, system: 3, category: 2, body: 2, code: 4 } as const;
const LABELS: Record<keyof typeof WEIGHTS, string> = {
  title: "Title",
  summary: "Note",
  system: "System",
  category: "Category",
  body: "Steps",
  code: "Code",
};

function haystacks(d: Doc) {
  const code = (d.snippets ?? [])
    .map((s) => [s.label, s.language, s.original, s.edited].filter(Boolean).join(" "))
    .join(" \n ");
  return [
    { field: "title" as const, text: d.title ?? "" },
    { field: "summary" as const, text: d.summary ?? "" },
    { field: "system" as const, text: d.system ?? "" },
    { field: "category" as const, text: d.category ?? "" },
    { field: "body" as const, text: d.body ?? "" },
    { field: "code" as const, text: code },
  ];
}

function occurrences(text: string, term: string) {
  let n = 0;
  let i = text.indexOf(term);
  while (i !== -1) {
    n += 1;
    i = text.indexOf(term, i + term.length);
  }
  return n;
}

/** Every word in `q` must appear somewhere in the entry; best matches come first. */
export function searchDocs(docs: Doc[], q: string, limit = 8): DocHit[] {
  const terms = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];

  const hits: DocHit[] = [];
  for (const doc of docs) {
    const fields = haystacks(doc).map((h) => ({ ...h, lower: h.text.toLowerCase() }));
    const where = new Set<string>();
    let score = 0;
    let matchedAll = true;

    for (const term of terms) {
      let termScore = 0;
      for (const f of fields) {
        const n = occurrences(f.lower, term);
        if (!n) continue;
        termScore += WEIGHTS[f.field] * (1 + Math.min(4, n));
        where.add(LABELS[f.field]);
      }
      if (!termScore) {
        matchedAll = false;
        break;
      }
      score += termScore;
    }

    if (matchedAll && score > 0) hits.push({ doc, score, where: [...where] });
  }

  return hits
    .sort((a, b) => b.score - a.score || (a.doc.created_at < b.doc.created_at ? 1 : -1))
    .slice(0, limit);
}

/** Splits `text` into plain / highlighted chunks so matches can be marked in the UI. */
export function highlightParts(text: string, q: string): { text: string; hit: boolean }[] {
  const terms = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length || !text) return [{ text, hit: false }];

  const marks = new Array<boolean>(text.length).fill(false);
  const lower = text.toLowerCase();
  for (const term of terms) {
    let i = lower.indexOf(term);
    while (i !== -1) {
      for (let j = i; j < i + term.length; j += 1) marks[j] = true;
      i = lower.indexOf(term, i + term.length);
    }
  }

  const parts: { text: string; hit: boolean }[] = [];
  let cur = "";
  let hit = marks[0] ?? false;
  for (let i = 0; i < text.length; i += 1) {
    if (marks[i] === hit) cur += text[i];
    else {
      parts.push({ text: cur, hit });
      cur = text[i];
      hit = marks[i];
    }
  }
  if (cur) parts.push({ text: cur, hit });
  return parts;
}
