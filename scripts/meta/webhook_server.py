#!/usr/bin/env python3
"""Meta (Facebook + Instagram) webhook receiver for the MoveWell store.

Two endpoints on one path (default /api/meta/webhook):
  GET  — Meta's subscription handshake: echoes hub.challenge when hub.verify_token matches.
  POST — event delivery: rejects any body whose X-Hub-Signature-256 does not match the app
         secret of the app that sent it — INSTAGRAM_APP_SECRET for Instagram deliveries
         (object="instagram", i.e. Instagram API with Instagram Login), META_APP_SECRET for
         Facebook/Meta deliveries.

Secrets are read from .env only. Nothing here ever prints a token, a secret or a request
query string unscrubbed. It does not reply to events and does not call the Graph API.

Usage: python3 scripts/meta/webhook_server.py [--host H] [--port N] [--path P] [--env PATH]
"""

import argparse
import hashlib
import hmac
import json
import os
import sys
import urllib.parse
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import instagram_autoreply
from meta_connect import PROJECT_ROOT, mask_secret, read_env

DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 8787
DEFAULT_PATH = "/api/meta/webhook"
MAX_BODY_BYTES = 1024 * 1024
SIGNATURE_HEADER = "X-Hub-Signature-256"
SIGNATURE_PREFIX = "sha256="
INSTAGRAM_OBJECTS = ("instagram",)


def scrub(text, secrets):
    """Replace every known secret with a placeholder, raw and percent-encoded.

    Query strings carry hub.verify_token, so anything derived from a request line
    must pass through here before it reaches a log."""
    out = str(text)
    for secret in secrets or ():
        if not secret or len(secret) < 4:
            continue
        for form in (secret, urllib.parse.quote(secret, safe="")):
            out = out.replace(form, "[REDACTED]")
    return out


def build_logger(secrets, stream=None):
    """Return a log(message) that timestamps and scrubs every line."""
    target = stream if stream is not None else sys.stdout

    def log(message):
        stamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
        target.write("[%s] %s\n" % (stamp, scrub(message, secrets)))
        target.flush()

    return log


def first(values):
    return values[0] if values else None


def verify_challenge(params, verify_token):
    """Handshake result as (status, body). Anything short of a full match is 403."""
    mode = first(params.get("hub.mode"))
    sent_token = first(params.get("hub.verify_token"))
    challenge = first(params.get("hub.challenge"))
    if (
        mode == "subscribe"
        and verify_token
        and sent_token is not None
        and challenge is not None
        and hmac.compare_digest(sent_token, verify_token)
    ):
        return 200, challenge
    return 403, "forbidden"


def expected_signature(body, app_secret):
    digest = hmac.new(app_secret.encode("utf-8"), body, hashlib.sha256).hexdigest()
    return SIGNATURE_PREFIX + digest


def signature_is_valid(body, header, app_secret):
    if not header or not app_secret:
        return False
    return hmac.compare_digest(header.strip(), expected_signature(body, app_secret))


def signature_state(header):
    """Describe the header for a log without ever revealing its value."""
    if header is None:
        return "missing"
    header = header.strip()
    if not header:
        return "present but empty"
    if not header.startswith(SIGNATURE_PREFIX):
        return "present but not %s…" % SIGNATURE_PREFIX
    return "present"


def claimed_object(body):
    """Best-effort read of the top-level "object" of a body we have NOT verified yet.

    Used only to choose which app secret the signature is checked against. Claiming to be
    Instagram weakens nothing: the body is still rejected unless it matches that secret."""
    try:
        payload = json.loads(body.decode("utf-8"))
    except (ValueError, UnicodeDecodeError):
        return None
    if not isinstance(payload, dict):
        return None
    value = payload.get("object")
    return value if isinstance(value, str) else None


def safe_object_label(value):
    """An unverified `object` is attacker-controlled; only a short plain word reaches a log."""
    if not value:
        return "?"
    if len(value) <= 24 and all(ch.isalnum() or ch in "_-" for ch in value):
        return value
    return "?"


