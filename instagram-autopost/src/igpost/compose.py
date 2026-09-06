#!/usr/bin/env python3
"""Assemble the caption, the call to action and the hashtag set for one post.

Selection is seeded from the post key, so re-running the same slot rebuilds a
byte-identical caption. That matters for idempotency: a retry after a crash must
not publish subtly different words than the attempt it is resuming.

`claim_guard` is the editorial safety net. It fails a post whose text drifts into
medical claims for MoveWell or invented credentials and social proof for Nexora,
and it runs over the finished caption — not the source idea — so nothing assembled
here can slip past it.
"""

import hashlib

CAPTION_LIMIT = 2200        # Instagram's hard cap
HASHTAG_LIMIT = 30          # Instagram's hard cap
HASHTAG_TARGET = 10         # what we actually aim for; more reads as spam


class ClaimViolation(RuntimeError):
    """The composed caption contains language the brand is not allowed to use."""


def _seed(post_key, salt):
    digest = hashlib.sha256(("%s|%s" % (post_key, salt)).encode("utf-8")).hexdigest()
    return int(digest[:8], 16)


def pick(options, post_key, salt):
    """Deterministically choose one option for this post."""
    options = list(options)
    if not options:
        return None
    return options[_seed(post_key, salt) % len(options)]


def build_hashtags(brand, idea, post_key):
    """Core tags every time, then the idea's own topics, then a market tag or two.

    Ordered and deduplicated, capped well below Instagram's limit so the block
    reads as a label rather than a keyword dump.
    """
    pools = brand.get("hashtag_pools", {})
    tags, seen = [], set()

    def add(tag):
        key = tag.lower()
        if tag and key not in seen and len(tags) < HASHTAG_TARGET:
            seen.add(key)
            tags.append(tag)

    for tag in pools.get("core", []):
        add(tag)
    for tag in idea.get("tags", []):
        add(tag)

    topics = [t for t in pools.get("topic", []) if t.lower() not in seen]
    offset = _seed(post_key, "topics")
    for i in range(len(topics)):
        add(topics[(offset + i) % len(topics)])

    market = pools.get("market", [])
    if market:
        add(market[_seed(post_key, "market") % len(market)])

    return tags[:HASHTAG_LIMIT]


def build_cta(brand, idea, post_key):
    return idea.get("caption", {}).get("cta") or pick(brand.get("cta_pool", []), post_key, "cta")


def claim_guard(brand, text):
    """Return the list of forbidden phrases present in `text`. Empty means clean."""
    lowered = text.lower()
    found = []
    for phrase in brand.get("claim_guard", {}).get("forbidden", []):
        if phrase.lower() in lowered:
            found.append(phrase)
    return found


def compose(brand, idea, post_key, content_meta=None):
    """Build the full post text. Raises ClaimViolation rather than returning bad copy."""
    caption = idea.get("caption", {})
    blocks = []
    if caption.get("hook"):
        blocks.append(caption["hook"].strip())
    if caption.get("body"):
        blocks.append(caption["body"].strip())

    cta = build_cta(brand, idea, post_key)
    if cta:
        blocks.append(cta.strip())

    # MoveWell carries a standing "general information, not medical advice" line.
    disclaimer = (content_meta or {}).get("disclaimer")
    if disclaimer and brand.get("language") == "he":
        blocks.append(disclaimer.strip())

    tags = build_hashtags(brand, idea, post_key)
    if tags:
        blocks.append(" ".join(tags))

    text = "\n\n".join(blocks)

    violations = claim_guard(brand, text)
    if violations:
        raise ClaimViolation(
            "caption for %s uses forbidden language: %s" % (idea.get("id"), ", ".join(violations))
        )
    if len(text) > CAPTION_LIMIT:
        raise ClaimViolation(
            "caption for %s is %d characters (limit %d)" % (idea.get("id"), len(text), CAPTION_LIMIT)
        )

    return {"text": text, "cta": cta, "hashtags": tags, "length": len(text)}
