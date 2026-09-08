#!/usr/bin/env python3
"""Offline tests for instagram_autoreply.py — التوجيه لكل حساب، منع الحلقات، منع التكرار،
وأن السجلات لا تكشف نصاً أو توكن أو معرفاً. لا اتصال بالإنترنت: المرسل مُستبدل بمزيّف."""

import io
import json
import sys
import os
import threading
import unittest
import urllib.error
import urllib.request
from http.server import ThreadingHTTPServer

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import instagram_autoreply as ar
import webhook_server as ws

VERIFY_TOKEN = "movewell-verify-4f2b9c7d"
APP_SECRET = "app-secret-9a8b7c6d5e4f"
IG_APP_SECRET = "ig-app-secret-1b2c3d4e5f60"

A_ID, A_TOKEN = "17841400000000001", "token-account-a-aaaaaaaa"
B_ID, B_TOKEN = "17841400000000002", "token-account-b-bbbbbbbb"
VISITOR = "9988776655"

ENV = {
    "INSTAGRAM_MOVEWELL_IG_ID": A_ID, "INSTAGRAM_MOVEWELL_TOKEN": A_TOKEN,
    "INSTAGRAM_BYNEXORA_IG_ID": B_ID, "INSTAGRAM_BYNEXORA_TOKEN": B_TOKEN,
}


def dm(account_id, mid="m-1", sender=VISITOR, **message_extra):
    message = {"mid": mid, "text": "أهلاً، متى تصل الشحنة؟"}
    message.update(message_extra)
    return {"sender": {"id": sender}, "recipient": {"id": account_id},
            "timestamp": 1, "message": message}


def payload(account_id, *events):
    return {"object": "instagram",
            "entry": [{"id": account_id, "time": 1, "messaging": list(events) or [dm(account_id)]}]}


class Recorder:
    """Stands in for the Graph call: records (account, send_to, text) and never touches network."""

    def __init__(self, ok=True, detail="http=200"):
        self.calls = []
        self.ok, self.detail = ok, detail

    def __call__(self, account, send_to, text):
        self.calls.append((account, send_to, text))
        return self.ok, self.detail


def responder(enabled=True, env=None, sender=None, logs=None):
    stream = logs if logs is not None else io.StringIO()
    log = ws.build_logger([APP_SECRET, IG_APP_SECRET, A_TOKEN, B_TOKEN], stream)
    accounts = ar.load_accounts(env if env is not None else ENV)
    return ar.Responder(accounts, log, enabled=enabled, sender=sender or Recorder()), stream


class TestAccountLoading(unittest.TestCase):
    def test_loads_both_accounts_keyed_by_instagram_id(self):
        accounts = ar.load_accounts(ENV)
        self.assertEqual(set(accounts), {A_ID, B_ID})
        self.assertEqual(accounts[A_ID].token, A_TOKEN)
        self.assertEqual(accounts[B_ID].token, B_TOKEN)

    def test_half_configured_slot_is_ignored(self):
        env = dict(ENV, INSTAGRAM_BYNEXORA_TOKEN="")
        self.assertEqual(set(ar.load_accounts(env)), {A_ID})

    def test_shared_id_between_slots_is_rejected(self):
        with self.assertRaises(ValueError):
            ar.load_accounts(dict(ENV, INSTAGRAM_BYNEXORA_IG_ID=A_ID))

    def test_missing_config_lists_variable_names_only(self):
        missing = ar.missing_account_config({})
        self.assertEqual(len(missing), 4)
        self.assertIn("INSTAGRAM_MOVEWELL_TOKEN", missing)
        self.assertEqual(ar.missing_account_config(ENV), [])

    def test_fingerprint_hides_the_value(self):
        tag = ar.fingerprint(A_ID)
        self.assertNotIn(A_ID, tag)
        self.assertEqual(tag, ar.fingerprint(A_ID))
        self.assertNotEqual(tag, ar.fingerprint(B_ID))