def select_secret(body, config):
    """Pick (source name, secret) for the app this body claims to come from.

    Instagram deliveries are signed with the Instagram app secret, everything else with the
    Facebook/Meta one. Without INSTAGRAM_APP_SECRET we fall back to META_APP_SECRET so an
    existing Facebook-only setup keeps behaving exactly as before."""
    if claimed_object(body) in INSTAGRAM_OBJECTS and config.get("instagram_app_secret"):
        return "INSTAGRAM_APP_SECRET", config["instagram_app_secret"]
    return "META_APP_SECRET", config.get("app_secret")


def summarize_event(payload):
    """Describe an event using ids, types and counts only.

    Deliberately excludes message text, user names and anything credential-shaped."""
    if not isinstance(payload, dict):
        return ["payload is not a JSON object"]

    entries = payload.get("entry")
    entries = entries if isinstance(entries, list) else []
    lines = ["object=%s entries=%d" % (payload.get("object", "?"), len(entries))]

    for index, entry in enumerate(entries):
        if not isinstance(entry, dict):
            lines.append("entry[%d] not an object" % index)
            continue
        parts = ["entry[%d] id=%s" % (index, entry.get("id", "?"))]
        if entry.get("time") is not None:
            parts.append("time=%s" % entry["time"])

        changes = entry.get("changes")
        if isinstance(changes, list) and changes:
            fields = [c.get("field", "?") for c in changes if isinstance(c, dict)]
            parts.append("changes=%d fields=%s" % (len(changes), ",".join(fields) or "?"))

        messaging = entry.get("messaging")
        if isinstance(messaging, list) and messaging:
            kinds = sorted({
                key
                for item in messaging if isinstance(item, dict)
                for key in item
                if key not in ("sender", "recipient", "timestamp")
            })
            parts.append("messaging=%d types=%s" % (len(messaging), ",".join(kinds) or "?"))

        lines.append(" ".join(parts))
    return lines


def make_handler(config):
    """Build a request handler bound to one config dict (path, verify_token, app_secret, log)."""

    class WebhookHandler(BaseHTTPRequestHandler):
        server_version = "MoveWellMetaWebhook/1.0"
        protocol_version = "HTTP/1.1"

        def log_message(self, fmt, *args):
            # The default handler writes the raw request line, which contains hub.verify_token.
            config["log"]("%s %s" % (self.address_string(), fmt % args))

        def respond(self, status, body, content_type="text/plain; charset=utf-8"):
            payload = body.encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)

        def do_GET(self):
            parsed = urllib.parse.urlparse(self.path)
            if parsed.path != config["path"]:
                self.respond(404, "not found")
                return
            params = urllib.parse.parse_qs(parsed.query)
            status, body = verify_challenge(params, config["verify_token"])
            config["log"]("GET verification → %d" % status)
            self.respond(status, body)

        def do_POST(self):
            parsed = urllib.parse.urlparse(self.path)
            if parsed.path != config["path"]:
                self.respond(404, "not found")
                return

            try:
                length = int(self.headers.get("Content-Length") or 0)
            except ValueError:
                length = -1
            if length < 0:
                self.respond(400, "bad content-length")
                return
            if length > MAX_BODY_BYTES:
                config["log"]("POST rejected → 413 (body %d bytes)" % length)
                self.respond(413, "payload too large")
                return

            body = self.rfile.read(length) if length else b""

            header = self.headers.get(SIGNATURE_HEADER)
            source, secret = select_secret(body, config)
            if not signature_is_valid(body, header, secret):
                config["log"](
                    "POST rejected → 403 (%s %s · checked against %s%s · object=%s · %d bytes)"
                    % (
                        SIGNATURE_HEADER,
                        signature_state(header),
                        source,
                        "" if secret else " (unset)",
                        safe_object_label(claimed_object(body)),
                        len(body),
                    )
                )
                self.respond(403, "invalid signature")
                return

            try:
                payload = json.loads(body.decode("utf-8"))
            except (ValueError, UnicodeDecodeError):
                config["log"]("POST rejected → 400 (malformed JSON, %d bytes)" % len(body))
                self.respond(400, "malformed json")
                return

            self.respond(200, "EVENT_RECEIVED")
            config["log"]("POST accepted · %s verified with %s" % (SIGNATURE_HEADER, source))
            for line in summarize_event(payload):
                config["log"]("POST event · %s" % line)

            responder = config.get("autoreply")
            if responder is not None:
                # Meta already has its 200; a reply failure must never change that.
                try:
                    responder.handle(payload, source)
                except Exception as exc:
                    config["log"]("autoreply error · %s" % type(exc).__name__)

    return WebhookHandler


