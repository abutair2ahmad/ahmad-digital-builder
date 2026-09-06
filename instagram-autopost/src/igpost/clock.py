#!/usr/bin/env python3
"""Slot timing in the brand's own timezone.

Israel observes daylight saving, so 10:00 Asia/Jerusalem is not a fixed UTC hour.
Rather than encode wall-clock times into a UTC crontab that silently slips by an
hour twice a year, the runner is invoked often and decides here whether a slot is
actually due. That makes the schedule correct across DST transitions, and it also
means a missed run — a reboot, a network outage, a laptop asleep — is picked up by
the next invocation instead of being lost, as long as it is still inside the
catch-up window.
"""

from datetime import datetime, timedelta

try:
    from zoneinfo import ZoneInfo
except ImportError:                                  # pragma: no cover
    raise SystemExit("Python 3.9+ with zoneinfo is required")


def tz(name):
    return ZoneInfo(name)


def now_in(name):
    return datetime.now(tz(name))


def parse_slot(slot):
    hour, minute = slot.split(":")
    return int(hour), int(minute)


def slot_time(day, slot, zone):
    """The wall-clock moment of `slot` on `day`, in `zone`."""
    hour, minute = parse_slot(slot)
    return datetime(day.year, day.month, day.day, hour, minute, tzinfo=tz(zone))


def due_slots(now, schedule):
    """Slots whose moment has passed but is still inside the catch-up window.

    Yesterday's slots are considered too, so a run just after midnight can still
    finish a slot that came due late in the evening.
    """
    zone = schedule["timezone"]
    window = timedelta(minutes=schedule.get("catch_up_minutes", 90))
    found = []
    for offset in (0, -1):
        day = (now + timedelta(days=offset)).date()
        for slot in schedule["slots"]:
            moment = slot_time(day, slot, zone)
            age = now - moment
            if timedelta(0) <= age <= window:
                found.append({"date": day.strftime("%Y-%m-%d"), "slot": slot,
                              "due_at": moment.isoformat(), "late_seconds": int(age.total_seconds())})
    return sorted(found, key=lambda s: s["due_at"])


def next_slot(now, schedule):
    """The next upcoming slot, for reporting."""
    zone = schedule["timezone"]
    for offset in (0, 1):
        day = (now + timedelta(days=offset)).date()
        for slot in schedule["slots"]:
            moment = slot_time(day, slot, zone)
            if moment > now:
                return {"date": day.strftime("%Y-%m-%d"), "slot": slot, "due_at": moment.isoformat()}
    return None
