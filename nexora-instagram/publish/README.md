# Instagram publisher — @bynexora.co

Publishes `nexora-instagram/out/nexora-post-01.png` … `-09.png` to Instagram
through the Meta Graph API, in order, using the captions in
[`../README.md`](../README.md) section 4.

Node 18+. No dependencies. No credential in the code.

---

## What it will and will not do

**Will:** create an image container, wait for it to finish, publish it, and
write what it published to `state.json`.

**Will not:** delete, edit or hide anything. There is no DELETE call and no
edit call anywhere in `publish.mjs`. It does not touch the bio, profile
picture, highlights, reels, or any post that already exists. Your existing
content is only ever *read* (a media count, to show in `--check`).

Four guards, all on by default:

| Guard | What it stops |
| --- | --- |
| `DRY_RUN=true` (default) | Any real publish. You have to set it to `false` on purpose. |
| Account guard | Publishing to any handle other than `bynexora.co`. It resolves `IG_USER_ID` → username before every post and aborts on a mismatch. |
| Order guard | Posting 05 before 01. Posts go out 01 → 09 only. |
| Duplicate guard | Posting the same image twice, ever, via `state.json`. |

---

## The one thing that surprises people

**Meta never receives your image file.** You give the API a public HTTPS URL and
Meta's servers download it. A local path, a `file://` URL or a private link
cannot work.

This repository is public, so the pushed branch already serves the images:

```
https://raw.githubusercontent.com/abutair2ahmad/ahmad-digital-builder/claude/nexora-instagram-content-aey3ur/nexora-instagram/out/nexora-post-01.png
```

That URL is verified reachable and serves `image/png`. Set `IG_IMAGE_BASE_URL`
to the directory part. If you would rather not serve them from GitHub, host the
nine PNGs on Cloudflare R2, Vercel, or any static host and point the variable
there instead — nothing else changes.

---

## Setup

```bash
cd nexora-instagram/publish
cp .env.example .env          # then fill in the two secrets
```

`.env` is gitignored. Do not commit it, do not paste the token into a PR,
an issue, or a chat.

---

## Running it

Work down this list in order.

```bash
# 1. No token needed. Checks all nine images, sizes, captions and order.
node publish.mjs --validate

# 2. Confirms the token works and that IG_USER_ID really is @bynexora.co.
node publish.mjs --check

# 3. Full rehearsal of post 01 — every step except the two publishing calls.
node publish.mjs --post 01

# 4. The real thing, one post only.
DRY_RUN=false node publish.mjs --post 01

# 5. Look at the profile. If post 01 is right, continue one at a time:
DRY_RUN=false node publish.mjs --next

# --- only once you are happy with how it behaves ---
DRY_RUN=false CONFIRM_ALL=yes node publish.mjs --all
```

`node publish.mjs --status` shows what has gone out and what is next.

---

## Daily automation (set up after post 01 is live)

`--next` is built for a scheduler: it publishes exactly one post, the next one
in order, and does nothing at all once all nine are out.

```bash
# crontab -e — one post a day at 19:00
0 19 * * * cd /path/to/ahmad-digital-builder/nexora-instagram/publish && DRY_RUN=false /usr/bin/node publish.mjs --next >> publish.log 2>&1
```

A GitHub Actions schedule works too — put `IG_ACCESS_TOKEN` and `IG_USER_ID` in
repository secrets, never in the workflow file. Note that `state.json` has to
persist between runs (commit it, or use an artifact/cache), otherwise the
duplicate guard has no memory.

---

## Token lifetime

A long-lived user token lasts 60 days and can be refreshed. A **System User
token** from Meta Business Manager does not expire and is the better choice for
a cron job. If publishing starts failing with code 190, the token expired —
mint a new one and update `.env`.

---

## Troubleshooting

| Error | Cause |
| --- | --- |
| `code 190` | Token expired or revoked. |
| `code 200` | Missing permission — see the scope list in the parent chat/setup notes. |
| `code 9004` / "media could not be fetched" | The image URL is not publicly reachable, or is not `image/png` / `image/jpeg`. |
| `Account guard tripped` | `IG_USER_ID` belongs to a different account. Nothing was published. |
| Container stuck on `IN_PROGRESS` | Normal for a few seconds; the script waits up to 5 minutes, then gives up without publishing. |
