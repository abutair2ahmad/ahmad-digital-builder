#!/usr/bin/env python3
"""Offline tests for webhook_server.py — يفحص مصافحة التحقق، توقيع HMAC، الـ JSON التالف،
وأن أي سر لا يظهر في السجلات. يشغّل الخادم على 127.0.0.1 بمنفذ عشوائي، ولا يتصل بالإنترنت."""

import io
import json
import os
import sys
import threading
import unittest
import urllib.error
import urllib.parse
import urllib.request
from http.server import ThreadingHTTPServer

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import webhook_server as ws

VERIFY_TOKEN = "movewell-verify-4f2b9c7d"
APP_SECRET = "app-secret-9a8b7c6d5e4f"
IG_APP_SECRET = "ig-app-secret-1b2c3d4e5f60"
CHALLENGE = "1158201444"


class TestScrub(unittest.TestCase):
    def test_removes_raw_and_encoded_secret(self):
        secret = "tok en/with+chars"
        text = "a=%s b=%s" % (secret, urllib.parse.quote(secret, safe=""))
        cleaned = ws.scrub(text, [secret])
        self.assertNotIn(secret, cleaned)
        self.assertNotIn(urllib.parse.quote(secret, safe=""), cleaned)
        self.assertEqual(cleaned.count("[REDACTED]"), 2)

    def test_ignores_empty_and_tiny_values(self):
        self.assertEqual(ws.scrub("abc", [None, "", "ab"]), "abc")


class TestVerifyChallenge(unittest.TestCase):
    def params(self, **overrides):
        values = {"hub.mode": ["subscribe"], "hub.verify_token": [VERIFY_TOKEN], "hub.challenge": [CHALLENGE]}
        values.update(overrides)
        return {k: v for k, v in values.items() if v is not None}

    def test_valid_returns_challenge(self):
        self.assertEqual(ws.verify_challenge(self.params(), VERIFY_TOKEN), (200, CHALLENGE))

    def test_wrong_token_is_forbidden(self):
        status, _ = ws.verify_challenge(self.params(**{"hub.verify_token": ["wrong"]}), VERIFY_TOKEN)
        self.assertEqual(status, 403)

    def test_wrong_mode_is_forbidden(self):
        status, _ = ws.verify_challenge(self.params(**{"hub.mode": ["unsubscribe"]}), VERIFY_TOKEN)
        self.assertEqual(status, 403)

    def test_missing_challenge_is_forbidden(self):
        status, _ = ws.verify_challenge(self.params(**{"hub.challenge": None}), VERIFY_TOKEN)
        self.assertEqual(status, 403)

    def test_unconfigured_server_never_verifies(self):
        status, _ = ws.verify_challenge(self.params(**{"hub.verify_token": [""]}), "")
        self.assertEqual(status, 403)


class TestSignature(unittest.TestCase):
    def test_accepts_matching_signature(self):
        body = b'{"object":"page"}'
        self.assertTrue(ws.signature_is_valid(body, ws.expected_signature(body, APP_SECRET), APP_SECRET))

    def test_rejects_tampered_body(self):
        signature = ws.expected_signature(b'{"object":"page"}', APP_SECRET)
        self.assertFalse(ws.signature_is_valid(b'{"object":"instagram"}', signature, APP_SECRET))

    def test_rejects_other_secret(self):
        body = b'{"object":"page"}'
        self.assertFalse(ws.signature_is_valid(body, ws.expected_signature(body, "other"), APP_SECRET))

    def test_rejects_missing_header(self):
        self.assertFalse(ws.signature_is_valid(b"{}", None, APP_SECRET))

    def test_instagram_body_verifies_only_with_the_instagram_secret(self):
        body = b'{"object":"instagram"}'
        self.assertTrue(ws.signature_is_valid(body, ws.expected_signature(body, IG_APP_SECRET), IG_APP_SECRET))
        self.assertFalse(ws.signature_is_valid(body, ws.expected_signature(body, APP_SECRET), IG_APP_SECRET))


class TestSignatureState(unittest.TestCase):
    """The state must describe the header without echoing it."""

    def test_missing_header(self):
        self.assertEqual(ws.signature_state(None), "missing")

    def test_empty_header_is_not_reported_as_missing(self):
        self.assertEqual(ws.signature_state("   "), "present but empty")

    def test_header_without_prefix(self):
        self.assertIn("not sha256=", ws.signature_state("deadbeef"))

    def test_well_formed_header(self):
        self.assertEqual(ws.signature_state("sha256=" + "a" * 64), "present")

    def test_state_never_contains_the_value(self):
        value = "sha256=" + "9f" * 32
        self.assertNotIn("9f9f", ws.signature_state(value))


