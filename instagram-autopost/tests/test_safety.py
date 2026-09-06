#!/usr/bin/env python3
"""The properties this system must not lose: isolation, idempotency, secrecy, and
a refusal to publish content that failed a gate.

Run: python3 tests/test_safety.py
"""

import json
import os
import shutil
import struct
import sys
import tempfile
import unittest
import zlib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "src"))

from igpost import compose, history, imagecheck, planner, publisher, runner   # noqa: E402
from igpost.accounts import Account, AccountIsolationError, load_account      # noqa: E402
from igpost.envfile import fingerprint, mask, read_env, scrub                 # noqa: E402


def load(brand):
    return runner.load_configs(ROOT, brand)


class AccountIsolation(unittest.TestCase):
    def setUp(self):
        self.movewell = Account("movewell", "@movewell.il", "17841400000000001", "MW-TOKEN")
        self.nexora = Account("bynexora", "@bynexora.co", "17841400000000002", "NX-TOKEN")

    def test_cross_brand_container_is_refused(self):
        with self.assertRaises(AccountIsolationError):
            publisher.create_container(self.movewell, "bynexora", "https://x/a.png", "hi")

    def test_cross_brand_publish_is_refused(self):
        with self.assertRaises(AccountIsolationError):
            publisher.publish_container(self.nexora, "movewell", "container-1")

    def test_same_brand_passes_the_gate(self):
        self.movewell.assert_owns("movewell")
        self.nexora.assert_owns("bynexora")

    def test_accounts_do_not_share_a_token(self):
        self.assertNotEqual(self.movewell.token, self.nexora.token)

    def test_repr_never_leaks_the_token(self):
        for account in (self.movewell, self.nexora):
            self.assertNotIn(account.token, repr(account))
            self.assertNotIn(account.token, str(account))
            self.assertNotIn(account.token, account.tag)

    def test_unconfigured_brand_returns_none_rather_than_falling_back(self):
        with tempfile.NamedTemporaryFile("w", suffix=".env", delete=False) as handle:
            handle.write("INSTAGRAM_BYNEXORA_IG_ID=123\nINSTAGRAM_BYNEXORA_TOKEN=abc\n")
            path = handle.name
        try:
            self.assertIsNone(load_account("movewell", path))     # missing -> None
            self.assertIsNotNone(load_account("bynexora", path))  # present -> loaded
        finally:
            os.unlink(path)


class Idempotency(unittest.TestCase):
    def setUp(self):
        self.state = tempfile.mkdtemp()
        self.key = history.post_key("movewell", "2026-09-05", "10:00")

    def tearDown(self):
        shutil.rmtree(self.state, ignore_errors=True)

    def test_key_is_stable(self):
        self.assertEqual(self.key, history.post_key("movewell", "2026-09-05", "10:00"))
        self.assertNotEqual(self.key, history.post_key("bynexora", "2026-09-05", "10:00"))

    def test_published_is_terminal_even_after_later_events(self):
        history.append(self.state, "movewell", {"key": self.key, "status": history.PUBLISHED,
                                                "media_id": "M1", "date": "2026-09-05"})
        history.append(self.state, "movewell", {"key": self.key, "status": history.FAILED,
                                                "reason": "late stray event", "date": "2026-09-05"})
        self.assertTrue(history.is_published(self.state, "movewell", self.key))

    def test_run_slot_stops_immediately_when_already_published(self):
        state_dir = os.path.join(self.state, "state")
        history.append(state_dir, "movewell", {"key": self.key, "status": history.PUBLISHED,
                                               "media_id": "M1", "date": "2026-09-05"})
        # A real root, but state redirected to the temp ledger.
        original = runner._paths
        runner._paths = lambda root: dict(original(root), state=state_dir)
        try:
            result = runner.run_slot(ROOT, "movewell", "2026-09-05", "10:00",
                                     dry_run=True, verbose=False)
        finally:
            runner._paths = original
        self.assertEqual(result["action"], "already_published")

    def test_interrupted_publish_resumes_the_same_container(self):
        history.append(self.state, "movewell", {"key": self.key, "status": history.CONTAINER,
                                                "container_id": "C-123", "date": "2026-09-05"})
        self.assertEqual(history.open_container(self.state, "movewell", self.key), "C-123")

    def test_no_container_is_resumed_once_published(self):
        history.append(self.state, "movewell", {"key": self.key, "status": history.CONTAINER,
                                                "container_id": "C-123", "date": "2026-09-05"})
        history.append(self.state, "movewell", {"key": self.key, "status": history.PUBLISHED,
                                                "media_id": "M1", "date": "2026-09-05"})
        self.assertIsNone(history.open_container(self.state, "movewell", self.key))

    def test_a_second_concurrent_run_cannot_claim_the_slot(self):
        with history.SlotLock(self.state, "movewell", self.key):
            with self.assertRaises(RuntimeError):
                with history.SlotLock(self.state, "movewell", self.key):
                    pass

    def test_lock_is_released_for_the_next_run(self):
        with history.SlotLock(self.state, "movewell", self.key):
            pass
        with history.SlotLock(self.state, "movewell", self.key):
            pass


