#!/usr/bin/env python3
"""End-to-end publish flow against a local stand-in for the Graph API.

Instagram is not called here, but everything up to the socket is real: the runner,
the ledger, the image host, request construction, JSON parsing and error handling.
The mock records every request it receives, which is what makes the interesting
assertions possible — not just "did it report success" but "how many times did it
actually publish", and "was the other brand's token ever sent".

Run: python3 tests/test_publish_flow.py
"""

import json
import os
import shutil
import sys
import tempfile
import threading
import unittest
import urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "src"))

from igpost import history, publisher, runner   # noqa: E402

REQUESTS = []
REQUESTS_LOCK = threading.Lock()
FAIL_PUBLISH = {"on": False}


class FakeGraph(BaseHTTPRequestHandler):
    """Enough of the Instagram publishing API to exercise the real client."""

    def log_message(self, *args):
        pass

    def _record(self, method, path, params):
        with REQUESTS_LOCK:
            REQUESTS.append({"method": method, "path": path, "params": params})

    def _send(self, status, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        params = {k: v[0] for k, v in urllib.parse.parse_qs(parsed.query).items()}
        self._record("GET", parsed.path, params)
        if parsed.path.endswith("/me"):
            return self._send(200, {"user_id": "17841400000000001",
                                    "username": "movewell.il", "account_type": "BUSINESS"})
        # container status
        return self._send(200, {"status_code": "FINISHED", "id": parsed.path.rsplit("/", 1)[-1]})

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        length = int(self.headers.get("Content-Length") or 0)
        body = self.rfile.read(length).decode("utf-8")
        params = {k: v[0] for k, v in urllib.parse.parse_qs(body).items()}
        self._record("POST", parsed.path, params)
        if parsed.path.endswith("/media"):
            return self._send(200, {"id": "CONTAINER-1"})
        if parsed.path.endswith("/media_publish"):
            if FAIL_PUBLISH["on"]:
                return self._send(500, {"error": {"message": "transient upstream failure "
                                                             "for access_token=%s" % params.get("access_token"),
                                                  "code": 2, "error_subcode": 0}})
            return self._send(200, {"id": "MEDIA-1"})
        return self._send(404, {"error": {"message": "unexpected path", "code": 100}})


def posts_to(path_suffix):
    return [r for r in REQUESTS if r["method"] == "POST" and r["path"].endswith(path_suffix)]


class PublishFlow(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), FakeGraph)
        cls.port = cls.server.server_address[1]
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.original_scheme = publisher.GRAPH_SCHEME
        publisher.GRAPH_SCHEME = "http"
        publisher.STATUS_POLL_SECONDS = 0

    @classmethod
    def tearDownClass(cls):
        publisher.GRAPH_SCHEME = cls.original_scheme
        cls.server.shutdown()

    def setUp(self):
        del REQUESTS[:]
        FAIL_PUBLISH["on"] = False
        self.tmp = tempfile.mkdtemp()
        self.state = os.path.join(self.tmp, "state")
        self.served = os.path.join(self.tmp, "served")
        os.makedirs(self.served)
        self.env_path = os.path.join(self.tmp, ".env")
        with open(self.env_path, "w", encoding="utf-8") as handle:
            handle.write(
                "INSTAGRAM_MOVEWELL_IG_ID=17841400000000001\n"
                "INSTAGRAM_MOVEWELL_TOKEN=MOVEWELL-SECRET-TOKEN-AAAA\n"
                "INSTAGRAM_BYNEXORA_IG_ID=17841400000000002\n"
                "INSTAGRAM_BYNEXORA_TOKEN=BYNEXORA-SECRET-TOKEN-BBBB\n"
                "IG_PUBLISH_ENABLED=true\n"
                "IMAGE_HOST=local\n"
                "IMAGE_LOCAL_DIR=%s\n"
                "IMAGE_PUBLIC_BASE_URL=https://images.example.test\n"
                "INSTAGRAM_GRAPH_HOST=127.0.0.1:%d\n" % (self.served, self.port))
        self.original_paths = runner._paths
        tmp = self.tmp
        runner._paths = lambda root: dict(
            self.original_paths(root), state=os.path.join(tmp, "state"),
            out=os.path.join(tmp, "out"), logs=os.path.join(tmp, "logs"))

    def tearDown(self):
        runner._paths = self.original_paths
        shutil.rmtree(self.tmp, ignore_errors=True)

    def _run(self, brand="movewell", date="2026-09-05", slot="10:00"):
        return runner.run_slot(ROOT, brand, date, slot, env_path=self.env_path,
                               dry_run=False, verbose=False)

    def test_a_slot_publishes_once_and_records_the_media_id(self):
        result = self._run()
        self.assertEqual(result["action"], "published", result)
        self.assertEqual(result["media_id"], "MEDIA-1")
        self.assertEqual(len(posts_to("/media")), 1)
        self.assertEqual(len(posts_to("/media_publish")), 1)

    def test_running_the_same_slot_again_publishes_nothing(self):
        self.assertEqual(self._run()["action"], "published")
        before = len(posts_to("/media_publish"))
        for _ in range(3):
            repeat = self._run()
            self.assertEqual(repeat["action"], "already_published")
        self.assertEqual(len(posts_to("/media_publish")), before,
                         "a retry published a second time")

    def test_an_interrupted_run_resumes_its_container_instead_of_making_another(self):
        key = history.post_key("movewell", "2026-09-05", "10:00")
        history.append(self.state, "movewell",
                       {"key": key, "brand": "movewell", "date": "2026-09-05", "slot": "10:00",
                        "status": history.CONTAINER, "container_id": "CONTAINER-EXISTING",
                        "idea_id": "mw-sh-03"})
        result = self._run()
        self.assertEqual(result["action"], "published")
        self.assertEqual(len(posts_to("/media")), 0, "a second container was created")
        published = posts_to("/media_publish")
        self.assertEqual(len(published), 1)
        self.assertEqual(published[0]["params"]["creation_id"], "CONTAINER-EXISTING")

    def test_a_failed_publish_is_recorded_once_and_not_retried(self):
        FAIL_PUBLISH["on"] = True
        result = self._run()
        self.assertEqual(result["action"], "failed", result)
        self.assertEqual(len(posts_to("/media_publish")), 1, "the client retried on its own")
        self.assertFalse(history.is_published(self.state, "movewell",
                                              history.post_key("movewell", "2026-09-05", "10:00")))

    def test_an_api_error_never_writes_the_token_into_the_ledger_or_log(self):
        FAIL_PUBLISH["on"] = True          # the mock echoes the token back in its error
        self._run()
        blob = ""
        for folder in ("state", "logs", "out"):
            base = os.path.join(self.tmp, folder)
            for dirpath, _, filenames in os.walk(base):
                for name in filenames:
                    with open(os.path.join(dirpath, name), "r", encoding="utf-8", errors="replace") as fh:
                        blob += fh.read()
        self.assertIn("REDACTED", blob, "the scrubber did not run over the error")
        self.assertNotIn("MOVEWELL-SECRET-TOKEN-AAAA", blob)
        self.assertNotIn("BYNEXORA-SECRET-TOKEN-BBBB", blob)

    def test_each_brand_only_ever_sends_its_own_token(self):
        self._run(brand="movewell")
        self._run(brand="bynexora")
        for request in REQUESTS:
            token = request["params"].get("access_token")
            if not token:
                continue
            path = request["path"]
            if "17841400000000001" in path:
                self.assertEqual(token, "MOVEWELL-SECRET-TOKEN-AAAA")
            elif "17841400000000002" in path:
                self.assertEqual(token, "BYNEXORA-SECRET-TOKEN-BBBB")

    def test_both_accounts_publish_independently_on_the_same_day(self):
        move = self._run(brand="movewell")
        nexo = self._run(brand="bynexora")
        self.assertEqual(move["action"], "published")
        self.assertEqual(nexo["action"], "published")
        self.assertNotEqual(move["idea_id"], nexo["idea_id"])
        self.assertEqual(len(posts_to("/media_publish")), 2)

    def test_the_image_actually_reached_the_host_before_the_container_was_made(self):
        self._run()
        served = []
        for dirpath, _, filenames in os.walk(self.served):
            served += [f for f in filenames if f.endswith(".png")]
        self.assertEqual(len(served), 1)
        container = posts_to("/media")[0]
        self.assertTrue(container["params"]["image_url"].startswith("https://images.example.test/"))
        self.assertIn("caption", container["params"])


if __name__ == "__main__":
    unittest.main(verbosity=2)
