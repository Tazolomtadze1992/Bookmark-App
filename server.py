#!/usr/bin/env python3
"""Private, local-only capture test. Python 3.9+, standard library only.

Paid requests occur only through the explicitly confirmed five-post test.
X widgets load in a separate localhost origin on demand.
"""
from __future__ import annotations

import argparse
import base64
import errno
import hashlib
import hmac
import html
import json
import os
import re
import secrets
import sqlite3
import threading
import time
import webbrowser
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from x_media import motion_manifest, image_manifest, metadata_manifest
from bookmark_sync import BookmarkSync, SyncError
from cloud_sync import CloudSync, CloudError

ROOT = Path(__file__).resolve().parent
MAX_BODY = 5_000_000
ID_RE = re.compile(r"^[a-f0-9]{32}$")
POST_RE = re.compile(r"/(?:[^/]+/status|i/status)/(\d+)(?:/|$)")
X_HOSTS = {"x.com", "www.x.com", "twitter.com", "www.twitter.com", "mobile.twitter.com", "mobile.x.com"}


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def normalise_url(value: str) -> tuple[str, str | None]:
    if not isinstance(value, str) or len(value) > 4096:
        raise ValueError("A valid source URL is required.")
    u = urlsplit(value)
    if u.scheme not in {"http", "https"} or not u.hostname or u.username or u.password:
        raise ValueError("Only ordinary http/https pages without embedded credentials are supported.")
    host = u.hostname.lower()
    post = POST_RE.search(u.path) if host in X_HOSTS else None
    if host in X_HOSTS:
        if not post:
            raise ValueError("Open the individual X post, not the timeline, before saving.")
        return f"https://x.com/i/status/{post.group(1)}", post.group(1)
    # Keep meaningful query parameters and anchors; remove known tracking only.
    pairs = [(k, v) for k, v in parse_qsl(u.query, keep_blank_values=True)
             if not k.lower().startswith("utm_") and k.lower() not in {"fbclid", "gclid"}]
    port = u.port  # Deliberately validates malformed ports.
    netloc = f"[{host}]" if ":" in host else host
    if port and not ((u.scheme == "https" and port == 443) or (u.scheme == "http" and port == 80)):
        netloc += f":{port}"
    return urlunsplit((u.scheme, netloc, u.path or "/", urlencode(pairs), u.fragment)), None


