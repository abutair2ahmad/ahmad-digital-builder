#!/usr/bin/env python3
"""Auto-reply for Instagram DMs, one isolated lane per connected account.

Routing is by the Instagram user id that RECEIVED the message: an event is answered only
by the account it was addressed to, and an unrecognised recipient is never answered at all.
The two accounts share no token, no dedup namespace and no fallback path.

Loop and duplicate protection, in order:
  1. `message.is_echo` — our own outgoing messages are skipped.
  2. sender == the receiving account — a message from ourselves is skipped.
  3. claim-once dedup on (account, mid) — Meta's webhook retries send one reply, never two.

Sending is OFF unless INSTAGRAM_AUTO_REPLY_ENABLED is true; until then every decision is
logged as a dry run and no request leaves the machine.

Logs carry short non-reversible fingerprints only — never message text, tokens, usernames
or account/message ids.
"""

import hashlib
import json
import threading
import urllib.error
import urllib.request
from collections import OrderedDict, namedtuple

REPLY_TEXT = "مرحباً 👋 وصلت رسالتك بنجاح. هذا رد تجريبي تلقائي."

GRAPH_HOST = "https://graph.instagram.com"
API_VERSION = "v23.0"
SEND_TIMEOUT = 10
DEDUP_CAPACITY = 2000

# One slot per connected account. The handle lives in the env var name only, never in a log.
ACCOUNT_SLOTS = (
    ("movewell", "INSTAGRAM_MOVEWELL_IG_ID", "INSTAGRAM_MOVEWELL_TOKEN"),
    ("bynexora", "INSTAGRAM_BYNEXORA_IG_ID", "INSTAGRAM_BYNEXORA_TOKEN"),
)

TRUE_VALUES = ("1", "true", "yes", "on")

Account = namedtuple("Account", "name ig_id token")
Decision = namedtuple("Decision", "action account send_to mid reason")


def fingerprint(value):
    """A short non-reversible tag so two accounts can be told apart in a log."""
    if not value:
        return "?"
    return "#" + hashlib.sha256(str(value).encode("utf-8")).hexdigest()[:6]


def skip(reason):
    return Decision("skip", None, None, None, reason)


def load_accounts(env):
    """Build {instagram user id → Account} from the fully configured slots only."""
    accounts = {}
    for name, id_var, token_var in ACCOUNT_SLOTS:
        ig_id = (env.get(id_var) or "").strip()
        token = (env.get(token_var) or "").strip()
        if not ig_id or not token:
            continue
        if ig_id in accounts:
            raise ValueError("%s repeats an Instagram user id already configured" % id_var)
        accounts[ig_id] = Account(name, ig_id, token)
    return accounts


def missing_account_config(env):
    """Env var names that must still be filled in, per slot. Values are never read out."""
    missing = []
    for _name, id_var, token_var in ACCOUNT_SLOTS:
        for var in (id_var, token_var):
            if not (env.get(var) or "").strip():
                missing.append(var)
    return missing


class DedupCache:
    """Claim-once set with a bounded size. claim() returns True for the first caller only."""

    def __init__(self, capacity=DEDUP_CAPACITY):
        self.capacity = capacity
        self._seen = OrderedDict()
        self._lock = threading.Lock()

    def claim(self, key):
        with self._lock:
            if key in self._seen:
                self._seen.move_to_end(key)
                return False
            self._seen[key] = True
            while len(self._seen) > self.capacity:
                self._seen.popitem(last=False)
            return True

    def __len__(self):
        with self._lock:
            return len(self._seen)


def decide(entry, event, accounts):
    """Decide what a single messaging event deserves. Fails closed: anything unclear is skipped."""
    if not isinstance(event, dict):
        return skip("not-an-object")

    message = event.get("message")
    if not isinstance(message, dict):
        return skip("not-a-message")
    if message.get("is_echo"):
        return skip("echo")
    if message.get("is_deleted"):
        return skip("deleted")

    mid = message.get("mid")
    if not isinstance(mid, str) or not mid:
        return skip("no-mid")

    recipient = event.get("recipient")
    recipient_id = recipient.get("id") if isinstance(recipient, dict) else None
    entry_id = entry.get("id") if isinstance(entry, dict) else None
    if recipient_id and entry_id and recipient_id != entry_id:
        return skip("recipient-entry-mismatch")

    account = accounts.get(recipient_id or entry_id)
    if account is None:
        return skip("unknown-account")

    sender = event.get("sender")
    sender_id = sender.get("id") if isinstance(sender, dict) else None
    if not sender_id:
        return skip("no-sender")
    if sender_id == account.ig_id:
        return skip("self-message")

    return Decision("reply", account, sender_id, mid, "incoming-dm")


