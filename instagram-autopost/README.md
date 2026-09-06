# Instagram auto-publisher — @movewell.il (Hebrew) and @bynexora.co (Arabic)

Generates and publishes three posts a day to each account: 10:00, 15:00 and 20:30
Asia/Jerusalem. Standard library only, no pip install, no build step.

**Publishing is off by default.** Nothing reaches Instagram unless
`IG_PUBLISH_ENABLED=true` *and* the command is run with `--live`.

## How one post is made

    plan ──▶ caption ──▶ render ──▶ inspect ──▶ host ──▶ container ──▶ publish
     │         │           │          │          │          │            │
   rotation  claim      headless    PNG gate    R2      recorded      ledger
   + cooldown guard      Chrome                        before use    (terminal)

Everything that can fail cheaply happens before anything irreversible. A failure at
any stage before `host` skips the slot; it never falls back to older content and
never publishes a partially-correct image.

## Commands

    bin/igpost status                    what is configured, due, and published
    bin/igpost plan   --date 2026-09-05  the day's plan, no rendering
    bin/igpost render --date 2026-09-05  render all six posts, publish nothing
    bin/igpost run --brand movewell --slot 10:00          dry run
    bin/igpost run --brand movewell --slot 10:00 --live   publishes
    bin/igpost due  [--live]             run whatever is due right now
    bin/igpost history --brand movewell  the ledger
    bin/igpost verify                    read-only identity + quota check

## Layout

    config/brands/*.json    palette, type, shape, CTAs, hashtag pools, claim guard
    assets/fonts/           font files a brand embeds into its own renders
    config/schedule.json    slots, timezone, category rotation, cooldowns
    content/*.json          the idea banks — 20 per brand
    templates/base.css      the shared 1080x1080 canvas
    src/igpost/             the engine (see below)
    bin/igpost              the command line
    out/                    generated images, HTML and post JSON (git-ignored)
    state/<brand>/posts.jsonl   the publishing ledger (tracked; no secrets)
    logs/run.log            scrubbed run log (git-ignored)

    accounts.py    one credential lane per brand; cross-brand use raises
    envfile.py     .env parsing, masking, scrubbing
    clock.py       DST-correct slot timing
    planner.py     category rotation, idea/topic/layout cooldowns
    compose.py     caption, CTA, hashtags, claim guard
    layouts.py     the seven layouts
    render.py      HTML -> PNG via headless Chrome, with fit measurement
    imagecheck.py  PNG decoder and quality gate
    imagehost.py   Cloudflare R2 (SigV4) or a local directory
    publisher.py   the only module that writes to Instagram
    history.py     the ledger, idempotency and slot locks
    runner.py      one slot, end to end

## Account isolation

`ACCOUNT_SLOTS` in `accounts.py` is the only place a brand maps to credentials, and
each brand names its own env keys. An `Account` carries one token and cannot reach
the other's. `account.assert_owns(brand)` runs before every Graph API write, so a
MoveWell post cannot be published through Nexora's lane even if the code is wrong.
A brand with missing credentials returns `None` and has its slots skipped — it never
falls back to the other account. Proven in `tests/test_safety.py` and, over a real
socket, in `tests/test_publish_flow.py`.

## Duplicate prevention

Every slot has a deterministic key: `brand:YYYY-MM-DD:HH:MM`. Before anything runs,
the ledger is checked; a key that ever reached `published` returns immediately.
`published` is terminal by rank, not by recency, so a later stray event cannot talk
a retry back into publishing. The container id is written to the ledger the moment
it exists, so a run interrupted between "create container" and "publish container"
resumes that container instead of creating a second one. A per-slot lock file stops
two overlapping runs racing, and goes stale after 30 minutes so a killed process
cannot wedge a slot.

## Scheduling

The runner is invoked frequently and decides for itself whether a slot is due in
Asia/Jerusalem. This is deliberate: Israel observes daylight saving, so a fixed UTC
crontab would post an hour off for half the year. It also means a missed run is
recovered by the next one, inside the 90-minute catch-up window.

* **VPS** — `deploy/systemd-igpost.{service,timer}`, fires every 15 minutes.
* **GitHub Actions** — `.github/workflows/instagram-autopost.yml`, no server at all.
  Each slot is scheduled at both of its possible UTC times and the runner discards
  the half that is not really due. The workflow commits the ledger back, which is
  what keeps idempotency working across stateless runs.

## Host requirements

* Python 3.9+ (`zoneinfo`), Chrome or Chromium on `PATH` or in a standard location.
* Fonts. macOS has everything already. On Linux install `fonts-noto-core` and
  `fonts-noto-hebrew`, or MoveWell's Hebrew renders as fallback glyphs.
  Nexora needs nothing installed: its brand config lists the IBM Plex Sans Arabic
  faces under `assets/fonts/`, and `render.py` inlines them into every stage as
  data URIs. Arabic is a joined script, and a host missing an Arabic font would
  produce a frame that measures perfectly and still cannot be posted, so that face
  travels with the repository rather than with the machine. Any brand can opt in
  the same way with a `webfonts` block; a brand without one renders on system
  fonts exactly as before.

## Adding content

MoveWell publishes in Hebrew and Nexora in Arabic; each brand's `language` and
`direction` drive the stage's `lang`/`dir`, the layout labels and the Arabic
typographic rules in `base.css`. Write new ideas in the account's own language.

Append to `content/movewell.json` or `content/nexora.json`. An idea needs `id`,
`category`, `layout`, `topic`, an `image` block matching its layout, a `caption`
block, and `tags`. With three posts a day and a 21-day cooldown, each account needs
63 ideas to never repeat; at 20 each the planner widens its search and says so in the
log. `bin/igpost plan` shows what a day would look like without rendering anything.

## Tests

    python3 tests/test_safety.py         31 tests — isolation, idempotency, secrecy, gates
    python3 tests/test_publish_flow.py    8 tests — full publish flow against a mock Graph API
