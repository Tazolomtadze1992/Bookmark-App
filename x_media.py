"""Read-only projection of the explicit API test; never fetch or archive media."""
import json
from urllib.parse import urlsplit


def motion_manifest(report_file):
    if not report_file.exists():
        return {}
    try:
        report = json.loads(report_file.read_text())
        if report.get('http_status') != 200:
            return {}
        response = report.get('response') or {}
        media = {m.get('media_key'): m for m in response.get('includes', {}).get('media', [])}
        result = {}
        for post in response.get('data', []):
            pid = post.get('id')
            if pid not in report.get('sample_post_ids', []):
                continue
            # Only the primary attachment, never a quoted/replied-to video's URL.
            keys = post.get('attachments', {}).get('media_keys', [])
            m = media.get(keys[0], {}) if keys else {}
            variants = []
            for v in m.get('variants', []):
                try:
                    u = urlsplit(v.get('url', ''))
                    if v.get('content_type') == 'video/mp4' and u.scheme == 'https' and u.hostname == 'video.twimg.com' and not u.username and not u.password and u.port in (None,443):
                        variants.append(v)
                except (ValueError,TypeError):
                    continue
            if m.get('type') not in ('video','animated_gif') or not variants:
                continue
            # Prefer the best supplied preview up to 12 Mbps (1080p in our real sample).
            # Avoid the 25 Mbps 4K renditions for looping grid previews.
            variants.sort(key=lambda v: v.get('bit_rate',0))
            preview_variants = [v for v in variants if v.get('bit_rate',0) <= 12_000_000]
            chosen = preview_variants[-1] if preview_variants else variants[0]
            width,height=m.get('width'),m.get('height')
            if not isinstance(width,int) or not isinstance(height,int) or not 0<width<20000 or not 0<height<20000:
                continue
            result[pid]={'url':chosen['url'],'width':width,'height':height,'duration_ms':m.get('duration_ms'),'type':m['type'],'provenance':'official_api_probe','fetched_at':report.get('finished_at')}
        return result
    except (ValueError,TypeError,AttributeError,KeyError):
        return {}


def image_manifest(report_file):
    """Only X's media-image origin may supply bookmark photos/video posters."""
    if not report_file.exists():
        return {}
    try:
        report = json.loads(report_file.read_text())
        media = {m['media_key']: m for m in report['response'].get('includes', {}).get('media', [])}
        result = {}
        for post in report['response'].get('data', []):
            if post['id'] not in report.get('sample_post_ids', []):
                continue
            keys = post.get('attachments', {}).get('media_keys', [])
            m = media.get(keys[0], {}) if keys else {}
            url = m.get('preview_image_url') or m.get('url')
            if not url:
                continue
            u = urlsplit(url)
            if u.scheme == 'https' and u.hostname == 'pbs.twimg.com' and not u.username and not u.password and u.port in (None, 443):
                result[post['id']] = url
        return result
    except (ValueError, TypeError, AttributeError, KeyError):
        return {}


def metadata_manifest(path):
    """Display only saved public post/author fields. Never fetch or expose credentials."""
    import json
    from urllib.parse import urlsplit
    try:
        report = json.loads(path.read_text())
        if report.get("http_status") != 200: return {}
        response = report.get("response", {})
        users = {u.get("id"): u for u in response.get("includes", {}).get("users", [])}
        allowed = set(report.get("sample_post_ids", []))
        out = {}
        for post in response.get("data", []):
            if post.get("id") not in allowed: continue
            user = users.get(post.get("author_id"), {})
            avatar = user.get("profile_image_url", "")
            try:
                url = urlsplit(avatar)
                if not (url.scheme == "https" and url.hostname == "pbs.twimg.com" and not url.username and not url.password and url.port in (None,443)): avatar = ""
            except ValueError: avatar = ""
            out[post["id"]] = {"text": str(post.get("text", ""))[:10000], "published_at": post.get("created_at"), "author_name": str(user.get("name", ""))[:300], "author_handle": str(user.get("username", ""))[:100], "avatar": avatar}
        return out
    except (OSError, ValueError, TypeError, KeyError):
        return {}
