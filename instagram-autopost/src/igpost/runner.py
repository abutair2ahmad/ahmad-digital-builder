#!/usr/bin/env python3
"""Run one scheduled slot, end to end.

The order of operations is the safety design. Everything that can fail cheaply —
choosing an idea, writing the caption, rendering and inspecting the image — happens
before anything irreversible. Only once a post has passed every local gate does a
single Instagram publish attempt occur.

Failure policy, as specified:
  * A successful publish is never retried. The ledger is consulted first, and a
    published key returns immediately.
  * A generation failure skips the slot. It does not fall back to older content,
    and it does not publish a partially-correct image.
  * An API failure is recorded once, sanitised, and left. There is no retry loop.
  * A slot interrupted after its container was created resumes that container.
"""

import json
import os
import traceback

from . import compose, history, imagecheck, imagehost, planner, publisher
from .accounts import load_account
from .envfile import read_env, scrub

TRUE_VALUES = ("1", "true", "yes", "on")


def _paths(root):
    return {
        "brands": os.path.join(root, "config", "brands"),
        "schedule": os.path.join(root, "config", "schedule.json"),
        "content": os.path.join(root, "content"),
        "css": os.path.join(root, "templates", "base.css"),
        "out": os.path.join(root, "out"),
        "state": os.path.join(root, "state"),
        "logs": os.path.join(root, "logs"),
    }

CONTENT_FILE = {"movewell": "movewell.json", "bynexora": "nexora.json"}


def load_configs(root, brand):
    paths = _paths(root)
    brand_file = os.path.join(paths["brands"], "movewell.json" if brand == "movewell" else "nexora.json")
    with open(brand_file, "r", encoding="utf-8") as handle:
        brand_cfg = json.load(handle)
    with open(os.path.join(paths["content"], CONTENT_FILE[brand]), "r", encoding="utf-8") as handle:
        content = json.load(handle)
    with open(paths["schedule"], "r", encoding="utf-8") as handle:
        schedule = json.load(handle)
    return brand_cfg, content, schedule


def log(root, line):
    paths = _paths(root)
    os.makedirs(paths["logs"], exist_ok=True)
    with open(os.path.join(paths["logs"], "run.log"), "a", encoding="utf-8") as handle:
        handle.write(line.rstrip("\n") + "\n")
    print(line)