class TestDecide(unittest.TestCase):
    def setUp(self):
        self.accounts = ar.load_accounts(ENV)

    def decide(self, account_id, event):
        return ar.decide({"id": account_id}, event, self.accounts)

    def test_incoming_dm_is_answered_by_the_receiving_account(self):
        decision = self.decide(A_ID, dm(A_ID))
        self.assertEqual(decision.action, "reply")
        self.assertEqual(decision.account.ig_id, A_ID)
        self.assertEqual(decision.send_to, VISITOR)

    def test_echo_of_our_own_message_is_skipped(self):
        self.assertEqual(self.decide(A_ID, dm(A_ID, is_echo=True)).reason, "echo")

    def test_message_from_the_account_itself_is_skipped(self):
        self.assertEqual(self.decide(A_ID, dm(A_ID, sender=A_ID)).reason, "self-message")

    def test_deleted_message_is_skipped(self):
        self.assertEqual(self.decide(A_ID, dm(A_ID, is_deleted=True)).reason, "deleted")

    def test_read_and_reaction_events_are_not_messages(self):
        for event in ({"sender": {"id": VISITOR}, "recipient": {"id": A_ID}, "read": {"mid": "m"}},
                      {"sender": {"id": VISITOR}, "recipient": {"id": A_ID}, "reaction": {"mid": "m"}},
                      {"sender": {"id": VISITOR}, "recipient": {"id": A_ID}, "delivery": {}}):
            self.assertEqual(self.decide(A_ID, event).reason, "not-a-message")

    def test_message_without_mid_is_skipped(self):
        event = dm(A_ID)
        del event["message"]["mid"]
        self.assertEqual(self.decide(A_ID, event).reason, "no-mid")

    def test_unknown_recipient_is_never_answered(self):
        self.assertEqual(self.decide("17841499999999999", dm("17841499999999999")).reason,
                         "unknown-account")

    def test_recipient_disagreeing_with_entry_is_refused(self):
        self.assertEqual(self.decide(B_ID, dm(A_ID)).reason, "recipient-entry-mismatch")

    def test_falls_back_to_entry_id_when_recipient_absent(self):
        event = dm(A_ID)
        del event["recipient"]
        self.assertEqual(self.decide(A_ID, event).account.ig_id, A_ID)

    def test_garbage_event_is_skipped(self):
        self.assertEqual(ar.decide({"id": A_ID}, "not-an-object", self.accounts).reason,
                         "not-an-object")


