// Suggestions for institution and district fields, from the backend's open-data lists (/api/meta/*).
import type { ComboOption } from "@/components/ui/combobox";
import { api } from "@/lib/api";
import type { EducationLevel } from "@/lib/types";

type Institution = { name: string; kinds: ("school" | "college" | "university")[] };
type District = { name: string; bn: string };

const KIND_LABEL = { school: "School", college: "College", university: "University" } as const;

// One function per level, so the Combobox's `search` prop keeps the same identity between renders.
const byLevel = new Map<string, (q: string) => Promise<ComboOption[]>>();

export function institutionSearch(level: EducationLevel | "" | null | undefined) {
  const key = level || "any";
  let fn = byLevel.get(key);
  if (!fn) {
    fn = async (q: string) => {
      const params = new URLSearchParams({ q, ...(level ? { level } : {}) });
      const { items } = await api<{ items: Institution[] }>(`/meta/institutions?${params}`);
      return items.map((i) => ({ value: i.name, hint: i.kinds.map((k) => KIND_LABEL[k]).join(" · ") || undefined }));
    };
    byLevel.set(key, fn);
  }
  return fn;
}

let districtList: Promise<District[]> | null = null;

/** All 64 districts are fetched once, then filtered locally: English or Bangla, start of a word first. */
export async function districtSearch(q: string): Promise<ComboOption[]> {
  districtList ??= api<{ items: District[] }>("/meta/districts").then((r) => r.items).catch((e) => {
    districtList = null; // let the next keystroke retry
    throw e;
  });
  const needle = q.trim().toLowerCase();
  const scored = (await districtList)
    .map((d) => {
      const name = d.name.toLowerCase();
      const rank = name.startsWith(needle) ? 0 : d.bn.startsWith(q.trim()) ? 1 : name.includes(needle) || d.bn.includes(q.trim()) ? 2 : -1;
      return { d, rank };
    })
    .filter((x) => x.rank >= 0)
    .sort((a, b) => a.rank - b.rank || a.d.name.localeCompare(b.d.name));
  return scored.slice(0, 8).map(({ d }) => ({ value: d.name, hint: d.bn }));
}