def run_slot(root, brand, date_str, slot, env_path=".env", dry_run=None, verbose=True):
    """Execute one slot. Returns a result dict; never raises for an expected failure."""
    paths = _paths(root)
    key = history.post_key(brand, date_str, slot)
    env = read_env(env_path)
    secrets = [v for k, v in env.items() if "TOKEN" in k or "SECRET" in k or "KEY" in k]

    if dry_run is None:
        dry_run = (env.get("IG_PUBLISH_ENABLED", "").strip().lower() not in TRUE_VALUES)

    def record(status, **fields):
        return history.append(paths["state"], brand, dict(fields, key=key, brand=brand,
                                                          date=date_str, slot=slot, status=status))

    def emit(message):
        if verbose:
            log(root, "[%s] %s" % (key, scrub(message, secrets)))

    # ---- idempotency: a published slot is terminal ------------------------
    if history.is_published(paths["state"], brand, key):
        emit("already published — nothing to do")
        return {"key": key, "action": "already_published", "published": True}

    try:
        lock = history.SlotLock(paths["state"], brand, key)
        lock.__enter__()
    except RuntimeError as exc:
        emit("skipped: %s" % exc)
        return {"key": key, "action": "locked", "published": False}

    try:
        brand_cfg, content, schedule = load_configs(root, brand)

        # ---- choose ---------------------------------------------------------
        idea, why = planner.choose(content, schedule, paths["state"], brand, date_str, slot, key)
        if idea is None:
            emit("skipped: %s" % why)
            record(history.SKIPPED, reason=why, stage="plan")
            return {"key": key, "action": "skipped", "reason": why, "published": False}
        emit("idea=%s layout=%s category=%s (%s)" % (idea["id"], idea["layout"], idea["category"], why))

        # ---- caption --------------------------------------------------------
        try:
            post = compose.compose(brand_cfg, idea, key, content)
        except compose.ClaimViolation as exc:
            emit("skipped: %s" % exc)
            record(history.SKIPPED, reason=str(exc), stage="caption", idea_id=idea["id"], topic=idea.get("topic"))
            return {"key": key, "action": "skipped", "reason": str(exc), "published": False}

        # ---- render ---------------------------------------------------------
        stem = "%s-%s" % (slot.replace(":", ""), idea["id"])
        day_dir = os.path.join(paths["out"], brand, date_str)
        os.makedirs(day_dir, exist_ok=True)
        png = os.path.join(day_dir, stem + ".png")
        html = os.path.join(day_dir, stem + ".html")
        try:
            from . import render
            fit = render.render(brand_cfg, idea, paths["css"], html, png)
        except Exception as exc:                                   # generation failed
            reason = "render failed: %s" % exc
            emit("skipped: %s" % reason)
            record(history.SKIPPED, reason=reason, stage="render", idea_id=idea["id"], topic=idea.get("topic"))
            return {"key": key, "action": "skipped", "reason": reason, "published": False}

        # ---- inspect the actual pixels --------------------------------------
        ok, stats, reasons = imagecheck.check(png, fit)
        if not ok:
            reason = "image rejected: %s" % "; ".join(reasons)
            emit("skipped: %s" % reason)
            record(history.SKIPPED, reason=reason, stage="imagecheck", idea_id=idea["id"])
            return {"key": key, "action": "skipped", "reason": reason, "published": False}

        with open(os.path.join(day_dir, stem + ".json"), "w", encoding="utf-8") as handle:
            json.dump({"key": key, "brand": brand, "date": date_str, "slot": slot,
                       "idea_id": idea["id"], "category": idea["category"], "layout": idea["layout"],
                       "caption": post["text"], "hashtags": post["hashtags"], "cta": post["cta"],
                       "image": os.path.basename(png), "image_stats": stats},
                      handle, ensure_ascii=False, indent=2)

        record(history.RENDERED, idea_id=idea["id"], layout=idea["layout"],
               category=idea["category"], topic=idea.get("topic"), image=os.path.basename(png),
               caption_chars=post["length"], hashtags=len(post["hashtags"]))
        emit("rendered %s (%d bytes, %d colours) caption=%d chars"
             % (os.path.basename(png), stats["bytes"], stats["distinct_colours"], post["length"]))

        if dry_run:
            emit("DRY RUN — publishing disabled; nothing sent to Instagram")
            return {"key": key, "action": "dry_run", "published": False,
                    "idea_id": idea["id"], "image": png, "caption": post["text"]}

        # ---- credentials, own lane only -------------------------------------
        account = load_account(brand, env_path)
        if account is None:
            reason = "account '%s' is not configured; its slots are skipped" % brand
            emit("skipped: %s" % reason)
            record(history.SKIPPED, reason=reason, stage="credentials", idea_id=idea["id"])
            return {"key": key, "action": "skipped", "reason": reason, "published": False}
        account.assert_owns(brand)

        graph_host = env.get("INSTAGRAM_GRAPH_HOST") or publisher.DEFAULT_HOST

        # ---- resume or create the container ---------------------------------
        container = history.open_container(paths["state"], brand, key)
        if container:
            emit("resuming existing container (no second container will be created)")
        else:
            try:
                image_key = "%s/%s/%s.png" % (brand, date_str, stem)
                url, backend = imagehost.upload(env, image_key, png)
                emit("image hosted via %s" % backend)
                container = publisher.create_container(account, brand, url, post["text"], host=graph_host)
            except (imagehost.ImageHostError, publisher.PublishError) as exc:
                message = scrub(str(exc), secrets)
                emit("failed: %s" % message)
                record(history.FAILED, reason=message, stage="container", idea_id=idea["id"])
                return {"key": key, "action": "failed", "reason": message, "published": False}
            record(history.CONTAINER, container_id=container, idea_id=idea["id"],
                   layout=idea["layout"], category=idea["category"], topic=idea.get("topic"))
            emit("container created and recorded before publishing")

        # ---- single publish attempt -----------------------------------------
        try:
            publisher.wait_until_ready(account, container, host=graph_host)
            media_id = publisher.publish_container(account, brand, container, host=graph_host)
        except publisher.PublishError as exc:
            message = scrub(str(exc), secrets)
            emit("failed: %s (no retry; the next scheduled run may resume this container)" % message)
            record(history.FAILED, reason=message, stage="publish",
                   idea_id=idea["id"], container_id=container)
            return {"key": key, "action": "failed", "reason": message, "published": False}

        record(history.PUBLISHED, media_id=media_id, container_id=container, idea_id=idea["id"],
               layout=idea["layout"], category=idea["category"], topic=idea.get("topic"),
               account=account.tag)
        emit("PUBLISHED to %s (media recorded)" % account.tag)
        return {"key": key, "action": "published", "published": True,
                "media_id": media_id, "idea_id": idea["id"]}

    except Exception as exc:                                        # unexpected
        message = scrub("%s: %s" % (type(exc).__name__, exc), secrets)
        emit("unexpected error: %s" % message)
        if verbose:
            log(root, scrub(traceback.format_exc(), secrets))
        history.append(paths["state"], brand, {"key": key, "brand": brand, "date": date_str,
                                               "slot": slot, "status": history.FAILED,
                                               "reason": message, "stage": "unexpected"})
        return {"key": key, "action": "error", "reason": message, "published": False}
    finally:
        lock.__exit__(None, None, None)
