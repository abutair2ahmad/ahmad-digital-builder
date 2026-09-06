#!/usr/bin/env python3
"""Append-only publishing history: what ran, what published, what must never run again.

Each brand owns one JSONL ledger under state/<brand>/posts.jsonl. Every scheduled
post has a deterministic key — brand:YYYY-MM-DD:slot — so the same calendar slot
resolves to the same key no matter how many times a job fires.

The ledger is the idempotency record. A slot whose key already carries a PUBLISHED
event is never attempted again, and the two-step Instagram publish (create a media
container, then publish it) records the container id the moment it exists, so a run
interrupted between the two steps resumes that container instead of building a
second one and double-posting.

Ledgers hold ids and outcomes. They never hold a token, and error text is scrubbed
by the caller before it arrives here.
"""

import errno
import json
import os
import time
from datetime import datetime, timezone

# Lifecycle of one scheduled post.
PLANNED = "planned"            # idea chosen, nothing rendered
RENDERED = "rendered"          # image generated and passed the quality gate
CONTAINER = "container"        # Instagram media container created, not yet published
PUBLISHED = "published"        # live on Instagram — terminal, never retried
FAILED = "failed"              # attempt failed; the slot may be retried
SKIPPED = "skipped"            # deliberately not published (bad image, no idea, disabled)

TERMINAL = (PUBLISHED, SKIPPED)


def post_key(brand, date_str, slot):
    """The stable identity of one scheduled post."""
    return "%s:%s:%s" % (brand, date_str, slot)


def _ledger_path(state_dir, brand):
    return os.path.join(state_dir, brand, "posts.jsonl")


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
    return [e for e in read_all(state_dir, brand) if e.get("key") == key]


def status_of(state_dir, brand, key):
    """The strongest status this post ever reached.

    Deliberately not "the last event": a PUBLISHED post stays published even if a
    later stray event was appended, so a retry can never talk itself back into
    publishing something that is already live.
    """
    ranking = {PLANNED: 1, RENDERED: 2, FAILED: 2, CONTAINER: 3, SKIPPED: 4, PUBLISHED: 5}
    best, best_rank = None, 0
    for event in events_for(state_dir, brand, key):
        rank = ranking.get(event.get("status"), 0)
        if rank >= best_rank:
            best, best_rank = event, rank
    return best


def is_published(state_dir, brand, key):
    event = status_of(state_dir, brand, key)
    return bool(event and event.get("status") == PUBLISHED)


def open_container(state_dir, brand, key):
    """A container created for this key but never published — resume it, don't rebuild."""
    if is_published(state_dir, brand, key):
        return None
    for event in reversed(events_for(state_dir, brand, key)):
        if event.get("status") == CONTAINER and event.get("container_id"):
            return event["container_id"]
    return None


def recent_idea_ids(state_dir, brand, days, today, date_str=None):
    """Idea ids that are off-limits for a new post.

    Two separate reasons an idea is blocked:

      * It was PUBLISHED inside the cooldown window. Only published posts count —
        an idea that was merely rendered in a dry run was never seen by anyone, so
        burning it would quietly drain the content bank every time someone previews
        a day.
      * It is already spoken for on the same calendar day, at any status. That stops
        two slots on one day resolving to the same idea when the category rotation
        sends them to the same pool.
    """
    used = []
    for event in read_all(state_dir, brand):
        idea = event.get("idea_id")
        event_date = event.get("date")
        if not idea or not event_date:
            continue
        if date_str and event_date == date_str:
            used.append(idea)
            continue
        if event.get("status") != PUBLISHED:
            continue
        try:
            age = (today - datetime.strptime(event_date, "%Y-%m-%d").date()).days
        except ValueError:
            continue
        if 0 <= age < days:
            used.append(idea)
    return used


def published_count(state_dir, brand, date_str):
    keys = set()
    for event in read_all(state_dir, brand):
        if event.get("status") == PUBLISHED and event.get("date") == date_str:
            keys.add(event.get("key"))
    return len(keys)


class SlotLock(object):
    """A per-post lock so two overlapping runs cannot race the same slot.

    O_EXCL create is the claim. A lock older than `stale_after` is treated as
    abandoned by a killed process and taken over, so a crash cannot wedge a slot
    permanently.
    """

    def __init__(self, state_dir, brand, key, stale_after=1800):
        safe = key.replace(":", "_")
        self.path = os.path.join(state_dir, brand, "locks", safe + ".lock")
        self.stale_after = stale_after
        self.fd = None

    def __enter__(self):
        os.makedirs(os.path.dirname(self.path), exist_ok=True)
        try:
            self.fd = os.open(self.path, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
        except OSError as exc:
            if exc.errno != errno.EEXIST:
                raise
            age = time.time() - os.path.getmtime(self.path)
            if age < self.stale_after:
                raise RuntimeError("slot is already being processed by another run")
            os.unlink(self.path)
            self.fd = os.open(self.path, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
        os.write(self.fd, str(os.getpid()).encode("ascii"))
        return self

    def __exit__(self, *exc):
        if self.fd is not None:
            os.close(self.fd)
            self.fd = None
        try:
            os.unlink(self.path)
        except OSError:
            pass
        return False
