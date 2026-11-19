import { describe, expect, it } from "vitest";
import type { Doc } from "@/lib/docs";
import { highlightParts, searchDocs } from "@/lib/search";

const base = (over: Partial<Doc>): Doc => ({
  id: "00000000-0000-0000-0000-000000000000",
  title: "",
  category: "General ICT",
  system: null,
  summary: null,
  body: null,
  snippets: [],
  images: [],
  author_id: "00000000-0000-0000-0000-000000000000",
  author_email: "team@example.com",
  created_at: "2026-11-01T00:00:00Z",
  updated_at: "2026-11-01T00:00:00Z",
  ...over,
});

const printer = base({
  id: "11111111-1111-1111-1111-111111111111",
  title: "HP LaserJet 4000 stuck offline",
  summary: "Reinstall the driver on the office PC",
  body: "Power cycle the printer, then re-add the queue.",
  category: "Printer",
  created_at: "2026-11-03T00:00:00Z",
});

const odoo = base({
  id: "22222222-2222-2222-2222-222222222222",
  title: "Odoo 17 module install fails",
  summary: "Custom module never shows in the apps list",
  body: "Restart the service with --update=web.",
  category: "Odoo",
  created_at: "2026-11-02T00:00:00Z",
});

const cups = base({
  id: "33333333-3333-3333-3333-333333333333",
  title: "Shared printer not visible on floor 2",
  category: "Printer",
  snippets: [
    {
      label: "cups browsing",
      language: "conf",
      original: "BrowsePoll oldserver.local",
      edited: "BrowsePoll newserver.local",
    },
  ],
  created_at: "2026-11-01T00:00:00Z",
});

const ALL = [odoo, printer, cups];

describe("searchDocs", () => {
  it("finds an entry by words in its title", () => {
    const hits = searchDocs(ALL, "laserjet");
    expect(hits.map((h) => h.doc.id)).toEqual([printer.id]);
    expect(hits[0].where).toContain("Title");
  });

  it("requires every word to be present", () => {
    expect(searchDocs(ALL, "odoo 17").map((h) => h.doc.id)).toEqual([odoo.id]);
    expect(searchDocs(ALL, "odoo laserjet")).toEqual([]);
  });

  it("searches the pasted code, not just the notes", () => {
    const hits = searchDocs(ALL, "BrowsePoll");
    expect(hits.map((h) => h.doc.id)).toEqual([cups.id]);
    expect(hits[0].where).toContain("Code");
  });

  it("ranks a title match above a match buried in the steps", () => {
    const inTitle = base({ id: "44444444-4444-4444-4444-444444444444", title: "VLAN 20 routing fix" });
    const inBody = base({
      id: "55555555-5555-5555-5555-555555555555",
      title: "Switch replacement",
      body: "Move every port back to VLAN 20 routing after the swap.",
    });
    expect(searchDocs([inBody, inTitle], "vlan").map((h) => h.doc.id)).toEqual([inTitle.id, inBody.id]);
  });

  it("returns nothing for a blank term or an unknown word", () => {
    expect(searchDocs(ALL, "   ")).toEqual([]);
    expect(searchDocs(ALL, "zabbix")).toEqual([]);
  });

  it("caps the result count", () => {
    expect(searchDocs(ALL, "printer", 1)).toHaveLength(1);
  });
});

describe("highlightParts", () => {
  it("marks only the matched span", () => {
    expect(highlightParts("HP LaserJet 4000", "laser")).toEqual([
      { text: "HP ", hit: false },
      { text: "Laser", hit: true },
      { text: "Jet 4000", hit: false },
    ]);
  });

  it("leaves text alone when there is no search term", () => {
    expect(highlightParts("HP LaserJet 4000", "")).toEqual([{ text: "HP LaserJet 4000", hit: false }]);
  });
});
