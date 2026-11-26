"""Tell Bing (and other IndexNow search engines) which pages exist or changed.

Run after the site has been published:
    python scripts/indexnow.py            # submit every page in sitemap.xml
    python scripts/indexnow.py --dry-run  # only show what would be sent
"""
import json
import pathlib
import re
import sys
import urllib.error
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
HOST = "hadikhawand.dev"

# The key is public by design: IndexNow checks that the site serves it at /<key>.txt
key = next(p.stem for p in ROOT.glob("*.txt") if re.fullmatch(r"[0-9a-f]{32}", p.stem))
urls = re.findall(r"<loc>(.*?)</loc>", (ROOT / "sitemap.xml").read_text(encoding="utf-8"))
payload = {"host": HOST, "key": key, "keyLocation": f"https://{HOST}/{key}.txt", "urlList": urls}

if "--dry-run" in sys.argv:
    print(json.dumps(payload, indent=2))
    sys.exit(0)

request = urllib.request.Request(
    "https://api.indexnow.org/indexnow",
    data=json.dumps(payload).encode(),
    headers={"Content-Type": "application/json; charset=utf-8"},
)
try:
    with urllib.request.urlopen(request, timeout=30) as response:
        print(f"IndexNow answered {response.status} for {len(urls)} pages")
except urllib.error.HTTPError as error:
    sys.exit(f"IndexNow refused: {error.code} {error.read().decode(errors='replace')}")