class TestSecretSelection(unittest.TestCase):
    def config(self, instagram=IG_APP_SECRET):
        return ws.build_config(VERIFY_TOKEN, APP_SECRET, ws.DEFAULT_PATH,
                               log=lambda _m: None, instagram_app_secret=instagram)

    def test_instagram_object_picks_the_instagram_secret(self):
        self.assertEqual(ws.select_secret(b'{"object":"instagram"}', self.config()),
                         ("INSTAGRAM_APP_SECRET", IG_APP_SECRET))

    def test_page_object_keeps_the_meta_secret(self):
        self.assertEqual(ws.select_secret(b'{"object":"page"}', self.config()),
                         ("META_APP_SECRET", APP_SECRET))

    def test_unparsable_body_keeps_the_meta_secret(self):
        self.assertEqual(ws.select_secret(b"{not json", self.config()),
                         ("META_APP_SECRET", APP_SECRET))

    def test_falls_back_to_meta_secret_when_instagram_one_is_unset(self):
        self.assertEqual(ws.select_secret(b'{"object":"instagram"}', self.config(instagram=None)),
                         ("META_APP_SECRET", APP_SECRET))

    def test_object_label_drops_anything_unusual(self):
        self.assertEqual(ws.safe_object_label("instagram"), "instagram")
        self.assertEqual(ws.safe_object_label("in stagram\n403"), "?")
        self.assertEqual(ws.safe_object_label("x" * 25), "?")
        self.assertEqual(ws.safe_object_label(None), "?")


class TestSummarizeEvent(unittest.TestCase):
    def test_reports_object_and_change_fields(self):
        payload = {"object": "page", "entry": [{"id": "100", "time": 1, "changes": [{"field": "feed"}]}]}
        text = " ".join(ws.summarize_event(payload))
        self.assertIn("object=page", text)
        self.assertIn("id=100", text)
        self.assertIn("fields=feed", text)

    def test_omits_message_text_and_participants(self):
        payload = {"object": "page", "entry": [{"id": "100", "messaging": [
            {"sender": {"id": "555"}, "recipient": {"id": "100"},
             "message": {"mid": "m1", "text": "شحنة متى تصل"}},
        ]}]}
        text = " ".join(ws.summarize_event(payload))
        self.assertIn("types=message", text)
        self.assertNotIn("شحنة متى تصل", text)
        self.assertNotIn("555", text)

    def test_handles_non_dict_payload(self):
        self.assertEqual(ws.summarize_event([1, 2]), ["payload is not a JSON object"])


class LiveServerCase(unittest.TestCase):
    """Drives a real server instance over HTTP so headers and status codes are exercised."""

    @classmethod
    def setUpClass(cls):
        cls.logs = io.StringIO()
        logger = ws.build_logger([VERIFY_TOKEN, APP_SECRET, IG_APP_SECRET], cls.logs)
        cls.config = ws.build_config(VERIFY_TOKEN, APP_SECRET, ws.DEFAULT_PATH, logger,
                                     instagram_app_secret=IG_APP_SECRET)
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), ws.make_handler(cls.config))
        cls.base = "http://127.0.0.1:%d" % cls.server.server_address[1]
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.thread.join(timeout=5)
        cls.server.server_close()

    def request(self, method, path, data=None, headers=None):
        request = urllib.request.Request(self.base + path, data=data, method=method)
        for key, value in (headers or {}).items():
            request.add_header(key, value)
        try:
            with urllib.request.urlopen(request, timeout=10) as response:
                return response.status, response.read().decode("utf-8")
        except urllib.error.HTTPError as exc:
            return exc.code, exc.read().decode("utf-8")

    def get_verification(self, token, mode="subscribe"):
        query = urllib.parse.urlencode({
            "hub.mode": mode, "hub.verify_token": token, "hub.challenge": CHALLENGE,
        })
        return self.request("GET", "%s?%s" % (ws.DEFAULT_PATH, query))

    def post_event(self, payload_bytes, secret=APP_SECRET, signature=None):
        header = signature if signature is not None else ws.expected_signature(payload_bytes, secret)
        return self.request("POST", ws.DEFAULT_PATH, payload_bytes,
                            {"Content-Type": "application/json", ws.SIGNATURE_HEADER: header})