class TestDedupCache(unittest.TestCase):
    def test_first_claim_wins_and_repeats_lose(self):
        cache = ar.DedupCache()
        self.assertTrue(cache.claim((A_ID, "m1")))
        self.assertFalse(cache.claim((A_ID, "m1")))

    def test_same_mid_on_different_accounts_is_not_a_duplicate(self):
        cache = ar.DedupCache()
        self.assertTrue(cache.claim((A_ID, "m1")))
        self.assertTrue(cache.claim((B_ID, "m1")))

    def test_capacity_is_bounded(self):
        cache = ar.DedupCache(capacity=3)
        for index in range(10):
            cache.claim((A_ID, "m%d" % index))
        self.assertEqual(len(cache), 3)

    def test_concurrent_claims_yield_exactly_one_winner(self):
        cache = ar.DedupCache()
        wins = []
        lock = threading.Lock()

        def attempt():
            if cache.claim((A_ID, "same-mid")):
                with lock:
                    wins.append(1)

        threads = [threading.Thread(target=attempt) for _ in range(25)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        self.assertEqual(len(wins), 1)


class TestAccountSeparation(unittest.TestCase):
    def test_each_account_replies_only_to_its_own_messages(self):
        recorder = Recorder()
        bot, _ = responder(sender=recorder)
        bot.handle(payload(A_ID), "INSTAGRAM_APP_SECRET")
        bot.handle(payload(B_ID, dm(B_ID, mid="m-2")), "INSTAGRAM_APP_SECRET")

        self.assertEqual([call[0].ig_id for call in recorder.calls], [A_ID, B_ID])
        self.assertEqual([call[0].token for call in recorder.calls], [A_TOKEN, B_TOKEN])

    def test_an_account_never_answers_with_the_other_token(self):
        recorder = Recorder()
        bot, _ = responder(sender=recorder)
        bot.handle(payload(A_ID), "INSTAGRAM_APP_SECRET")
        account, _send_to, _text = recorder.calls[0]
        self.assertEqual(account.ig_id, A_ID)
        self.assertNotEqual(account.token, B_TOKEN)

    def test_message_to_an_unconfigured_account_sends_nothing(self):
        recorder = Recorder()
        bot, _ = responder(env=dict(ENV, INSTAGRAM_BYNEXORA_IG_ID="", INSTAGRAM_BYNEXORA_TOKEN=""),
                           sender=recorder)
        bot.handle(payload(B_ID, dm(B_ID)), "INSTAGRAM_APP_SECRET")
        self.assertEqual(recorder.calls, [])


class TestOneReplyPerMessage(unittest.TestCase):
    def test_webhook_retry_of_the_same_mid_replies_once(self):
        recorder = Recorder()
        bot, _ = responder(sender=recorder)
        for _ in range(4):
            bot.handle(payload(A_ID, dm(A_ID, mid="retry-me")), "INSTAGRAM_APP_SECRET")
        self.assertEqual(len(recorder.calls), 1)

    def test_two_distinct_messages_get_two_replies(self):
        recorder = Recorder()
        bot, _ = responder(sender=recorder)
        bot.handle(payload(A_ID, dm(A_ID, mid="m-1"), dm(A_ID, mid="m-2")), "INSTAGRAM_APP_SECRET")
        self.assertEqual(len(recorder.calls), 2)

    def test_reply_text_is_the_agreed_test_message(self):
        recorder = Recorder()
        bot, _ = responder(sender=recorder)
        bot.handle(payload(A_ID), "INSTAGRAM_APP_SECRET")
        self.assertEqual(recorder.calls[0][2], "مرحباً 👋 وصلت رسالتك بنجاح. هذا رد تجريبي تلقائي.")

    def test_echo_never_triggers_a_reply(self):
        recorder = Recorder()
        bot, _ = responder(sender=recorder)
        bot.handle(payload(A_ID, dm(A_ID, is_echo=True)), "INSTAGRAM_APP_SECRET")
        self.assertEqual(recorder.calls, [])

    def test_our_own_reply_echoing_back_cannot_start_a_loop(self):
        recorder = Recorder()
        bot, _ = responder(sender=recorder)
        bot.handle(payload(A_ID, dm(A_ID, mid="incoming")), "INSTAGRAM_APP_SECRET")
        # Meta echoes the reply we just sent back to the same webhook.
        bot.handle(payload(A_ID, dm(A_ID, mid="our-reply", sender=A_ID, is_echo=True)),
                   "INSTAGRAM_APP_SECRET")
        self.assertEqual(len(recorder.calls), 1)


class TestSendingIsGated(unittest.TestCase):
    def test_dry_run_sends_nothing(self):
        recorder = Recorder()
        bot, logs = responder(enabled=False, sender=recorder)
        bot.handle(payload(A_ID), "INSTAGRAM_APP_SECRET")
        self.assertEqual(recorder.calls, [])
        self.assertIn("dry run", logs.getvalue())

    def test_build_responder_defaults_to_off(self):
        bot = ar.build_responder(dict(ENV), lambda _m: None)
        self.assertFalse(bot.enabled)

    def test_build_responder_honours_the_flag(self):
        bot = ar.build_responder(dict(ENV, INSTAGRAM_AUTO_REPLY_ENABLED="true"), lambda _m: None)
        self.assertTrue(bot.enabled)

    def test_payload_not_signed_by_the_instagram_app_is_ignored(self):
        recorder = Recorder()
        bot, _ = responder(sender=recorder)
        bot.handle(payload(A_ID), "META_APP_SECRET")
        self.assertEqual(recorder.calls, [])

    def test_non_instagram_object_is_ignored(self):
        recorder = Recorder()
        bot, _ = responder(sender=recorder)
        bot.handle({"object": "page", "entry": [{"id": A_ID, "messaging": [dm(A_ID)]}]},
                   "INSTAGRAM_APP_SECRET")
        self.assertEqual(recorder.calls, [])


class TestSendRequest(unittest.TestCase):
    def account(self):
        return ar.load_accounts(ENV)[A_ID]

    def test_targets_the_instagram_login_send_endpoint(self):
        request = ar.build_send_request(self.account(), VISITOR, "hi")
        self.assertEqual(request.method, "POST")
        self.assertTrue(request.full_url.startswith("https://graph.instagram.com/"))
        self.assertTrue(request.full_url.endswith("/%s/messages" % A_ID))

    def test_token_travels_in_the_authorization_header_not_the_url(self):
        request = ar.build_send_request(self.account(), VISITOR, "hi")
        self.assertNotIn(A_TOKEN, request.full_url)
        self.assertEqual(request.get_header("Authorization"), "Bearer %s" % A_TOKEN)

    def test_body_addresses_the_sender_of_the_incoming_dm(self):
        request = ar.build_send_request(self.account(), VISITOR, ar.REPLY_TEXT)
        body = json.loads(request.data.decode("utf-8"))
        self.assertEqual(body["recipient"]["id"], VISITOR)
        self.assertEqual(body["message"]["text"], ar.REPLY_TEXT)

    def test_successful_send_reports_ok(self):
        class Response:
            status = 200

            def read(self):
                return b"{}"

            def __enter__(self):
                return self

            def __exit__(self, *_):
                return False

        ok, detail = ar.send_text(self.account(), VISITOR, "hi", opener=lambda *_a, **_k: Response())
        self.assertTrue(ok)
        self.assertIn("200", detail)

    def test_graph_error_is_reported_without_body_text_or_token(self):
        def raise_http(*_args, **_kwargs):
            body = json.dumps({"error": {"message": "quoted user text", "code": 190,
                                         "error_subcode": 463, "type": "OAuthException"}}).encode()
            raise urllib.error.HTTPError("u", 400, "Bad Request", {}, io.BytesIO(body))

        ok, detail = ar.send_text(self.account(), VISITOR, "hi", opener=raise_http)
        self.assertFalse(ok)
        self.assertIn("code=190", detail)
        self.assertIn("type=OAuthException", detail)
        self.assertNotIn("quoted user text", detail)
        self.assertNotIn(A_TOKEN, detail)

    def test_network_failure_is_reported_without_detail_leak(self):
        def raise_url(*_args, **_kwargs):
            raise urllib.error.URLError("connection refused to 1.2.3.4")

        ok, detail = ar.send_text(self.account(), VISITOR, "hi", opener=raise_url)
        self.assertFalse(ok)
        self.assertNotIn("1.2.3.4", detail)


class TestLogsRevealNothing(unittest.TestCase):
    def test_no_text_token_id_or_handle_reaches_the_log(self):
        logs = io.StringIO()
        bot, _ = responder(sender=Recorder(), logs=logs)
        bot.handle(payload(A_ID, dm(A_ID, mid="mid-secret-1")), "INSTAGRAM_APP_SECRET")
        bot.handle(payload(A_ID, dm(A_ID, mid="mid-secret-1")), "INSTAGRAM_APP_SECRET")
        bot.handle(payload(B_ID, dm(B_ID, mid="mid-secret-2")), "INSTAGRAM_APP_SECRET")
        bot.handle(payload(A_ID, dm(A_ID, is_echo=True)), "INSTAGRAM_APP_SECRET")

        written = logs.getvalue()
        self.assertTrue(written.strip())
        for leak in (A_TOKEN, B_TOKEN, A_ID, B_ID, VISITOR, "mid-secret-1", "mid-secret-2",
                     "أهلاً، متى تصل الشحنة؟", "movewell", "bynexora"):
            self.assertNotIn(leak, written)

    def test_accounts_stay_distinguishable_by_fingerprint(self):
        logs = io.StringIO()
        bot, _ = responder(sender=Recorder(), logs=logs)
        bot.handle(payload(A_ID, dm(A_ID, mid="m-1")), "INSTAGRAM_APP_SECRET")
        bot.handle(payload(B_ID, dm(B_ID, mid="m-2")), "INSTAGRAM_APP_SECRET")
        written = logs.getvalue()
        self.assertIn(ar.fingerprint(A_ID), written)
        self.assertIn(ar.fingerprint(B_ID), written)


class TestThroughTheWebhookServer(unittest.TestCase):
    """End to end: a signed Instagram delivery over HTTP produces exactly one reply."""

    def setUp(self):
        self.logs = io.StringIO()
        log = ws.build_logger([VERIFY_TOKEN, APP_SECRET, IG_APP_SECRET, A_TOKEN, B_TOKEN], self.logs)
        self.recorder = Recorder()
        self.bot = ar.Responder(ar.load_accounts(ENV), log, enabled=True, sender=self.recorder)
        self.config = ws.build_config(VERIFY_TOKEN, APP_SECRET, ws.DEFAULT_PATH, log,
                                      instagram_app_secret=IG_APP_SECRET, autoreply=self.bot)
        self.server = ThreadingHTTPServer(("127.0.0.1", 0), ws.make_handler(self.config))
        self.base = "http://127.0.0.1:%d" % self.server.server_address[1]
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()

    def tearDown(self):
        self.server.shutdown()
        self.thread.join(timeout=5)
        self.server.server_close()

    def post(self, body_dict, secret=IG_APP_SECRET):
        body = json.dumps(body_dict).encode("utf-8")
        request = urllib.request.Request(self.base + ws.DEFAULT_PATH, data=body, method="POST")
        request.add_header("Content-Type", "application/json")
        request.add_header(ws.SIGNATURE_HEADER, ws.expected_signature(body, secret))
        try:
            with urllib.request.urlopen(request, timeout=10) as response:
                return response.status
        except urllib.error.HTTPError as exc:
            exc.read()
            return exc.code

    def test_signed_dm_is_answered_once_from_the_right_account(self):
        self.assertEqual(self.post(payload(A_ID, dm(A_ID, mid="live-1"))), 200)
        self.assertEqual(len(self.recorder.calls), 1)
        self.assertEqual(self.recorder.calls[0][0].ig_id, A_ID)

    def test_retried_delivery_is_answered_once(self):
        for _ in range(3):
            self.assertEqual(self.post(payload(A_ID, dm(A_ID, mid="live-retry"))), 200)
        self.assertEqual(len(self.recorder.calls), 1)

    def test_unsigned_delivery_never_reaches_the_responder(self):
        self.assertEqual(self.post(payload(A_ID, dm(A_ID, mid="live-2")), secret=APP_SECRET), 403)
        self.assertEqual(self.recorder.calls, [])

    def test_responder_failure_does_not_break_the_200(self):
        def explode(*_args):
            raise RuntimeError("boom")

        self.bot.sender = explode
        self.assertEqual(self.post(payload(A_ID, dm(A_ID, mid="live-3"))), 200)
        self.assertIn("autoreply error", self.logs.getvalue())


if __name__ == "__main__":
    unittest.main(verbosity=2)