class AntiRepetition(unittest.TestCase):
    def setUp(self):
        self.state = tempfile.mkdtemp()
        self.brand_cfg, self.content, self.schedule = load("movewell")

    def tearDown(self):
        shutil.rmtree(self.state, ignore_errors=True)

    def _choose(self, date_str, slot):
        key = history.post_key("movewell", date_str, slot)
        return planner.choose(self.content, self.schedule, self.state,
                              "movewell", date_str, slot, key)

    def test_a_published_idea_is_not_chosen_again_inside_the_cooldown(self):
        idea, _ = self._choose("2026-09-05", "10:00")
        history.append(self.state, "movewell", {"key": "k", "status": history.PUBLISHED,
                                                "idea_id": idea["id"], "topic": idea.get("topic"),
                                                "layout": idea["layout"], "date": "2026-09-05"})
        again, _ = self._choose("2026-09-06", "10:00")
        self.assertNotEqual(again["id"], idea["id"])

    def test_a_dry_run_does_not_consume_an_idea(self):
        idea, _ = self._choose("2026-09-08", "10:00")
        history.append(self.state, "movewell", {"key": "k", "status": history.RENDERED,
                                                "idea_id": idea["id"], "layout": idea["layout"],
                                                "date": "2026-09-01"})
        again, _ = self._choose("2026-09-08", "10:00")
        self.assertEqual(again["id"], idea["id"])

    def test_one_day_never_repeats_an_idea_or_a_topic(self):
        seen_ideas, seen_topics = set(), set()
        for slot in self.schedule["slots"]:
            idea, _ = self._choose("2026-09-05", slot)
            self.assertNotIn(idea["id"], seen_ideas)
            self.assertNotIn(idea.get("topic"), seen_topics)
            seen_ideas.add(idea["id"])
            seen_topics.add(idea.get("topic"))
            history.append(self.state, "movewell",
                           {"key": history.post_key("movewell", "2026-09-05", slot),
                            "status": history.PUBLISHED, "idea_id": idea["id"],
                            "topic": idea.get("topic"), "layout": idea["layout"],
                            "date": "2026-09-05"})

    def test_planning_is_deterministic(self):
        first, _ = self._choose("2026-09-05", "15:00")
        second, _ = self._choose("2026-09-05", "15:00")
        self.assertEqual(first["id"], second["id"])


class Editorial(unittest.TestCase):
    def test_every_shipped_caption_passes_its_own_claim_guard(self):
        for brand in ("movewell", "bynexora"):
            brand_cfg, content, _ = load(brand)
            for idea in content["ideas"]:
                key = history.post_key(brand, "2026-09-05", "10:00")
                post = compose.compose(brand_cfg, idea, key, content)
                self.assertEqual(compose.claim_guard(brand_cfg, post["text"]), [])
                self.assertLessEqual(len(post["hashtags"]), 10)
                self.assertLessEqual(post["length"], compose.CAPTION_LIMIT)

    def test_medical_claims_are_blocked_for_movewell(self):
        brand_cfg, content, _ = load("movewell")
        idea = dict(content["ideas"][0])
        idea["caption"] = dict(idea["caption"], hook="הקרם הזה מרפא כאבי גב")
        with self.assertRaises(compose.ClaimViolation):
            compose.compose(brand_cfg, idea, "k", content)

    def test_invented_social_proof_is_blocked_for_nexora(self):
        brand_cfg, content, _ = load("bynexora")
        idea = dict(content["ideas"][0])
        idea["caption"] = dict(idea["caption"], hook="Trusted by thousands. Guaranteed results.")
        with self.assertRaises(compose.ClaimViolation):
            compose.compose(brand_cfg, idea, "k", content)

    def test_the_two_brands_never_share_an_image_or_a_caption(self):
        move_cfg, move_content, _ = load("movewell")
        nex_cfg, nex_content, _ = load("bynexora")
        move_ids = {i["id"] for i in move_content["ideas"]}
        nex_ids = {i["id"] for i in nex_content["ideas"]}
        self.assertEqual(move_ids & nex_ids, set())
        move_text = {compose.compose(move_cfg, i, "k", move_content)["text"] for i in move_content["ideas"]}
        nex_text = {compose.compose(nex_cfg, i, "k", nex_content)["text"] for i in nex_content["ideas"]}
        self.assertEqual(move_text & nex_text, set())

    def test_the_brands_do_not_share_a_palette(self):
        move_cfg, _, _ = load("movewell")
        nex_cfg, _, _ = load("bynexora")
        self.assertNotEqual(move_cfg["palette"]["accent"], nex_cfg["palette"]["accent"])
        self.assertNotEqual(move_cfg["palette"]["bg"], nex_cfg["palette"]["bg"])