class TestVerificationOverHttp(LiveServerCase):
    def test_valid_token_returns_challenge_with_200(self):
        status, body = self.get_verification(VERIFY_TOKEN)
        self.assertEqual(status, 200)
        self.assertEqual(body, CHALLENGE)

    def test_invalid_token_returns_403_without_challenge(self):
        status, body = self.get_verification("wrong-token")
        self.assertEqual(status, 403)
        self.assertNotIn(CHALLENGE, body)

    def test_unknown_path_is_404(self):
        status, _ = self.request("GET", "/nope")
        self.assertEqual(status, 404)


class TestEventsOverHttp(LiveServerCase):
    def test_valid_signature_returns_200(self):
        body = json.dumps({"object": "page", "entry": [{"id": "100", "time": 1,
                                                        "changes": [{"field": "feed"}]}]}).encode("utf-8")
        status, text = self.post_event(body)
        self.assertEqual(status, 200)
        self.assertEqual(text, "EVENT_RECEIVED")

    def test_invalid_signature_returns_403(self):
        body = json.dumps({"object": "page"}).encode("utf-8")
        status, _ = self.post_event(body, signature="sha256=" + "0" * 64)
        self.assertEqual(status, 403)

    def test_missing_signature_header_returns_403(self):
        status, _ = self.request("POST", ws.DEFAULT_PATH, b"{}", {"Content-Type": "application/json"})
        self.assertEqual(status, 403)

    def test_malformed_json_with_valid_signature_returns_400(self):
        status, _ = self.post_event(b"{not json")
        self.assertEqual(status, 400)

    def test_malformed_json_with_invalid_signature_returns_403(self):
        status, _ = self.post_event(b"{not json", signature="sha256=deadbeef")
        self.assertEqual(status, 403)

    def test_unknown_path_is_404(self):
        status, _ = self.request("POST", "/other", b"{}", {ws.SIGNATURE_HEADER: "sha256=x"})
        self.assertEqual(status, 404)


class TestInstagramEventsOverHttp(LiveServerCase):
    """Instagram API with Instagram Login signs deliveries with the Instagram app secret."""

    def instagram_body(self):
        return json.dumps({"object": "instagram", "entry": [{"id": "17841400000000000", "time": 1,
                                                             "messaging": [{"message": {"mid": "m1"}}]}]}).encode("utf-8")

    def test_valid_instagram_signature_returns_200(self):
        status, text = self.post_event(self.instagram_body(), secret=IG_APP_SECRET)
        self.assertEqual(status, 200)
        self.assertEqual(text, "EVENT_RECEIVED")

    def test_instagram_body_signed_with_meta_secret_returns_403(self):
        status, _ = self.post_event(self.instagram_body(), secret=APP_SECRET)
        self.assertEqual(status, 403)

    def test_tampered_instagram_body_returns_403(self):
        signature = ws.expected_signature(self.instagram_body(), IG_APP_SECRET)
        status, _ = self.post_event(b'{"object":"instagram","entry":[]}', signature=signature)
        self.assertEqual(status, 403)

    def test_missing_header_on_instagram_event_returns_403(self):
        status, _ = self.request("POST", ws.DEFAULT_PATH, self.instagram_body(),
                                 {"Content-Type": "application/json"})
        self.assertEqual(status, 403)

    def test_facebook_body_signed_with_instagram_secret_returns_403(self):
        body = json.dumps({"object": "page", "entry": [{"id": "100"}]}).encode("utf-8")
        status, _ = self.post_event(body, secret=IG_APP_SECRET)
        self.assertEqual(status, 403)

    def test_log_names_the_secret_used_and_whether_the_header_was_there(self):
        before = len(self.logs.getvalue())
        self.post_event(self.instagram_body(), secret=IG_APP_SECRET)
        self.request("POST", ws.DEFAULT_PATH, self.instagram_body(), {"Content-Type": "application/json"})
        self.post_event(self.instagram_body(), secret=APP_SECRET)
        written = self.logs.getvalue()[before:]

        self.assertIn("accepted · X-Hub-Signature-256 verified with INSTAGRAM_APP_SECRET", written)
        self.assertIn("X-Hub-Signature-256 missing", written)
        self.assertIn("X-Hub-Signature-256 present · checked against INSTAGRAM_APP_SECRET", written)
        self.assertIn("object=instagram", written)

    def test_log_never_contains_a_signature_value(self):
        before = len(self.logs.getvalue())
        body = self.instagram_body()
        good = ws.expected_signature(body, IG_APP_SECRET)
        bad = ws.expected_signature(body, APP_SECRET)
        self.post_event(body, secret=IG_APP_SECRET)
        self.post_event(body, secret=APP_SECRET)
        written = self.logs.getvalue()[before:]
        for signature in (good, bad):
            self.assertNotIn(signature, written)
            self.assertNotIn(signature.split("=", 1)[1], written)


