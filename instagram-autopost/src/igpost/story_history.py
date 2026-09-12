#!/usr/bin/env python3
"""Story ledger: which real product was used for a brand's last few Stories.

Deliberately separate from the feed's state/<brand>/posts.jsonl. Stories are a
different publishing lane with a different idempotency need — avoid repeating a
product on consecutive Stories, not avoid repeating a calendar slot — and this
file must never be read or written by the feed scheduler (runner.py, history.py).
"""

import json
import os
from datetime import datetime, timezone

PUBLISHED = "published"
RENDERED = "rendered"
FAILED = "failed"


def _ledger_path(state_dir, brand):
    return os.path.join(state_dir, brand, "stories.jsonl")


def now_iso():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def append(state_dir, brand, record):
    """Append one event. Written with O_APPEND so concurrent writers cannot interleave."""
    path = _ledger_path(state_dir, brand)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    record = dict(record)
    record.setdefault("at", now_iso())
    line = json.dumps(record, ensure_ascii=False, sort_keys=True) + "\n"
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_APPEND, 0o600)
    try:
        os.write(fd, line.encode("utf-8"))
    finally:
        os.close(fd)
    return record


def read_all(state_dir, brand):
    """Every event for a brand, oldest first. A corrupt line is skipped, not fatal."""
    path = _ledger_path(state_dir, brand)
    if not os.path.exists(path):
        return []
    events = []
    with open(path, "r", encoding="utf-8") as handle:
        for raw in handle:
            raw = raw.strip()
            if not raw:
                continue
            try:
                events.append(json.loads(raw))
            except ValueError:
                continue
    return events


def events_for(state_dir, brand, key):
    return [event for event in read_all(state_dir, brand) if event.get("key") == key]


def is_published(state_dir, brand, key):
    return any(event.get("status") == PUBLISHED for event in events_for(state_dir, brand, key))


def open_container(state_dir, brand, key):
    if is_published(state_dir, brand, key):
        return None
    for event in reversed(events_for(state_dir, brand, key)):
        if event.get("status") == "container" and event.get("container_id"):
            return event["container_id"]
    return None


def choose_product(products, state_dir, brand):
    """Round-robin through the catalog, with an explicit guard against an
    immediate repeat.

    The index advances by how many Stories have ever published for this brand,
    wrapping through the full catalog before any product repeats. If that lands
    on whatever was used last (e.g. the catalog shrank between runs), it steps
    forward once more rather than reusing it back-to-back.
    """
    if not products:
        return None, "no products available to choose from"

    published = [e for e in read_all(state_dir, brand) if e.get("status") == PUBLISHED]
    index = len(published) % len(products)
    product = products[index]

    last_id = published[-1]["product_id"] if published else None
    if last_id is not None and product["id"] == last_id and len(products) > 1:
        index = (index + 1) % len(products)
        product = products[index]

    return product, ("round-robin index %d of %d catalog items (this brand has "
                      "published %d Stories so far)" % (index, len(products), len(published)))
