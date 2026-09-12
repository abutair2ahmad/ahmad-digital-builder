#!/usr/bin/env python3
"""The only module that writes to Instagram.

Publishing is two calls: create a media container from a public image URL, then
publish that container. Both are wrapped so that:

  * `account.assert_owns(brand)` runs before either call — a post can only go out
    through its own brand's lane.
  * The container id is handed back to the caller the moment it exists, so the
    ledger can record it before the publish call is attempted. A run interrupted
    between the two steps resumes the container instead of creating a second one.
  * Nothing retries automatically. A failed publish is logged once, sanitised, and
    left alone; the scheduler decides whether a later run picks the slot up. This
    is deliberate — an automatic retry loop against a partially-succeeded publish
    is how accounts end up double-posting.

Every error string passes through `scrub()` before leaving this module, because
Graph API errors quote the request back and the request carries the token.
"""

import json
import time
import urllib.error
import urllib.parse
import urllib.request

from .envfile import scrub

DEFAULT_HOST = "graph.instagram.com"     # Instagram API with Instagram Login
GRAPH_SCHEME = "https"                   # only the test harness points this at http
DEFAULT_VERSION = "v23.0"
REQUEST_TIMEOUT = 30
STATUS_POLL_ATTEMPTS = 12
STATUS_POLL_SECONDS = 3


class PublishError(RuntimeError):
    """A publish attempt failed. The message is always safe to log."""


def _post(host, version, path, params, token):
    url = "%s://%s/%s/%s" % (GRAPH_SCHEME, host, version, path.lstrip("/"))
    body = urllib.parse.urlencode(dict(params, access_token=token)).encode("utf-8")
    request = urllib.request.Request(url, data=body, method="POST")
    try:
        with urllib.request.urlopen(request, timeout=REQUEST_TIMEOUT) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", "replace")
        try:
            error = json.loads(detail).get("error", {})
            message = "%s (code %s, subcode %s)" % (
                error.get("message", "")[:200], error.get("code"), error.get("error_subcode"))
        except ValueError:
            message = detail[:200]
        raise PublishError("HTTP %s from %s: %s" % (exc.code, path, scrub(message, [token])))
    except urllib.error.URLError as exc:
        raise PublishError("could not reach %s: %s" % (host, type(exc.reason).__name__))


def _get(host, version, path, params, token):
    query = urllib.parse.urlencode(dict(params, access_token=token))
    url = "%s://%s/%s/%s?%s" % (GRAPH_SCHEME, host, version, path.lstrip("/"), query)
    try:
        with urllib.request.urlopen(url, timeout=REQUEST_TIMEOUT) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", "replace")
        raise PublishError("HTTP %s from %s: %s" % (exc.code, path, scrub(detail[:200], [token])))
    except urllib.error.URLError as exc:
        raise PublishError("could not reach %s: %s" % (host, type(exc.reason).__name__))


def verify_account(account, host=DEFAULT_HOST, version=DEFAULT_VERSION):
    """Read-only identity check. Confirms the token belongs to the expected profile."""
    data = _get(host, version, "me", {"fields": "user_id,username,account_type"}, account.token)
    return {
        "username": data.get("username"),
        "user_id": str(data.get("user_id") or ""),
        "account_type": data.get("account_type"),
        "id_matches_env": str(data.get("user_id") or "") == str(account.ig_id),
    }


def publishing_limit(account, host=DEFAULT_HOST, version=DEFAULT_VERSION):
    """How much of the 24-hour publishing quota is already used."""
    data = _get(host, version, "%s/content_publishing_limit" % account.ig_id,
                {"fields": "config,quota_usage"}, account.token)
    row = (data.get("data") or [{}])[0]
    return {"quota_usage": row.get("quota_usage"), "config": row.get("config")}


def create_container(account, brand, image_url, caption, host=DEFAULT_HOST, version=DEFAULT_VERSION):
    """Step 1. Meta fetches `image_url` itself, so it must be public HTTPS."""
    account.assert_owns(brand)
    data = _post(host, version, "%s/media" % account.ig_id,
                 {"image_url": image_url, "caption": caption}, account.token)
    container_id = data.get("id")
    if not container_id:
        raise PublishError("Instagram returned no container id")
    return str(container_id)