def private_write(path: Path, data: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd = os.open(str(path), os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "w", encoding="utf-8") as f:
        f.write(data)
    path.chmod(0o600)


class Store:
    def __init__(self, directory: Path):
        self.directory = directory
        directory.mkdir(parents=True, exist_ok=True)
        directory.chmod(0o700)
        self.db = sqlite3.connect(directory / "captures.sqlite", check_same_thread=False)
        self.db.execute("CREATE TABLE IF NOT EXISTS captures (id TEXT PRIMARY KEY, record TEXT NOT NULL, image BLOB)")
        self.db.commit()
        (directory / "captures.sqlite").chmod(0o600)
        self.lock = threading.RLock()

    def save(self, body: dict) -> dict:
        url = body.get("url", "")
        key, post_id = normalise_url(url)
        item_id = hashlib.sha256(key.encode()).hexdigest()[:32]
        encoded = body.get("preview_data_url")
        image = None
        if encoded:
            if not isinstance(encoded, str) or not encoded.startswith("data:image/jpeg;base64,"):
                raise ValueError("The preview must be a JPEG captured by the extension.")
            try:
                image = base64.b64decode(encoded.split(",", 1)[1], validate=True)
            except Exception as exc:
                raise ValueError("The preview is not valid base64.") from exc
            if len(image) > 3_000_000 or not image.startswith(b"\xff\xd8\xff"):
                raise ValueError("The preview is not a supported JPEG or is too large.")
        def text(name: str, limit: int) -> str:
            return str(body.get(name) or "")[:limit]
        with self.lock:
            row = self.db.execute("SELECT record,image FROM captures WHERE id=?", (item_id,)).fetchone()
            old = json.loads(row[0]) if row else {}
            # Do not destroy a good preview when a later attempt fails.
            retained_old = bool(not image and row and row[1])
            if retained_old:
                image = row[1]
            warnings = [str(w)[:600] for w in body.get("warnings", [])[:8]] if isinstance(body.get("warnings", []), list) else []
            if retained_old:
                warnings.append("Latest capture had no preview; the previous preview is retained.")
            record = {
                "id": item_id, "url": url, "normalised_url": key,
                "post_id": post_id, "kind": "x_post" if post_id else "website",
                "title": text("title", 500) or old.get("title") or url,
                "description": text("description", 3000),
                "author_observed": text("author", 300) or None,
                "canonical_observed": text("canonical_url", 4096) or None,
                "created_at": old.get("created_at", now()), "updated_at": now(),
                "capture_attempts": old.get("capture_attempts", 0) + 1,
                "has_preview": bool(image), "preview_bytes": len(image) if image else 0,
                "preview_method": (old.get("preview_method") if retained_old else text("preview_method", 100)) or None,
                "preview_status": "needs_visual_review" if image else "missing",
                "media_observed": body.get("media_observed") if isinstance(body.get("media_observed"), dict) else {},
                "warnings": warnings, "capture_ms": body.get("capture_ms") if isinstance(body.get("capture_ms"), (int, float)) else None,
                "recognisable": old.get("recognisable") if retained_old else None,
                "playback": old.get("playback", "not_tested" if post_id else "not_applicable"),
                "library": old.get("library", {"favorite": False, "categories": []}),
                "notes": old.get("notes", ""), "source_opened_at": old.get("source_opened_at"),
                "fixture": bool(body.get("fixture", False)),
                "cost": {"paid_x_requests_for_capture": 0, "measured_product_cost_usd": None},
            }
            self.db.execute("INSERT OR REPLACE INTO captures VALUES (?,?,?)", (item_id, json.dumps(record), image))
            self.db.commit()
        return {"item": record, "duplicate": bool(row)}

    def import_bookmark(self, post, user):
        # Existing cards and owner assessments are never overwritten by sync.
        url = f"https://x.com/i/status/{post['id']}"
        key, _ = normalise_url(url)
        item_id = hashlib.sha256(key.encode()).hexdigest()[:32]
        with self.lock:
            if self.db.execute("SELECT 1 FROM captures WHERE id=?", (item_id,)).fetchone():
                return False
            item = self.save({'url': url, 'title': post.get('text', '')[:500],
                'description': post.get('text', ''), 'author': (user.get('name', '') + ' @' + user.get('username', '')).strip(),
                'preview_method': 'official_x_bookmark_sync', 'warnings': []})['item']
            item.update(capture_origin='x_bookmark', bookmarked_first_seen_at=now(), capture_attempts=0)
            self.db.execute("UPDATE captures SET record=? WHERE id=?", (json.dumps(item), item_id))
            self.db.commit()
            return True

    def all(self) -> list[dict]:
        with self.lock:
            return [json.loads(r[0]) for r in self.db.execute("SELECT record FROM captures ORDER BY json_extract(record, '$.updated_at') DESC")]

    def image(self, item_id: str) -> bytes | None:
        with self.lock:
            row = self.db.execute("SELECT image FROM captures WHERE id=?", (item_id,)).fetchone()
            return row[0] if row else None

    def evaluate(self, body: dict) -> dict:
        item_id = body.get("id", "")
        if not isinstance(item_id, str) or not ID_RE.fullmatch(item_id):
            raise ValueError("Invalid item ID.")
        with self.lock:
            row = self.db.execute("SELECT record FROM captures WHERE id=?", (item_id,)).fetchone()
            if not row:
                raise ValueError("The capture no longer exists.")
            item = json.loads(row[0])
            if "recognisable" in body:
                if body["recognisable"] is not None and type(body["recognisable"]) is not bool:
                    raise ValueError("Recognisable must be true, false, or null.")
                item["recognisable"] = body["recognisable"]
            if "playback" in body:
                if body["playback"] not in {"not_tested", "works_in_embed", "source_only", "failed", "not_applicable"}:
                    raise ValueError("Invalid playback assessment.")
                item["playback"] = body["playback"]
            if "notes" in body:
                item["notes"] = str(body["notes"])[:2000]
            if body.get("source_opened"):
                item["source_opened_at"] = now()  # Opening a link is not proof the source loaded.
            self.db.execute("UPDATE captures SET record=? WHERE id=?", (json.dumps(item), item_id))
            self.db.commit()
            return item

    def organise(self, body: dict) -> dict:
        item_id = body.get("id", "")
        if not isinstance(item_id, str) or not ID_RE.fullmatch(item_id):
            raise ValueError("Invalid item ID.")
        allowed = {"Web", "Interface", "Branding", "Typography", "Motion", "Illustration", "3D", "Editorial", "Print", "Product"}
        if "favorite" in body and type(body["favorite"]) is not bool:
            raise ValueError("Favorite must be true or false.")
        if "categories" in body:
            values = body["categories"]
            if not isinstance(values, list) or len(values) > 10 or any(not isinstance(v, str) or v not in allowed for v in values):
                raise ValueError("Invalid categories.")
        with self.lock:
            row = self.db.execute("SELECT record FROM captures WHERE id=?", (item_id,)).fetchone()
            if not row:
                raise ValueError("The capture no longer exists.")
            item = json.loads(row[0])
            values = item.setdefault("library", {"favorite": False, "categories": []})
            if "favorite" in body: values["favorite"] = body["favorite"]
            if "categories" in body: values["categories"] = list(dict.fromkeys(body["categories"]))
            # Organisation never changes capture chronology or source metadata.
            self.db.execute("UPDATE captures SET record=? WHERE id=?", (json.dumps(item), item_id))
            self.db.commit()
            return item

    def delete(self, item_id: str) -> None:
        if not ID_RE.fullmatch(item_id):
            raise ValueError("Invalid item ID.")
        with self.lock:
            self.db.execute("DELETE FROM captures WHERE id=?", (item_id,))
            self.db.commit()


class CaptureServer(ThreadingHTTPServer):
    daemon_threads = True
    def __init__(self, address, store, token, sources):
        super().__init__(address, Handler)
        self.store, self.token, self.sources = store, token, sources
        self.probe_lock = threading.Lock()
        self.bookmarks = BookmarkSync(store.directory, store, self.server_address[1])
        self.cloud = CloudSync(store, self.server_address[1])


class Handler(BaseHTTPRequestHandler):
    server_version = "ReferenceCaptureLab/0.1"

    def log_message(self, fmt, *args):
        # No header, body, URL query, or credential logging.
        if args and isinstance(args[0], str):
            print(f"[local] {self.command} {urlsplit(self.path).path} {args[1] if len(args)>1 else ''}")

    @property
    def port(self):
        return self.server.server_address[1]

    def allowed_host(self) -> bool:
        return self.headers.get("Host") in {f"127.0.0.1:{self.port}", f"localhost:{self.port}"}

    def is_main_origin(self) -> bool:
        return self.headers.get("Host") == f"127.0.0.1:{self.port}"

    def valid_origin(self) -> bool:
        origin = self.headers.get("Origin")
        return not origin or origin == f"http://127.0.0.1:{self.port}" or bool(re.fullmatch(r"chrome-extension://[a-p]{32}", origin))

    def authorised(self) -> bool:
        return self.is_main_origin() and self.valid_origin() and hmac.compare_digest(self.headers.get("X-Capture-Token", ""), self.server.token)

    def respond(self, status: int, payload: bytes, content_type="application/json", embed=False):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(payload)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        if embed:
            self.send_header("Content-Security-Policy", "default-src 'none'; script-src 'self' https://platform.twitter.com https://syndication.twitter.com; style-src 'unsafe-inline'; img-src https: data:; frame-src https://*.twitter.com https://*.x.com; connect-src https://*.twitter.com https://*.x.com; frame-ancestors http://127.0.0.1:" + str(self.port))
        else:
            self.send_header("X-Frame-Options", "DENY")
            self.send_header("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' blob: data: https://pbs.twimg.com; connect-src 'self'; media-src https://video.twimg.com; frame-src http://localhost:" + str(self.port) + "; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'")
        origin = self.headers.get("Origin")
        if self.is_main_origin() and origin and self.valid_origin():
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")
        self.end_headers()
        self.wfile.write(payload)

    def json(self, status: int, body):
        self.respond(status, json.dumps(body, ensure_ascii=False).encode())

    def read_body(self):
        if self.headers.get("Content-Type", "").split(";")[0] != "application/json":
            raise ValueError("Send application/json.")
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError as exc:
            raise ValueError("Invalid request length.") from exc
        if not 0 < length <= MAX_BODY:
            raise ValueError("Request is empty or too large.")
        body = json.loads(self.rfile.read(length))
        if not isinstance(body, dict):
            raise ValueError("Expected a JSON object.")
        return body

    def do_OPTIONS(self):
        if not self.allowed_host() or not self.is_main_origin() or not self.valid_origin():
            return self.json(403, {"error": "Origin not allowed."})
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", self.headers.get("Origin", f"http://127.0.0.1:{self.port}"))
        self.send_header("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type,X-Capture-Token")
        self.send_header("Access-Control-Allow-Private-Network", "true")
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_GET(self):
        path = urlsplit(self.path).path
        if not self.allowed_host():
            return self.json(403, {"error": "Local host only."})
        # Third-party X widget JS NEVER shares an origin with private captures.
        if not self.is_main_origin():
            match = re.fullmatch(r"/embed/(\d{1,25})", path)
            if match:
                post_id = match.group(1)
                content = (ROOT / "web/embed.html").read_text().replace("__POST_ID__", post_id)
                return self.respond(200, content.encode(), "text/html; charset=utf-8", embed=True)
            if path == "/embed.js":
                return self.respond(200, (ROOT / "web/embed.js").read_bytes(), "text/javascript", embed=True)
            return self.json(403, {"error": "The widget origin cannot access the capture library."})
        if path in {"/", "/index.html", "/lab", "/cloud"}:
            if self.headers.get("Sec-Fetch-Site") == "cross-site" and self.headers.get("Sec-Fetch-Mode") != "navigate":
                return self.json(403, {"error": "Cross-site read blocked."})
            content = (ROOT / "web" / ("cloud.html" if path == "/cloud" else "lab.html" if path == "/lab" else "index.html")).read_text().replace("__LOCAL_TOKEN__", html.escape(self.server.token, quote=True))
            return self.respond(200, content.encode(), "text/html; charset=utf-8")
        if path == "/oauth/supabase/callback":
            try:
                self.server.cloud.callback(dict(parse_qsl(urlsplit(self.path).query)))
                self.send_response(303)
                self.send_header("Location", "/cloud")
                self.send_header("Cache-Control", "no-store")
                self.send_header("Referrer-Policy", "no-referrer")
                self.send_header("Content-Length", "0")
                self.end_headers()
                return
            except CloudError as exc:
                return self.respond(400, ('<p>'+html.escape(str(exc))+'</p><a href="/cloud">Reconnect</a>').encode(), "text/html; charset=utf-8")
        if path == "/oauth/x/callback":
            try:
                self.server.bookmarks.callback_result(dict(parse_qsl(urlsplit(self.path).query)))
                content = '<p>X connected. No old bookmarks were imported.</p><a href="/">Return to Capture Lab</a>'
                return self.respond(200, content.encode(), "text/html; charset=utf-8")
            except SyncError as exc:
                content = '<p>' + html.escape(str(exc)) + '</p><a href="/">Return to Capture Lab</a>'
                return self.respond(400, content.encode(), "text/html; charset=utf-8")
        static = {"/cloud-local.js": ("cloud-local.js", "text/javascript"), "/app.js": ("app.js", "text/javascript"), "/style.css": ("style.css", "text/css"), "/lab.js": ("lab.js", "text/javascript"), "/lab.css": ("lab.css", "text/css")}
        icon = re.fullmatch(r"/icons/([a-z-]+)\.svg", path)
        if icon and (ROOT / "web/icons" / (icon.group(1) + ".svg")).is_file():
            return self.respond(200, (ROOT / "web/icons" / (icon.group(1) + ".svg")).read_bytes(), "image/svg+xml")
        if path in static:
            filename, mime = static[path]
            return self.respond(200, (ROOT / "web" / filename).read_bytes(), mime)
        if path == "/health":
            return self.json(200, {"ok": True, "service": "capture-lab"})
        if not self.authorised():
            return self.json(401, {"error": "Not connected. Start the server, then reload the extension."})
        if path == "/api/cloud/status":
            return self.json(200, self.server.cloud.status())
        if path in {"/api/state", "/api/export"}:
            report_file = self.server.store.directory / "x-probe.json"
            probe = json.loads(report_file.read_text()) if report_file.exists() else None
            # Only summary goes to the viewer; full API payload stays in a private file.
            if probe:
                probe = {k: v for k, v in probe.items() if k != "response"}
            return self.json(200, {"exported_at": now(), "sources": self.server.sources, "captures": self.server.store.all(), "x_probe": probe, "motion": {**motion_manifest(report_file), **motion_manifest(self.server.bookmarks.media_path)}, "x_images": {**image_manifest(report_file), **image_manifest(self.server.bookmarks.media_path)}, "x_metadata": {**metadata_manifest(report_file), **metadata_manifest(self.server.bookmarks.media_path)}, "bookmarks": self.server.bookmarks.status(), "cloud_sync": self.server.cloud.status(),
                                   "note": "Controlled fixtures and owner observations are not live-source validation. Product cost is unmeasured."})
        match = re.fullmatch(r"/api/image/([a-f0-9]{32})", path)
        if match:
            image = self.server.store.image(match.group(1))
            return self.respond(200, image, "image/jpeg") if image else self.json(404, {"error": "No preview captured."})
        return self.json(404, {"error": "Not found."})

    def do_POST(self):
        if not self.allowed_host() or not self.authorised():
            return self.json(403, {"error": "Capture request not authorised."})
        try:
            body = self.read_body()
            path = urlsplit(self.path).path
            if path.startswith("/api/cloud/"):
                if self.headers.get("Origin") != f"http://127.0.0.1:{self.port}" or body.get("confirm") is not True:
                    return self.json(403, {"error":"Use cloud controls in the local library."})
                if path == "/api/cloud/connect":
                    return self.json(200, self.server.cloud.connect(body.get("email")))
                if path == "/api/cloud/control":
                    return self.json(200, self.server.cloud.control(body.get("action")))
                return self.json(404, {"error":"Unknown cloud action."})
            if path.startswith("/api/bookmarks/"):
                if self.headers.get("Origin") != f"http://127.0.0.1:{self.port}":
                    return self.json(403, {"error": "Use bookmark controls in the local library."})
                sync = self.server.bookmarks
                if path == "/api/bookmarks/connect":
                    return self.json(200, {"authorize_url": sync.connect(body.get("client_id"))})
                if path == "/api/bookmarks/baseline" and body.get("confirm") is True:
                    return self.json(200, sync.baseline())
                if path == "/api/bookmarks/check" and body.get("confirm") is True:
                    return self.json(200, sync.sync_once())
                if path == "/api/bookmarks/control" and body.get("confirm") is True:
                    return self.json(200, sync.control(body.get("action")))
                return self.json(400, {"error": "Explicit bookmark action required."})
            if path == "/api/x-probe":
                if self.headers.get("Origin") != f"http://127.0.0.1:{self.port}" or body.get("confirm_five_posts") is not True:
                    return self.json(403, {"error": "Run this test explicitly from the local library."})
                samples = [s for s in self.server.sources if s.get("kind") == "x_post"]
                if len(samples) != 5:
                    raise ValueError("This test is limited to the five supplied X posts.")
                from x_probe import execute_lookup
                with self.server.probe_lock:
                    report = execute_lookup(body.get("bearer_token"), samples, self.server.store.directory / "x-probe.json")
                return self.json(200, {k:v for k,v in report.items() if k != "response"})
            if path == "/api/captures":
                return self.json(200, self.server.store.save(body))
            if path == "/api/library":
                return self.json(200, self.server.store.organise(body))
            if path == "/api/evaluation":
                return self.json(200, self.server.store.evaluate(body))
            return self.json(404, {"error": "Not found."})
        except (ValueError, TypeError, json.JSONDecodeError) as exc:
            return self.json(400, {"error": str(exc)[:400]})

    def do_DELETE(self):
        if not self.allowed_host() or not self.authorised():
            return self.json(403, {"error": "Delete not authorised."})
        match = re.fullmatch(r"/api/captures/([a-f0-9]{32})", urlsplit(self.path).path)
        if not match:
            return self.json(404, {"error": "Not found."})
        self.server.store.delete(match.group(1))
        return self.json(200, {"deleted": True})


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--no-open", action="store_true", help="Do not open a browser tab.")
    args = parser.parse_args()
    directory = ROOT / ".capture-data"
    store = Store(directory)
    token_file = directory / "local-token"
    if not token_file.exists():
        private_write(token_file, secrets.token_urlsafe(32))
    token = token_file.read_text().strip()
    config = {"base": "http://127.0.0.1:8765", "token": token}
    private_write(ROOT / "extension/config.local.js", "globalThis.CAPTURE_CONFIG = " + json.dumps(config) + ";\n")
    sources = json.loads((ROOT / "sources.json").read_text())["sources"]
    try:
        server = CaptureServer(("127.0.0.1", 8765), store, token, sources)
    except OSError as exc:
        if exc.errno in {errno.EACCES, errno.EPERM}:
            reason = "Local listening is blocked by execution permissions; request authorised localhost access."
        elif exc.errno == errno.EADDRINUSE:
            reason = "Port 8765 is already in use."
        else:
            reason = "Check the reported local networking error."
        raise SystemExit(f"Could not start local server: {exc}. {reason}")
    print("\nReference Capture Lab — local technical test, not the product UI")
    print("Open http://127.0.0.1:8765")
    print("Load the extension/ folder in Chrome after starting this server.")
    print("Paid reads require an explicit test or enabled bookmark sync. Keep this terminal open; Ctrl+C stops it.\n")
    server.bookmarks.start_worker()
    server.cloud.start_worker()
    if not args.no_open:
        threading.Timer(0.5, lambda: webbrowser.open("http://127.0.0.1:8765")).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped. Local captures remain in .capture-data/.")
    finally:
        server.cloud.close()
        server.bookmarks.close()
        server.server_close()
        store.db.close()


if __name__ == "__main__":
    main()