def build_config(verify_token, app_secret, path=DEFAULT_PATH, log=None, instagram_app_secret=None,
                 autoreply=None):
    return {
        "path": path,
        "verify_token": verify_token,
        "app_secret": app_secret,
        "instagram_app_secret": instagram_app_secret,
        "autoreply": autoreply,
        "log": log or build_logger([verify_token, app_secret, instagram_app_secret]),
    }


def main(argv=None):
    parser = argparse.ArgumentParser(description="خادم استقبال webhooks من Meta لمتجر MoveWell")
    parser.add_argument("--env", default=os.path.join(PROJECT_ROOT, ".env"))
    parser.add_argument("--host", default=DEFAULT_HOST)
    parser.add_argument("--port", type=int, default=DEFAULT_PORT)
    parser.add_argument("--path", default=DEFAULT_PATH)
    args = parser.parse_args(argv)

    env = read_env(args.env)
    verify_token = env.get("META_WEBHOOK_VERIFY_TOKEN") or os.environ.get("META_WEBHOOK_VERIFY_TOKEN")
    app_secret = env.get("META_APP_SECRET") or os.environ.get("META_APP_SECRET")
    instagram_app_secret = (
        env.get("INSTAGRAM_APP_SECRET") or os.environ.get("INSTAGRAM_APP_SECRET")
    )

    missing = [
        name for name, value in
        (("META_WEBHOOK_VERIFY_TOKEN", verify_token), ("META_APP_SECRET", app_secret))
        if not value
    ]
    if missing:
        print("❌ ناقص في %s: %s" % (os.path.relpath(args.env, PROJECT_ROOT), "، ".join(missing)))
        print("   انسخ `.env.example` إلى `.env` وعبّئ الحقلين. الخادم لا يعمل بدونهما —")
        print("   بدون `META_APP_SECRET` لا يمكن التحقق من توقيع أي حدث.")
        return 2

    # .env wins over the process environment; every account token joins the scrub list.
    merged = dict(os.environ)
    merged.update(env)
    account_tokens = [merged.get(token_var) for _n, _i, token_var in instagram_autoreply.ACCOUNT_SLOTS]
    log = build_logger([verify_token, app_secret, instagram_app_secret] + account_tokens)

    try:
        responder = instagram_autoreply.build_responder(merged, log)
    except ValueError as exc:
        print("❌ إعداد حسابات إنستغرام غير صالح: %s" % exc)
        return 2

    config = build_config(verify_token, app_secret, args.path, log,
                          instagram_app_secret=instagram_app_secret,
                          autoreply=responder)
    config["log"]("verify token: %s · app secret: %s" % (mask_secret(verify_token), mask_secret(app_secret)))
    config["log"]("instagram app secret: %s" % mask_secret(instagram_app_secret))
    if not instagram_app_secret:
        config["log"]("⚠️  INSTAGRAM_APP_SECRET فارغ — أحداث إنستغرام ستُفحص بـ META_APP_SECRET وقد تُرفض 403")

    config["log"]("autoreply: accounts=%d · sending=%s"
                  % (len(responder.accounts), "ON" if responder.enabled else "OFF (dry run)"))
    still_missing = instagram_autoreply.missing_account_config(merged)
    if still_missing:
        config["log"]("autoreply: ناقص في .env → %s" % "، ".join(still_missing))

    server = ThreadingHTTPServer((args.host, args.port), make_handler(config))
    config["log"]("listening on http://%s:%d%s" % (args.host, args.port, args.path))
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        config["log"]("stopped")
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
