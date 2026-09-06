#!/usr/bin/env python3
"""Reading .env and keeping what it holds out of every log line.

Nothing in this package prints a secret. Values arrive here and leave only as a
`mask()` fingerprint or a `fingerprint()` tag, both one-way. `scrub()` is the last
gate before any Graph API error text reaches a log file, because an error body can
quote back the query string a request was made with.
"""

import hashlib
import os
import re
import urllib.parse

# A .env line that is a real assignment: NAME=value. Anything else (a stray shell
# command pasted into the file, a heredoc body) is ignored rather than parsed.
ASSIGNMENT = re.compile(r"^([A-Za-z_][A-Za-z0-9_]*)=(.*)$")


def read_env(path):
    """Parse a .env file into a dict, dropping comments, blanks and junk lines.

    Empty values are dropped too: an unset credential and a credential set to ""
    mean the same thing to this system, and treating them alike keeps the
    "is it configured?" check in one place.
    """
    values = {}
    if not os.path.exists(path):
        return values
    with open(path, "r", encoding="utf-8") as handle:
        for raw in handle:
            line = raw.strip()
            if not line or line.startswith("#"):
                continue
            match = ASSIGNMENT.match(line)
            if not match:
                continue
            key, value = match.group(1), match.group(2).strip()
            if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
                value = value[1:-1]
            if value:
                values[key] = value
    return values


def mask(secret):
    """Render a secret as a short non-reversible description, safe to print."""
    if not secret:
        return "(unset)"
    text = str(secret)
    if len(text) <= 12:
        return "*" * len(text) + " (len %d)" % len(text)
    return "%s…%s (len %d)" % (text[:4], text[-4:], len(text))


def fingerprint(value):
    """A short stable tag so two accounts can be told apart in a log.

    Same convention as scripts/meta/instagram_autoreply.py so log lines from the
    auto-reply lane and this publisher lane can be read side by side.
    """
    if not value:
        return "?"
    return "#" + hashlib.sha256(str(value).encode("utf-8")).hexdigest()[:6]


def scrub(text, secrets):
    """Replace every known secret in `text`, raw and percent-encoded.

    Graph API errors echo the request back, so this runs over error text before
    it is logged. Longest first, so a secret containing another is fully covered.
    """
    out = str(text)
    for secret in sorted({s for s in secrets if s}, key=len, reverse=True):
        for form in (secret, urllib.parse.quote(secret, safe=""), urllib.parse.quote_plus(secret)):
            if form:
                out = out.replace(form, "[REDACTED]")
    return out
