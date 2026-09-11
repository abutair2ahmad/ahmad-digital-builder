#!/usr/bin/env python3
"""Publish the rendered PNG to a public HTTPS URL.

This step exists because of how Instagram's API works: a media container is created
from an `image_url` that Meta's own servers fetch. Image bytes cannot be POSTed to
the Graph API, so a locally rendered file is not publishable until it is reachable
over public HTTPS.

Two backends:
  r2    — Cloudflare R2, signed with AWS SigV4 (R2 is S3-compatible). The production path.
  local — copies into a directory served by something else. For testing only; the
          note it returns says so, because a URL that only resolves on one laptop
          is not a publishable image.

Credentials are read from the environment mapping passed in and never logged.
"""

import datetime
import hashlib
import hmac
import os
import shutil
import time
import urllib.error
import urllib.request

ALGORITHM = "AWS4-HMAC-SHA256"
REGION = "auto"          # R2 ignores region but SigV4 requires one
SERVICE = "s3"


class ImageHostError(RuntimeError):
    pass


def _sha256(data):
    return hashlib.sha256(data).hexdigest()


def _sign(key, message):
    return hmac.new(key, message.encode("utf-8"), hashlib.sha256).digest()


def _signing_key(secret, date_stamp, region=REGION, service=SERVICE):
    key = _sign(("AWS4" + secret).encode("utf-8"), date_stamp)
    key = _sign(key, region)
    key = _sign(key, service)
    return _sign(key, "aws4_request")


def put_r2(env, key, body, content_type="image/png", timeout=60, attempts=3):
    """PUT one object into an R2 bucket with a SigV4 signature. Returns the public URL."""
    required = ("R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY",
                "R2_BUCKET", "R2_PUBLIC_BASE_URL")
    missing = [name for name in required if not env.get(name)]
    if missing:
        raise ImageHostError("R2 is not configured; missing: %s" % ", ".join(missing))

    host = "%s.r2.cloudflarestorage.com" % env["R2_ACCOUNT_ID"]
    path = "/%s/%s" % (env["R2_BUCKET"].strip("/"), key.lstrip("/"))
    now = datetime.datetime.now(datetime.timezone.utc)
    amz_date = now.strftime("%Y%m%dT%H%M%SZ")
    date_stamp = now.strftime("%Y%m%d")
    payload_hash = _sha256(body)

    headers = {
        "host": host,
        "x-amz-content-sha256": payload_hash,
        "x-amz-date": amz_date,
        "content-type": content_type,
    }
    signed_headers = ";".join(sorted(headers))
    canonical_headers = "".join("%s:%s\n" % (k, headers[k]) for k in sorted(headers))
    canonical_request = "\n".join(
        ["PUT", path, "", canonical_headers, signed_headers, payload_hash]
    )
    scope = "%s/%s/%s/aws4_request" % (date_stamp, REGION, SERVICE)
    to_sign = "\n".join([ALGORITHM, amz_date, scope, _sha256(canonical_request.encode("utf-8"))])
    signature = hmac.new(
        _signing_key(env["R2_SECRET_ACCESS_KEY"], date_stamp), to_sign.encode("utf-8"), hashlib.sha256
    ).hexdigest()

    authorization = "%s Credential=%s/%s, SignedHeaders=%s, Signature=%s" % (
        ALGORITHM, env["R2_ACCESS_KEY_ID"], scope, signed_headers, signature)

    request = urllib.request.Request(
        "https://%s%s" % (host, path), data=body, method="PUT",
        headers={"Authorization": authorization, "x-amz-content-sha256": payload_hash,
                 "x-amz-date": amz_date, "Content-Type": content_type,
                 "Content-Length": str(len(body))},
    )
    for attempt in range(attempts):
        try:
            with urllib.request.urlopen(request, timeout=timeout) as response:
                if response.status not in (200, 201):
                    raise ImageHostError("R2 returned HTTP %s" % response.status)
                break
        except urllib.error.HTTPError as exc:
            # Body may echo the request; only the status is safe to surface.
            raise ImageHostError("R2 upload rejected with HTTP %s" % exc.code)
        except urllib.error.URLError as exc:
            if attempt == attempts - 1:
                raise ImageHostError("R2 upload could not connect: %s" % type(exc.reason).__name__)
            time.sleep(2 ** attempt)

    return "%s/%s" % (env["R2_PUBLIC_BASE_URL"].rstrip("/"), key.lstrip("/"))


def put_local(env, key, source_path):
    """Copy into a locally served directory. Testing only."""
    root = env.get("IMAGE_LOCAL_DIR")
    base = env.get("IMAGE_PUBLIC_BASE_URL")
    if not root or not base:
        raise ImageHostError("local image host needs IMAGE_LOCAL_DIR and IMAGE_PUBLIC_BASE_URL")
    target = os.path.join(root, key.lstrip("/"))
    os.makedirs(os.path.dirname(target), exist_ok=True)
    shutil.copy2(source_path, target)
    return "%s/%s" % (base.rstrip("/"), key.lstrip("/"))


def upload(env, key, source_path):
    """Upload via the configured backend. Returns (url, backend)."""
    backend = (env.get("IMAGE_HOST") or "r2").strip().lower()
    if backend == "local":
        return put_local(env, key, source_path), "local"
    if backend == "r2":
        with open(source_path, "rb") as handle:
            body = handle.read()
        return put_r2(env, key, body), "r2"
    raise ImageHostError("unknown IMAGE_HOST %r (expected 'r2' or 'local')" % backend)


def configured(env):
    """Whether the configured backend has everything it needs, without revealing values."""
    backend = (env.get("IMAGE_HOST") or "r2").strip().lower()
    if backend == "local":
        needed = ("IMAGE_LOCAL_DIR", "IMAGE_PUBLIC_BASE_URL")
    else:
        needed = ("R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY",
                  "R2_BUCKET", "R2_PUBLIC_BASE_URL")
    missing = [n for n in needed if not env.get(n)]
    return {"backend": backend, "ready": not missing, "missing": missing}
