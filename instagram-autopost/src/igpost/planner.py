#!/usr/bin/env python3
"""Choose which idea runs in a given slot.

Two things are being balanced. The rotation matrix in config/schedule.json fixes
the *category* for each weekday and slot, which is what stops the feed becoming a
run of advertisements. Within that category, selection avoids anything used
recently, so the same post does not reappear while it is still in people's memory.

Selection is deterministic given (post key, history): the same slot re-planned
after a crash resolves to the same idea.
"""

from datetime import datetime

from .compose import pick
from .history import PUBLISHED, recent_idea_ids, read_all


def slot_index(schedule, slot):
    return schedule["slots"].index(slot)


def target_category(schedule, date_str, slot):
    """The category this weekday and slot is meant to carry."""
    weekday = datetime.strptime(date_str, "%Y-%m-%d").weekday()
    row = schedule.get("rotation", {}).get(str(weekday))
    if not row:
        return None
    return row[slot_index(schedule, slot) % len(row)]


def recent_layouts(state_dir, brand, days, today, date_str=None):
    """Layouts to avoid: published inside the window, or already used today."""
    used = []
    for event in read_all(state_dir, brand):
        layout, event_date = event.get("layout"), event.get("date")
        if not layout or not event_date:
            continue
        if date_str and event_date == date_str:
            used.append(layout)
            continue
        if event.get("status") != PUBLISHED:
            continue
        date_str_local = event_date
        try:
            age = (today - datetime.strptime(date_str_local, "%Y-%m-%d").date()).days
        except ValueError:
            continue
        if 0 <= age < days:
            used.append(layout)
    return used


def choose(content, schedule, state_dir, brand, date_str, slot, post_key_value):
    """Return (idea, why) or (None, why) when nothing is publishable.

    Returning None is a valid, safe outcome: the runner skips the slot rather than
    repeating a post the account has just made.
    """
    ideas = content.get("ideas", [])
    if not ideas:
        return None, "content bank is empty"

    today = datetime.strptime(date_str, "%Y-%m-%d").date()
    blocked = set(recent_idea_ids(state_dir, brand, schedule.get("idea_cooldown_days", 21), today, date_str))
    stale_layouts = set(recent_layouts(state_dir, brand, schedule.get("layout_cooldown_days", 3), today, date_str))

    category = target_category(schedule, date_str, slot)
    fresh = [i for i in ideas if i["id"] not in blocked]
    if not fresh:
        return None, "every idea is inside the %d-day cooldown — the bank needs more entries" % (
            schedule.get("idea_cooldown_days", 21))

    # A day that talks about knees twice, or booking twice, reads as repetitive even
    # when the two posts are different ideas in different categories. Topics already
    # spoken for today are avoided before layout variety is considered.
    todays_topics = {e.get("topic") for e in read_all(state_dir, brand)
                     if e.get("date") == date_str and e.get("topic")}

    in_category = [i for i in fresh if i.get("category") == category]
    new_topic = [i for i in in_category if i.get("topic") not in todays_topics]
    varied = [i for i in new_topic if i.get("layout") not in stale_layouts]

    for pool, why in (
        (varied, "category '%s', new topic, layout not used in %d days"
                 % (category, schedule.get("layout_cooldown_days", 3))),
        (new_topic, "category '%s', new topic (layout variety unavailable)" % category),
        (in_category, "category '%s' (topic already covered today)" % category),
        ([i for i in fresh if i.get("topic") not in todays_topics and i.get("layout") not in stale_layouts],
         "no fresh idea in category '%s'; widened to a new topic" % category),
        (fresh, "no fresh idea in category '%s'; widened fully" % category),
    ):
        if pool:
            chosen = pick(sorted(pool, key=lambda i: i["id"]), post_key_value, "idea")
            return chosen, why

    return None, "no candidate idea"