def wait_until_ready(account, container_id, host=DEFAULT_HOST, version=DEFAULT_VERSION):
    """Poll the container until Meta has finished fetching and processing the image.

    Not a retry loop — it is the documented way to learn whether the container is
    publishable. An ERROR or EXPIRED verdict stops immediately.
    """
    last = None
    for _ in range(STATUS_POLL_ATTEMPTS):
        data = _get(host, version, container_id, {"fields": "status_code,status"}, account.token)
        last = data.get("status_code")
        if last == "FINISHED":
            return True
        if last in ("ERROR", "EXPIRED"):
            raise PublishError("container %s status %s: %s"
                               % (container_id, last, str(data.get("status"))[:160]))
        time.sleep(STATUS_POLL_SECONDS)
    raise PublishError("container %s not ready after %d polls (last status %s)"
                       % (container_id, STATUS_POLL_ATTEMPTS, last))


def publish_container(account, brand, container_id, host=DEFAULT_HOST, version=DEFAULT_VERSION):
    """Step 2. Returns the published media id."""
    account.assert_owns(brand)
    data = _post(host, version, "%s/media_publish" % account.ig_id,
                 {"creation_id": container_id}, account.token)
    media_id = data.get("id")
    if not media_id:
        raise PublishError("Instagram returned no media id for container %s" % container_id)
    return str(media_id)


# ---------------------------------------------------------------------------
# Stories. Additive only — nothing above this line is changed, and the feed
# path (create_container/publish_container for media_type=IMAGE) never calls
# into any of this. A Story has no caption via the Graph API, so this is a
# narrower request than the feed's.

def describe_story_container_request(account, brand, video_url, host=DEFAULT_HOST, version=DEFAULT_VERSION):
    """The exact request a Story container-create call would send — built, never sent.

    Lets the pipeline be verified end-to-end (endpoint, method, every param) with
    zero network access and zero risk of publishing, by construction rather than
    by a --dry-run flag someone could forget.
    """
    account.assert_owns(brand)
    return {
        "method": "POST",
        "url": "%s://%s/%s/%s/media" % (GRAPH_SCHEME, host, version, account.ig_id),
        "params": {
            "media_type": "STORIES",
            "video_url": video_url,
            "access_token": "<%s>" % account.tag,
        },
    }


def create_story_container(account, brand, video_url, host=DEFAULT_HOST, version=DEFAULT_VERSION):
    """Step 1 for a video Story."""
    return create_video_container(account, brand, "STORIES", video_url,
                                  host=host, version=version)


def create_reel_container(account, brand, video_url, caption, host=DEFAULT_HOST, version=DEFAULT_VERSION):
    """Step 1 for a Reel. Meta fetches the public HTTPS video URL."""
    return create_video_container(account, brand, "REELS", video_url, caption=caption,
                                  host=host, version=version)


def create_video_container(account, brand, media_type, video_url, caption=None,
                           host=DEFAULT_HOST, version=DEFAULT_VERSION):
    """Create a video container for the isolated account lane."""
    account.assert_owns(brand)
    if media_type not in ("STORIES", "REELS"):
        raise PublishError("unsupported video media type %s" % media_type)
    params = {"media_type": media_type, "video_url": video_url}
    if caption and media_type == "REELS":
        params["caption"] = caption
    data = _post(host, version, "%s/media" % account.ig_id, params, account.token)
    container_id = data.get("id")
    if not container_id:
        raise PublishError("Instagram returned no video container id")
    return str(container_id)


def publish_video_container(account, brand, container_id, host=DEFAULT_HOST, version=DEFAULT_VERSION):
    """Step 2 for a Reel or Story. Returns the published media id."""
    account.assert_owns(brand)
    data = _post(host, version, "%s/media_publish" % account.ig_id,
                 {"creation_id": container_id}, account.token)
    media_id = data.get("id")
    if not media_id:
        raise PublishError("Instagram returned no media id for video container %s" % container_id)
    return str(media_id)
