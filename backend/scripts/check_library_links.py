"""Check that every digital-library link in app/catalog.py still answers. Run from backend/:

    .venv/Scripts/python scripts/check_library_links.py
"""

import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.catalog import CATALOG, EXTRA_META  # noqa: E402

HEADERS = {"User-Agent": "Mozilla/5.0 (link checker)"}


def check(url: str) -> tuple[str, str]:
    try:
        r = httpx.get(url, headers=HEADERS, follow_redirects=True, timeout=20)
        moved = str(r.url).rstrip("/") != url.rstrip("/")
        return url, f"{r.status_code}" + (f" -> {r.url}" if moved else "")
    except httpx.HTTPError as e:
        return url, f"ERROR {type(e).__name__}"


def main() -> int:
    urls = sorted({r["url"] for c in [*CATALOG, *EXTRA_META.values()] for r in c.get("resources", [])})
    bad = 0
    with ThreadPoolExecutor(8) as pool:
        for url, result in pool.map(check, urls):
            ok = result.startswith("2")
            bad += not ok
            print(("ok   " if ok else "FAIL ") + url + ("" if result == "200" else f"  [{result}]"))
    print(f"{len(urls) - bad}/{len(urls)} links ok")
    return 1 if bad else 0


if __name__ == "__main__":
    raise SystemExit(main())
