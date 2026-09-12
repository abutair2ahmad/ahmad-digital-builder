#!/usr/bin/env python3
"""Pure-logic properties of the Story pipeline: brand isolation on the product
catalog, no-immediate-repeat rotation, and the shape of the (never-sent) Graph
API request. None of this touches Chrome or ffmpeg, so it runs anywhere.

Run: python3 tests/test_story_pipeline.py
"""

import os
import shutil
import sys
import tempfile
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "src"))

from igpost import publisher, shopify_products, story_history   # noqa: E402
from igpost.accounts import Account                              # noqa: E402


class BrandIsolation(unittest.TestCase):
    def test_bynexora_has_no_configured_catalog(self):
        products, reason, source = shopify_products.fetch_products({}, "bynexora")
        self.assertEqual(products, [])
        self.assertIsNone(source)
        self.assertIn("no configured product catalog", reason)

    def test_movewell_without_credentials_or_cache_reports_why(self):
        with tempfile.TemporaryDirectory() as tmp:
            products, reason, source = shopify_products.fetch_products({}, "movewell", state_dir=tmp)
        self.assertEqual(products, [])
        self.assertIsNone(source)
        self.assertIn("Shopify Admin API credentials", reason)

    def test_a_brand_with_no_catalog_source_never_sees_another_brands_cache(self):
        with tempfile.TemporaryDirectory() as tmp:
            shopify_products.save_cache(tmp, "movewell", [{"id": "p1"}], "test fixture")
            # bynexora is not in CATALOG_SOURCE at all, so it must never see
            # movewell's cache even if one happens to exist on disk.
            products, reason, source = shopify_products.fetch_products({}, "bynexora", state_dir=tmp)
        self.assertEqual(products, [])
        self.assertIsNone(source)


class ShortenBenefit(unittest.TestCase):
    def test_short_text_is_returned_verbatim(self):
        self.assertEqual(shopify_products._shorten("comfort every night"), "comfort every night")

    def test_long_text_is_cut_on_a_word_boundary_with_an_ellipsis(self):
        text = "word " * 40
        short = shopify_products._shorten(text, max_len=20)
        self.assertLessEqual(len(short), 21)
        self.assertTrue(short.endswith("…"))
        self.assertNotIn("  ", short)

    def test_missing_description_is_an_empty_string_not_invented_copy(self):
        self.assertEqual(shopify_products._shorten(None), "")


class ProductRotation(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.products = [{"id": "p%d" % i, "title": "Product %d" % i} for i in range(3)]

    def tearDown(self):
        shutil.rmtree(self.tmp, ignore_errors=True)

    def test_no_products_is_reported_not_substituted(self):
        product, why = story_history.choose_product([], self.tmp, "movewell")
        self.assertIsNone(product)
        self.assertIn("no products", why)

    def test_first_pick_is_deterministic(self):
        product, _ = story_history.choose_product(self.products, self.tmp, "movewell")
        self.assertEqual(product["id"], "p0")

    def test_rotation_never_repeats_the_immediately_previous_product(self):
        seen = []
        for _ in range(6):
            product, _ = story_history.choose_product(self.products, self.tmp, "movewell")
            if seen:
                self.assertNotEqual(product["id"], seen[-1])
            seen.append(product["id"])
            story_history.append(self.tmp, "movewell", {
                "status": story_history.PUBLISHED, "product_id": product["id"],
            })
        # with 3 products and 6 publishes, every product must have been used twice
        self.assertEqual(sorted(seen), sorted([p["id"] for p in self.products] * 2))

    def test_a_single_product_catalog_is_reused_rather_than_blocked(self):
        one = self.products[:1]
        first, _ = story_history.choose_product(one, self.tmp, "movewell")
        story_history.append(self.tmp, "movewell", {"status": story_history.PUBLISHED, "product_id": first["id"]})
        second, why = story_history.choose_product(one, self.tmp, "movewell")
        self.assertEqual(second["id"], first["id"])
        self.assertIn("round-robin index 0 of 1", why)

    def test_movewell_and_bynexora_ledgers_never_share_state(self):
        story_history.append(self.tmp, "movewell", {"status": story_history.PUBLISHED, "product_id": "p0"})
        product, why = story_history.choose_product(self.products, self.tmp, "bynexora")
        self.assertEqual(product["id"], "p0")  # bynexora's own ledger is empty, so index 0 again
        self.assertIn("this brand has published 0 Stories", why)


class StoryRequestShape(unittest.TestCase):
    def setUp(self):
        self.account = Account("movewell", "@movewell.il", "17841400000000001", "MW-TOKEN")

    def test_request_never_carries_the_real_token(self):
        request = publisher.describe_story_container_request(self.account, "movewell", "https://cdn.example/a.mp4")
        self.assertNotIn("MW-TOKEN", str(request))

    def test_request_shape_matches_the_documented_stories_endpoint(self):
        request = publisher.describe_story_container_request(self.account, "movewell", "https://cdn.example/a.mp4")
        self.assertEqual(request["method"], "POST")
        self.assertTrue(request["url"].endswith("/17841400000000001/media"))
        self.assertEqual(request["params"]["media_type"], "STORIES")
        self.assertEqual(request["params"]["video_url"], "https://cdn.example/a.mp4")
        self.assertNotIn("caption", request["params"])

    def test_cross_brand_request_is_refused_like_the_feed_path(self):
        with self.assertRaises(Exception):
            publisher.describe_story_container_request(self.account, "bynexora", "https://cdn.example/a.mp4")


if __name__ == "__main__":
    unittest.main(verbosity=2)