def build_send_request(account, send_to, text):
    """POST {ig-user-id}/messages on graph.instagram.com; the token rides in the header."""
    url = "%s/%s/%s/messages" % (GRAPH_HOST, API_VERSION, account.ig_id)
    body = json.dumps({
        "recipient": {"id": send_to},
        "message": {"text": text},
    }).encode("utf-8")
    request = urllib.request.Request(url, data=body, method="POST")
    request.add_header("Content-Type", "application/json")
    request.add_header("Authorization", "Bearer %s" % account.token)
    return request


def describe_graph_error(body):
    """Error code/type only — never the message body, which can quote user content."""
    try:
        error = (json.loads(body) or {}).get("error") or {}
    except (ValueError, TypeError):
        return "unparsable error body"
    parts = []
    for key in ("code", "error_subcode", "type"):
        if error.get(key) is not None:
            parts.append("%s=%s" % (key, error[key]))
    return " ".join(parts) or "unknown error"


def send_text(account, send_to, text, opener=None):
    """Return (ok, detail). detail never contains the token or any message text."""
    request = build_send_request(account, send_to, text)
    open_url = opener or urllib.request.urlopen
    try:
        with open_url(request, timeout=SEND_TIMEOUT) as response:
            response.read()
            return True, "http=%d" % response.status
    except urllib.error.HTTPError as exc:
        return False, "http=%d %s" % (exc.code, describe_graph_error(exc.read().decode("utf-8", "replace")))
    except urllib.error.URLError as exc:
        return False, "network error: %s" % type(exc).__name__


class Responder:
    """Turns a verified Instagram payload into at most one reply per incoming message."""

    def __init__(self, accounts, log, enabled=False, sender=None, reply_text=REPLY_TEXT):
        self.accounts = accounts
        self.log = log
        self.enabled = enabled
        self.sender = sender or send_text
        self.reply_text = reply_text
        self.dedup = DedupCache()

    def handle(self, payload, verified_with):
        """Called only after the signature passed. Returns the number of replies sent."""
        if verified_with != "INSTAGRAM_APP_SECRET":
            self.log("autoreply skip · not an Instagram-signed delivery")
            return 0
        if not isinstance(payload, dict) or payload.get("object") != "instagram":
            return 0
        if not self.accounts:
            self.log("autoreply skip · no account configured")
            return 0

        sent = 0
        entries = payload.get("entry")
        for entry in entries if isinstance(entries, list) else []:
            events = entry.get("messaging") if isinstance(entry, dict) else None
            for event in events if isinstance(events, list) else []:
                sent += self.handle_event(entry, event)
        return sent

    def handle_event(self, entry, event):
        decision = decide(entry, event, self.accounts)
        if decision.action != "reply":
            self.log("autoreply skip · %s" % decision.reason)
            return 0

        tag = fingerprint(decision.account.ig_id)
        if not self.dedup.claim((decision.account.ig_id, decision.mid)):
            self.log("autoreply skip · duplicate delivery · account=%s msg=%s"
                     % (tag, fingerprint(decision.mid)))
            return 0

        if not self.enabled:
            self.log("autoreply dry run · would reply once · account=%s msg=%s"
                     % (tag, fingerprint(decision.mid)))
            return 0

        ok, detail = self.sender(decision.account, decision.send_to, self.reply_text)
        self.log("autoreply %s · account=%s msg=%s · %s"
                 % ("sent" if ok else "failed", tag, fingerprint(decision.mid), detail))
        return 1 if ok else 0


def build_responder(env, log):
    """Assemble a Responder from a .env mapping. Sending stays off unless explicitly enabled."""
    enabled = (env.get("INSTAGRAM_AUTO_REPLY_ENABLED") or "").strip().lower() in TRUE_VALUES
    return Responder(load_accounts(env), log, enabled=enabled)
