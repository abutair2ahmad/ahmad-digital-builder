#!/usr/bin/env python3
"""One isolated credential lane per Instagram account.

The rule this module exists to enforce: a post planned for one brand can only ever
be published with that brand's own token. There is no shared token, no "default"
account and no fallback — a brand whose own credentials are missing is skipped,
never served by the other brand's lane.

Isolation is structural rather than a convention:
  * Credentials are only ever reachable through `load_account(name)`, which reads
    the env keys belonging to that one slot.
  * `Account.assert_owns(brand)` is called immediately before every write to the
    Graph API, so a mismatch raises instead of publishing to the wrong profile.
  * An Account carries its own token; nothing here exposes a registry of all tokens.
"""

from .envfile import fingerprint, read_env

# The single source of truth for which brand maps to which env keys. A handle
# appears here only as part of an env var NAME — never as a literal value.
ACCOUNT_SLOTS = {
    "movewell": {
        "handle": "@movewell.il",
        "id_key": "INSTAGRAM_MOVEWELL_IG_ID",
        "token_key": "INSTAGRAM_MOVEWELL_TOKEN",
    },
    "bynexora": {
        "handle": "@bynexora.co",
        "id_key": "INSTAGRAM_BYNEXORA_IG_ID",
        "token_key": "INSTAGRAM_BYNEXORA_TOKEN",
    },
}

BRANDS = tuple(ACCOUNT_SLOTS)


class AccountIsolationError(RuntimeError):
    """Raised when a post and the credentials about to publish it disagree."""


class Account(object):
    """One brand's credentials. Never holds, and cannot reach, another brand's token."""

    __slots__ = ("name", "handle", "ig_id", "_token")

    def __init__(self, name, handle, ig_id, token):
        self.name = name
        self.handle = handle
        self.ig_id = ig_id
        self._token = token

    @property
    def token(self):
        return self._token

    @property
    def tag(self):
        """The only form of this account that is allowed into a log line."""
        return "%s%s" % (self.name, fingerprint(self.ig_id))

    def assert_owns(self, brand):
        """Gate every Graph API write. Raises rather than crossing the lanes."""
        if brand != self.name:
            raise AccountIsolationError(
                "refusing to publish a '%s' post through the '%s' account lane" % (brand, self.name)
            )

    # A stray print() or an exception repr must not leak the token.
    def __repr__(self):
        return "<Account %s>" % self.tag

    __str__ = __repr__


def load_account(name, env_path=".env"):
    """Build the Account for one brand, or return None if it is not configured.

    Returning None (rather than raising) is deliberate: an unconfigured brand
    causes its own slots to be skipped and leaves the other brand running.
    """
    if name not in ACCOUNT_SLOTS:
        raise AccountIsolationError("unknown brand %r" % (name,))
    slot = ACCOUNT_SLOTS[name]
    env = read_env(env_path)
    ig_id = env.get(slot["id_key"])
    token = env.get(slot["token_key"])
    if not ig_id or not token:
        return None
    return Account(name, slot["handle"], ig_id, token)


def account_status(name, env_path=".env"):
    """Describe a slot's readiness for a report, without reading any value out."""
    slot = ACCOUNT_SLOTS[name]
    env = read_env(env_path)
    return {
        "brand": name,
        "handle": slot["handle"],
        "id_key": slot["id_key"],
        "token_key": slot["token_key"],
        "ig_id_set": bool(env.get(slot["id_key"])),
        "token_set": bool(env.get(slot["token_key"])),
        "ready": bool(env.get(slot["id_key"]) and env.get(slot["token_key"])),
    }
