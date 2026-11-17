"""Build the onboarding suggestion lists in app/data/ from open datasets. Rerun to refresh; the output is committed.

    python scripts/build_edu_data.py                 # download everything
    python scripts/build_edu_data.py --cache DIR     # reuse wd.json, wd_alias.json, hipo.json, districts.json in DIR

Sources (all openly licensed):
- Wikidata (CC0): educational institutions located in Bangladesh, with English aliases ("DU", "BUET") and Bangla labels.
- Hipo university-domains-list (MIT): Bangladeshi universities, to fill gaps in Wikidata.
- nuhil/bangladesh-geocode (MIT): the 64 districts with Bangla names and official spellings (Chattogram, Cumilla).

The lists only suggest; students can still type an institution or district that isn't listed.
"""

import argparse
import json
import re
import sys
import urllib.parse
import urllib.request
from datetime import date
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "app" / "data"
UA = {"User-Agent": "edu-list-builder/0.1 (open data prep script)"}
WIKIDATA = "https://query.wikidata.org/sparql"
HIPO = "https://raw.githubusercontent.com/Hipo/university-domains-list/master/world_universities_and_domains.json"
DISTRICTS = "https://raw.githubusercontent.com/nuhil/bangladesh-geocode/master/districts/districts.json"

# Everything that is an educational institution (Q2385804) by type, in Bangladesh (Q902).
_BASE = "?item wdt:P17 wd:Q902 ; wdt:P31 ?type . ?type wdt:P279* wd:Q2385804 ."
Q_ITEMS = f"""SELECT DISTINCT ?item ?en ?bn ?typeLabel WHERE {{ {_BASE}
  ?item rdfs:label ?en FILTER(LANG(?en) = "en")
  OPTIONAL {{ ?item rdfs:label ?bn FILTER(LANG(?bn) = "bn") }}
  SERVICE wikibase:label {{ bd:serviceParam wikibase:language "en". }} }}"""
Q_ALIASES = f"""SELECT DISTINCT ?item ?alias WHERE {{ {_BASE}
  ?item skos:altLabel ?alias FILTER(LANG(?alias) = "en") }}"""

# Wikidata type label -> which education level the place serves. Unlisted types count for every level.
KINDS = {
    "school": "school", "high school": "school", "secondary school": "school", "primary school": "school",
    "zilla school": "school", "government girls' high school": "school", "girls' school": "school", "madrasa": "school",
    "college": "college", "cadet college": "college", "higher secondary school": "college", "polytechnic institute": "college",
    "university": "university", "public university": "university", "private university": "university",
    "medical school": "university", "medical university": "university", "business school": "university",
    "engineering school": "university", "law school": "university", "university of engineering and technology": "university",
}
SKIP_TYPES = {"faculty"}  # departments of a university, not somewhere a student "goes to"
FACULTY = re.compile(r"\b(faculty|department) of\b", re.I)


def fetch(url: str, cache: Path | None, name: str, query: str | None = None) -> object:
    if cache and (cache / name).exists():
        return json.loads((cache / name).read_text(encoding="utf-8"))
    if query:
        url = f"{url}?{urllib.parse.urlencode({'query': query, 'format': 'json'})}"
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120) as r:
        return json.loads(r.read().decode("utf-8"))


def key(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", name.casefold().replace("&", " and ")).strip()


def institutions(cache: Path | None) -> list[dict]:
    rows = fetch(WIKIDATA, cache, "wd.json", Q_ITEMS)["results"]["bindings"]
    aliases = fetch(WIKIDATA, cache, "wd_alias.json", Q_ALIASES)["results"]["bindings"]
    hipo = fetch(HIPO, cache, "hipo.json")

    items: dict[str, dict] = {}
    for b in rows:
        qid, typ = b["item"]["value"], b["typeLabel"]["value"]
        it = items.setdefault(qid, {"name": b["en"]["value"].strip(), "bn": "", "aliases": set(), "kinds": set(), "types": set()})
        it["types"].add(typ)
        if "bn" in b:
            it["bn"] = b["bn"]["value"].strip()
        if typ in KINDS:
            it["kinds"].add(KINDS[typ])
    for b in aliases:
        if b["item"]["value"] in items:
            items[b["item"]["value"]]["aliases"].add(b["alias"]["value"].strip())

    out: dict[str, dict] = {}
    for it in items.values():
        if it["types"] & SKIP_TYPES or FACULTY.search(it["name"]) or re.match(r"Q\d+$", it["name"]):
            continue  # a faculty or department inside a university, or no English label
        if re.search(r"school\s*(and|&)\s*college", it["name"], re.I):
            it["kinds"] |= {"school", "college"}
        prev = out.get(key(it["name"]))
        if prev:  # same name listed twice (separate Wikidata items)
            prev["aliases"] |= it["aliases"]
            prev["kinds"] |= it["kinds"]
            continue
        out[key(it["name"])] = it

    known = set(out) | {key(a) for it in out.values() for a in it["aliases"]}
    for u in hipo:
        if u.get("country") == "Bangladesh" and key(u["name"]) not in known:
            out[key(u["name"])] = {"name": u["name"].strip(), "bn": "", "aliases": set(), "kinds": {"university"}}

    result = []
    for it in sorted(out.values(), key=lambda i: i["name"].casefold()):
        entry = {"name": it["name"], "kinds": sorted(it["kinds"])}
        al = sorted(a for a in it["aliases"] if a.casefold() != it["name"].casefold())
        if al:
            entry["aliases"] = al
        if it["bn"]:
            entry["bn"] = it["bn"]
        result.append(entry)
    return result


def districts(cache: Path | None) -> list[dict]:
    raw = fetch(DISTRICTS, cache, "districts.json")
    rows = next(x for x in raw if isinstance(x, dict) and x.get("type") == "table")["data"]
    return sorted(({"name": r["name"], "bn": r["bn_name"]} for r in rows), key=lambda d: d["name"])


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--cache", type=Path, help="directory with previously downloaded source files")
    args = p.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    meta = {"generated": date.today().isoformat()}
    inst = institutions(args.cache)
    dist = districts(args.cache)
    if len(dist) != 64:
        sys.exit(f"expected 64 districts, got {len(dist)}")
    (OUT / "institutions.json").write_text(json.dumps(
        {**meta, "sources": ["Wikidata (CC0)", "Hipo university-domains-list (MIT)"], "items": inst},
        ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    (OUT / "districts.json").write_text(json.dumps(
        {**meta, "sources": ["nuhil/bangladesh-geocode (MIT)"], "items": dist}, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{len(inst)} institutions, {len(dist)} districts -> {OUT}")


if __name__ == "__main__":
    main()