class TestInstagramFallbackWithoutInstagramSecret(unittest.TestCase):
    """Until INSTAGRAM_APP_SECRET is filled in, Instagram events keep hitting META_APP_SECRET."""

    def setUp(self):
        self.logs = io.StringIO()
        logger = ws.build_logger([VERIFY_TOKEN, APP_SECRET], self.logs)
        self.config = ws.build_config(VERIFY_TOKEN, APP_SECRET, ws.DEFAULT_PATH, logger)
        self.server = ThreadingHTTPServer(("127.0.0.1", 0), ws.make_handler(self.config))
        self.base = "http://127.0.0.1:%d" % self.server.server_address[1]
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()

    def tearDown(self):
        self.server.shutdown()
        self.thread.join(timeout=5)
        self.server.server_close()

    def post(self, body, secret):
        request = urllib.request.Request(self.base + ws.DEFAULT_PATH, data=body, method="POST")
        request.add_header("Content-Type", "application/json")
        request.add_header(ws.SIGNATURE_HEADER, ws.expected_signature(body, secret))
        try:
            with urllib.request.urlopen(request, timeout=10) as response:
                return response.status
        except urllib.error.HTTPError as exc:
            exc.read()
            return exc.code

    def test_instagram_event_still_verified_with_meta_secret(self):
        body = json.dumps({"object": "instagram", "entry": [{"id": "1"}]}).encode("utf-8")
        self.assertEqual(self.post(body, APP_SECRET), 200)
        self.assertEqual(self.post(body, IG_APP_SECRET), 403)
        self.assertIn("checked against META_APP_SECRET", self.logs.getvalue())


class TestLogsNeverLeakSecrets(LiveServerCase):
    def test_no_secret_appears_after_every_request_kind(self):
        self.get_verification(VERIFY_TOKEN)
        self.get_verification("wrong-token")
        body = json.dumps({"object": "page", "entry": [{"id": "100"}]}).encode("utf-8")
        self.post_event(body)
        self.post_event(b"{not json")
        self.post_event(body, signature="sha256=" + "0" * 64)
        self.post_event(json.dumps({"object": "instagram"}).encode("utf-8"), secret=IG_APP_SECRET)

        written = self.logs.getvalue()
        self.assertTrue(written.strip(), "expected the server to log something")
        for secret in (VERIFY_TOKEN, APP_SECRET, IG_APP_SECRET):
            self.assertNotIn(secret, written)
            self.assertNotIn(urllib.parse.quote(secret, safe=""), written)

    def test_logger_scrubs_a_directly_logged_secret(self):
        stream = io.StringIO()
        log = ws.build_logger([VERIFY_TOKEN, APP_SECRET], stream)
        log("token=%s secret=%s" % (VERIFY_TOKEN, APP_SECRET))
        written = stream.getvalue()
        self.assertNotIn(VERIFY_TOKEN, written)
        self.assertNotIn(APP_SECRET, written)
        self.assertEqual(written.count("[REDACTED]"), 2)


class TestMainWithoutSecrets(unittest.TestCase):
    def test_exits_with_code_2_and_never_binds(self):
        backup = {k: os.environ.pop(k, None)
                  for k in ("META_WEBHOOK_VERIFY_TOKEN", "META_APP_SECRET", "INSTAGRAM_APP_SECRET")}
        try:
            self.assertEqual(ws.main(["--env", "/nope/missing.env"]), 2)
        finally:
            for key, value in backup.items():
                if value is not None:
                    os.environ[key] = value


if __name__ == "__main__":
    unittest.main(verbosity=2)
