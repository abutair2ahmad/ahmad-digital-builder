#!/usr/bin/env python3
"""Offline tests for meta_connect.py — يفحص قراءة .env، إخفاء التوكن، بناء الروابط،
تحليل أخطاء Graph API، وتقرير الحالة. لا يتصل بأي شبكة."""

import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import meta_connect as mc


class TestReadEnv(unittest.TestCase):
    def write(self, content):
        handle = tempfile.NamedTemporaryFile("w", suffix=".env", delete=False, encoding="utf-8")
        handle.write(content)
        handle.close()
        self.addCleanup(os.unlink, handle.name)
        return handle.name

    def test_parses_values_and_skips_comments_and_blanks(self):
        path = self.write("# comment\nMETA_ACCESS_TOKEN=abc123\n\nMETA_PAGE_ID=\nMETA_IG_BUSINESS_ID=999\n")
        env = mc.read_env(path)
        self.assertEqual(env["META_ACCESS_TOKEN"], "abc123")
        self.assertEqual(env["META_IG_BUSINESS_ID"], "999")
        self.assertNotIn("META_PAGE_ID", env)

    def test_strips_quotes_and_whitespace(self):
        path = self.write('META_ACCESS_TOKEN = "tok en"\nMETA_GRAPH_VERSION=\'v23.0\'\n')
        env = mc.read_env(path)
        self.assertEqual(env["META_ACCESS_TOKEN"], "tok en")
        self.assertEqual(env["META_GRAPH_VERSION"], "v23.0")

    def test_missing_file_returns_empty(self):
        self.assertEqual(mc.read_env("/nope/does-not-exist.env"), {})


class TestMaskSecret(unittest.TestCase):
    def test_long_secret_keeps_only_edges(self):
        secret = "EAAG" + "x" * 100 + "ZZZZ"
        masked = mc.mask_secret(secret)
        self.assertNotIn(secret, masked)
        self.assertTrue(masked.startswith("EAAG"))
        self.assertIn("ZZZZ", masked)
        self.assertIn(str(len(secret)), masked)

    def test_short_secret_is_fully_hidden(self):
        self.assertNotIn("short", mc.mask_secret("short"))

    def test_empty_secret(self):
        self.assertEqual(mc.mask_secret(""), "(فارغ)")


class TestGraphUrl(unittest.TestCase):
    def test_builds_versioned_url(self):
        self.assertEqual(mc.graph_url("v23.0", "me"), "https://graph.facebook.com/v23.0/me")

    def test_leading_slash_is_normalised(self):
        self.assertEqual(mc.graph_url("v23.0", "/me/accounts"), "https://graph.facebook.com/v23.0/me/accounts")

    def test_params_are_encoded_without_token(self):
        url = mc.graph_url("v23.0", "me", {"fields": "id,name"})
        self.assertIn("fields=id%2Cname", url)
        self.assertNotIn("access_token", url)


class TestParseGraphError(unittest.TestCase):
    def test_extracts_message_and_codes(self):
        body = '{"error":{"message":"Invalid OAuth access token","code":190,"error_subcode":463,"type":"OAuthException"}}'
        line = mc.parse_graph_error(body)
        self.assertIn("Invalid OAuth access token", line)
        self.assertIn("code=190", line)
        self.assertIn("subcode=463", line)
        self.assertIn("OAuthException", line)

    def test_non_json_body(self):
        self.assertEqual(mc.parse_graph_error("<html>502</html>"), "رد غير مفهوم من Graph API")


class TestMissingPermissions(unittest.TestCase):
    def test_reports_only_absent_permissions(self):
        missing = mc.missing_permissions(["pages_show_list", "instagram_basic"])
        self.assertIn("instagram_content_publish", missing)
        self.assertNotIn("pages_show_list", missing)

    def test_all_granted_returns_empty(self):
        self.assertEqual(mc.missing_permissions([name for name, _ in mc.REQUIRED_PERMISSIONS]), [])

    def test_none_granted_returns_all(self):
        self.assertEqual(len(mc.missing_permissions([])), len(mc.REQUIRED_PERMISSIONS))


class TestStatusMarkdown(unittest.TestCase):
    def build(self, **overrides):
        report = {
            "me": {"id": "1", "name": "MoveWell"},
            "granted": ["pages_show_list"],
            "pages": [{"id": "100", "name": "MoveWell", "link": "https://fb.com/movewell",
                       "tasks": [], "ig_id": "200", "ig_username": "movewell.il",
                       "ig_followers": 12, "ig_media": 3}],
            "errors": [],
        }
        report.update(overrides)
        return report

    def test_lists_page_and_instagram_ids(self):
        text = mc.status_markdown(self.build(), "v23.0", "100", "200")
        self.assertIn("`100`", text)
        self.assertIn("@movewell.il", text)
        self.assertIn("✅ مطابق", text)

    def test_flags_env_mismatch(self):
        text = mc.status_markdown(self.build(), "v23.0", "999", "888")
        self.assertIn("❌ غير موجود ضمن صفحات هذا التوكن", text)
        self.assertIn("❌ غير موجود ضمن حسابات إنستغرام المربوطة", text)

    def test_flags_unlinked_instagram(self):
        page = {"id": "100", "name": "MoveWell", "link": None, "tasks": [],
                "ig_id": None, "ig_username": None, "ig_followers": None, "ig_media": None}
        text = mc.status_markdown(self.build(pages=[page]), "v23.0", None, None)
        self.assertIn("❌ غير مربوط", text)

    def test_never_contains_a_token(self):
        text = mc.status_markdown(self.build(), "v23.0", "100", "200")
        self.assertNotIn("access_token", text)
        self.assertNotIn("EAAG", text)


class TestMainWithoutToken(unittest.TestCase):
    def test_exits_with_code_2_and_no_network(self):
        env_backup = os.environ.pop("META_ACCESS_TOKEN", None)
        try:
            self.assertEqual(mc.main(["--env", "/nope/missing.env", "--no-status-file"]), 2)
        finally:
            if env_backup is not None:
                os.environ["META_ACCESS_TOKEN"] = env_backup


if __name__ == "__main__":
    unittest.main(verbosity=2)
