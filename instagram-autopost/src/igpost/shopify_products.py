#!/usr/bin/env python3
"""Real product catalogs, one lane per brand.

A Story must feature an actual catalog item — a real photo, a real name, a real
price — never a generated graphic and never an invented product. This module is
the only place that reaches an external product source, and it is deliberately
brand-gated: a brand with no configured source (e.g. a service agency with
portfolio work instead of a product catalog) returns an explicit "not available"
reason rather than silently borrowing another brand's catalog or making something
up to fill the gap.

Nothing here is written to Instagram. This is a read-only fetch against the
brand's own Shopify Admin API, using the same style of dependency-free HTTP call
as publisher.py (stdlib only, no pip install).
"""

import json
import os
import urllib.error
import urllib.request

DEFAULT_API_VERSION = "2024-10"
REQUEST_TIMEOUT = 30

# Which brands have a real, purchasable product catalog, and where it lives.
# A brand absent from this map is a deliberate "no products" case, not a bug —
# e.g. Bynexora sells web-design services and shows portfolio work, not products.
CATALOG_SOURCE = {
    "movewell": "shopify",
}

PRODUCTS_QUERY = """
query Products($first: Int!, $after: String) {
  products(first: $first, after: $after, query: "status:active") {
    edges {
      node {
        id
        title
        handle
        description
        featuredMedia { preview { image { url } } }
        priceRangeV2 { minVariantPrice { amount currencyCode } }
        variants(first: 1) { edges { node { sku } } }
      }
    }
    pageInfo { hasNextPage endCursor }
  }
}
"""


class CatalogError(RuntimeError):
    """A catalog fetch failed. The message is always safe to log (no token in it)."""


def _graphql(domain, token, version, query, variables):
    url = "https://%s/admin/api/%s/graphql.json" % (domain, version)
    body = json.dumps({"query": query, "variables": variables}).encode("utf-8")
    request = urllib.request.Request(url, data=body, method="POST", headers={
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": token,
    })
    try:
        with urllib.request.urlopen(request, timeout=REQUEST_TIMEOUT) as response:
            data = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        raise CatalogError("HTTP %s from Shopify" % exc.code)
    except urllib.error.URLError as exc:
        raise CatalogError("could not reach Shopify: %s" % type(exc.reason).__name__)
    if data.get("errors"):
        raise CatalogError("Shopify GraphQL error: %s" % str(data["errors"])[:200])
    return data["data"]


def _shorten(text, max_len=90):
    """Trim the merchant's own description to a short line, on a word boundary.

    Never rewrites or embellishes — a real sentence from the product's own
    description, shortened, or nothing at all.
    """
    text = " ".join((text or "").split())
    if not text:
        return ""
    if len(text) <= max_len:
        return text
    return text[:max_len].rsplit(" ", 1)[0] + "…"


def _cache_path(state_dir, brand):
    return os.path.join(state_dir, brand, "products_cache.json")


def load_cache(state_dir, brand):
    """A previously saved real export, if one exists. See save_cache()."""
    path = _cache_path(state_dir, brand)
    if not os.path.exists(path):
        return None
    with open(path, "r", encoding="utf-8") as handle:
        return json.load(handle)


def save_cache(state_dir, brand, products, note):
    """Persist a real fetch so the pipeline still has genuine data to work from
    when live Admin API credentials are not configured for standalone runs
    (e.g. when the catalog was pulled through an authenticated integration that
    a cron job cannot re-authenticate as). Never used to store anything that
    was not itself a real, verified product export.
    """
    from datetime import datetime, timezone
    path = _cache_path(state_dir, brand)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    payload = {
        "fetched_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "note": note,
        "products": products,
    }
    with open(path, "w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)
    return path


def fetch_products(env, brand, state_dir=None):
    """Real, active, photographed products for one brand.

    Returns (products, reason, source). `products` is a list of dicts (id, sku,
    title, handle, price, currency, image_url, benefit) built only from fields
    Shopify actually returned. `reason` is None on success, or a human-readable
    string explaining why the list is empty — the caller must surface that
    reason rather than substitute placeholder content. `source` is "live",
    "cache", or None (no data at all).

    If `state_dir` is given and live Shopify Admin API credentials are not
    configured in `env`, this falls back to a locally cached real export (see
    save_cache) instead of failing outright — the cache is only ever populated
    from a genuine fetch, so this still satisfies "real product data only," it
    is just not guaranteed to be fetched fresh on every call. Populate
    SHOPIFY_ADMIN_API_TOKEN in .env to make this brand's fetch fully live.
    """
    source = CATALOG_SOURCE.get(brand)
    if source is None:
        return [], ("%s has no configured product catalog — it is not a "
                     "product/e-commerce brand in this pipeline" % brand), None

    domain = env.get("SHOPIFY_STORE_DOMAIN")
    token = env.get("SHOPIFY_ADMIN_API_TOKEN")
    version = env.get("SHOPIFY_API_VERSION") or DEFAULT_API_VERSION
    if not domain or not token:
        if state_dir:
            cached = load_cache(state_dir, brand)
            if cached and cached.get("products"):
                return cached["products"], None, "cache (%s; %s)" % (cached.get("fetched_at"), cached.get("note"))
        return [], ("Shopify Admin API credentials are not set in .env for %s "
                    "(SHOPIFY_STORE_DOMAIN / SHOPIFY_ADMIN_API_TOKEN) and no cached "
                    "export is available" % brand), None

    products, after = [], None
    while True:
        try:
            data = _graphql(domain, token, version, PRODUCTS_QUERY, {"first": 50, "after": after})
        except CatalogError as exc:
            if state_dir:
                cached = load_cache(state_dir, brand)
                if cached and cached.get("products"):
                    return (cached["products"], None,
                            "cache (live fetch failed: %s)" % exc)
            return [], str(exc), None
        block = data["products"]
        for edge in block["edges"]:
            node = edge["node"]
            image = ((node.get("featuredMedia") or {}).get("preview") or {}).get("image")
            if not image or not image.get("url"):
                continue  # a product with no real photo cannot become a photo-led Story
            price = node["priceRangeV2"]["minVariantPrice"]
            variant_edges = node["variants"]["edges"]
            products.append({
                "id": node["id"],
                "sku": variant_edges[0]["node"]["sku"] if variant_edges else None,
                "title": node["title"],
                "handle": node["handle"],
                "price": price["amount"],
                "currency": price["currencyCode"],
                "image_url": image["url"],
                "benefit": _shorten(node.get("description")),
            })
        if not block["pageInfo"]["hasNextPage"]:
            break
        after = block["pageInfo"]["endCursor"]

    if not products:
        return [], "%s's Shopify catalog has no active, photographed products" % brand, None
    if state_dir:
        save_cache(state_dir, brand, products, "live Shopify Admin API fetch")
    return products, None, "live"
