#!/usr/bin/env python3
"""Optional official X API lookup. Defaults to a network-free dry run.

Run `python3 x_probe.py --execute` only after checking provider pricing/limits.
A token is read from X_BEARER_TOKEN or a hidden terminal prompt; never saved.
One request, only the five sample posts, no retries, sync, or video downloads.
"""
from __future__ import annotations
import argparse
import getpass
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from server import ROOT, now, private_write


def build_url(sources: list[dict], basic: bool = False) -> str:
    ids = [s["post_id"] for s in sources if s.get("kind") == "x_post"]
    if not ids or len(ids) > 100 or any(not isinstance(i, str) or not i.isdigit() for i in ids):
        raise ValueError("Expected 1–100 post IDs represented as strings.")
    params = {"ids": ",".join(ids), "tweet.fields": "created_at,author_id,attachments,text"}
    if not basic:
        params.update({"expansions": "attachments.media_keys,author_id", "media.fields": "type,url,preview_image_url,variants,width,height,duration_ms", "user.fields": "name,username,profile_image_url"})
    return "https://api.x.com/2/tweets?" + urllib.parse.urlencode(params)


class NoRedirect(urllib.request.HTTPRedirectHandler):
    # Never forward a bearer token to a redirect destination.
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def execute_lookup(token, sources, report_path, basic=False):
    """One explicitly requested lookup. The bearer token is never persisted."""
    if report_path.exists():
        raise ValueError("A lookup report already exists. No repeat request was made.")
    if not isinstance(token, str) or not token.strip() or len(token)>4096 or "\n" in token or "\r" in token:
        raise ValueError("Enter a valid bearer token; nothing requested.")
    url = build_url(sources, basic)
    request = urllib.request.Request(url, headers={"Authorization": "Bearer " + token, "User-Agent": "ReferenceCaptureLab/0.1", "Accept": "application/json"})
    started = time.perf_counter()
    report = {"started_at": now(), "mode": "basic" if basic else "expanded", "http_requests_attempted": 1,
              "sample_post_ids": [s["post_id"] for s in sources if s.get("kind") == "x_post"],
              "http_status": None, "measured_cost_usd": None, "cost_note": "Resource counts are observations, NOT a bill. Reconcile this request with the X developer usage/billing report.",
              "playback_verified": False, "video_downloads": 0, "response": None}
    try:
        with urllib.request.build_opener(NoRedirect()).open(request, timeout=25) as response:
            report["http_status"] = response.status
            raw = response.read(3_000_001)
            if len(raw) > 3_000_000:
                raise ValueError("Response exceeds this small-test limit.")
            data = json.loads(raw)
            report["response"] = data
            includes = data.get("includes", {})
            report["resources_returned"] = {"posts": len(data.get("data", [])), "users": len(includes.get("users", [])), "media": len(includes.get("media", [])), "errors": len(data.get("errors", []))}
            media = {m.get("media_key"): m for m in includes.get("media", [])}
            by_id = {p["id"]: p for p in data.get("data", [])}
            report["sample_results"] = []
            for post_id in report["sample_post_ids"]:
                post = by_id.get(post_id)
                attached = [media[k] for k in (post or {}).get("attachments", {}).get("media_keys", []) if k in media]
                report["sample_results"].append({"post_id": post_id, "returned": post is not None,
                    "media_types": [m.get("type") for m in attached],
                    "preview_url_present": any(m.get("preview_image_url") or m.get("url") for m in attached),
                    "video_variants_present": any(m.get("variants") for m in attached),
                    "preview_visually_verified": False, "playback_verified": False})
    except urllib.error.HTTPError as exc:
        report["http_status"] = exc.code
        report["error"] = f"Official API returned HTTP {exc.code}. Check account access, credits, token, and sample availability. No retry made."
    except Exception as exc:
        # Do not stringify request headers or token-bearing objects.
        report["error"] = f"{type(exc).__name__}: request or response processing failed. No retry made."
    finally:
        report["duration_ms"] = round((time.perf_counter()-started)*1000)
        report["finished_at"] = now()
        report_path.parent.mkdir(exist_ok=True, mode=0o700)
        if report_path.exists():
            stamp = str(time.time_ns())
            report_path.rename(report_path.with_name(f"x-probe-previous-{stamp}.json"))
        private_write(report_path, json.dumps(report, indent=2))
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--execute", action="store_true", help="Make ONE potentially billable API request.")
    parser.add_argument("--basic", action="store_true", help="Omit author/media expansions for a separate comparison.")
    parser.add_argument("--retry", action="store_true", help="Explicitly allow another potentially billable attempt after a saved report.")
    args = parser.parse_args()
    sources = json.loads((ROOT / "sources.json").read_text())["sources"]
    url = build_url(sources, args.basic)
    print("Scope: five supplied X posts; one GET request; no automatic retries or video downloads.")
    print("Mode:", "basic" if args.basic else "post + author + media expansions")
    if not args.execute:
        print("DRY RUN: no network call, no token read, no spend.")
        print("Check X pricing and configure a provider-side spending cap before using --execute.")
        print("Token will be requested privately in Terminal; do not paste it into chat.")
        return
    report_path = ROOT / ".capture-data/x-probe.json"
    if report_path.exists() and not args.retry:
        raise SystemExit("A report already exists. Review it first. A second attempt requires --retry and may be billed again.")
    token = os.environ.get("X_BEARER_TOKEN", "").strip() or getpass.getpass("X bearer token (hidden; not stored): ").strip()
    if not token or "\n" in token or "\r" in token:
        raise SystemExit("No valid token supplied; nothing requested.")
    if report_path.exists():
        report_path.rename(report_path.with_name(f"x-probe-previous-{time.time_ns()}.json"))
    report = execute_lookup(token, sources, report_path, args.basic)
    print(json.dumps({k:v for k,v in report.items() if k != "response"}, indent=2))
    print("Private full report:", report_path)
    print("Returned video URLs do not prove playback or grant permanent archiving rights.")
    if report.get("error"):
        sys.exit(1)

if __name__ == "__main__":
    main()