class Secrecy(unittest.TestCase):
    def test_scrub_removes_raw_and_encoded_forms(self):
        secret = "EAAG+secret/token=="
        text = "failed with access_token=EAAG%2Bsecret%2Ftoken%3D%3D and EAAG+secret/token=="
        cleaned = scrub(text, [secret])
        self.assertNotIn(secret, cleaned)
        self.assertNotIn("EAAG%2Bsecret", cleaned)

    def test_mask_and_fingerprint_are_not_reversible(self):
        secret = "abcdefghijklmnopqrstuvwxyz"
        self.assertNotIn(secret, mask(secret))
        self.assertNotIn(secret, fingerprint(secret))

    def test_env_parser_ignores_shell_junk(self):
        with tempfile.NamedTemporaryFile("w", suffix=".env", delete=False) as handle:
            handle.write("nano .envMETA_APP_SECRET=abc\n"
                         "python3 - <<'PY'\n"
                         "lines = something\n"
                         "# comment=1\n"
                         "REAL_KEY=real-value\n"
                         "EMPTY_KEY=\n")
            path = handle.name
        try:
            values = read_env(path)
            self.assertEqual(values, {"REAL_KEY": "real-value"})
        finally:
            os.unlink(path)

    def test_no_generated_artifact_contains_a_secret(self):
        env = read_env(os.path.join(os.path.dirname(ROOT), ".env"))
        secrets = [v for k, v in env.items() if len(v) >= 16]
        if not secrets:
            self.skipTest("no long-form secrets present to check against")
        for folder in ("out", "logs", "state"):
            base = os.path.join(ROOT, folder)
            for dirpath, _, filenames in os.walk(base):
                for name in filenames:
                    with open(os.path.join(dirpath, name), "rb") as handle:
                        blob = handle.read()
                    for secret in secrets:
                        self.assertNotIn(secret.encode("utf-8"), blob,
                                         "%s leaked a secret" % os.path.join(dirpath, name))


def _png(width, height, rgb):
    """A minimal valid single-colour PNG, for the blank-image gate."""
    raw = b"".join(b"\x00" + bytes(rgb) * width for _ in range(height))
    def chunk(kind, body):
        return (struct.pack(">I", len(body)) + kind + body
                + struct.pack(">I", zlib.crc32(kind + body) & 0xFFFFFFFF))
    return (b"\x89PNG\r\n\x1a\n"
            + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(raw))
            + chunk(b"IEND", b""))


class ImageGate(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.mkdtemp()

    def tearDown(self):
        shutil.rmtree(self.dir, ignore_errors=True)

    def _write(self, name, data):
        path = os.path.join(self.dir, name)
        with open(path, "wb") as handle:
            handle.write(data)
        return path

    def test_a_blank_frame_is_rejected(self):
        path = self._write("blank.png", _png(1080, 1080, (14, 95, 82)))
        ok, _, reasons = imagecheck.check(path)
        self.assertFalse(ok)
        self.assertTrue(reasons)

    def test_wrong_dimensions_are_rejected(self):
        path = self._write("small.png", _png(600, 600, (1, 2, 3)))
        ok, _, reasons = imagecheck.check(path)
        self.assertFalse(ok)
        self.assertTrue(any("dimensions" in r for r in reasons))

    def test_a_non_png_is_rejected_without_raising(self):
        path = self._write("nope.png", b"this is not a png")
        ok, _, reasons = imagecheck.check(path)
        self.assertFalse(ok)
        self.assertTrue(reasons)

    def test_clipped_text_reported_by_the_layout_fails_the_gate(self):
        path = self._write("blank.png", _png(1080, 1080, (14, 95, 82)))
        ok, _, reasons = imagecheck.check(path, {"stage_fits": False, "overflow": [
            {"cls": "headline", "text": "a headline that did not fit"}]})
        self.assertFalse(ok)
        self.assertTrue(any("clipped" in r for r in reasons))

    def test_a_real_rendered_post_passes(self):
        candidates = []
        for dirpath, _, filenames in os.walk(os.path.join(ROOT, "out")):
            candidates += [os.path.join(dirpath, f) for f in filenames if f.endswith(".png")]
        if not candidates:
            self.skipTest("no rendered posts available")
        ok, stats, reasons = imagecheck.check(sorted(candidates)[0])
        self.assertTrue(ok, reasons)
        self.assertEqual((stats["width"], stats["height"]), (1080, 1080))


if __name__ == "__main__":
    unittest.main(verbosity=2)
