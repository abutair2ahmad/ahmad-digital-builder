# MoveWell Instagram publisher

A local, dependency-free publisher for **@movewell.il** only.
Uses the Instagram API with Instagram Login against `graph.instagram.com`.

Dry run by default. It cannot publish by accident.

## Why it is separate

MoveWell credentials live only in this folder's `.env`. Nothing here reads,
writes or shares anything belonging to `bynexora.co` / NEXORA — that account is
on a hard deny list in `src/config.mjs` and the tool refuses to run against it
even if `.env` points there.

## Setup

Requires Node 18+ (uses built-in `fetch`). No `npm install` needed.

```bash
cd movewell-instagram/publish
cp .env.example .env
# fill in IG_ACCESS_TOKEN and IG_USER_ID in your editor
node src/index.mjs --check
```

`.env` and `state/*.json` are gitignored. Never commit them and never paste a
token into a chat, an issue or a log.

## Commands

```bash
node src/index.mjs --check      # validate env, content and account. Sends nothing.
node src/index.mjs --post 01    # run post 01 through the pipeline
node src/index.mjs --next       # run the first post not yet recorded as published
```

Equivalent npm scripts: `npm run check`, `npm run next`, `npm run post -- 01`.

## The four guards

1. **Host guard** — refuses any host other than `graph.instagram.com`, so a
   Facebook-Login token for another brand cannot be pointed at this tool.
2. **Account guard** — two halves. Before any network call it rejects a denied
   or empty `IG_TARGET_USERNAME`. Then it calls `/me`, and aborts unless the
   username the token resolves to is exactly `movewell.il`. If `IG_USER_ID` is
   set, the id must match too.
3. **Duplicate guard** — `state/published.json` records every published post.
   A post id that is already there is refused, and so is a different id whose
   caption and image hash to the same value.
4. **Live guard** — publishing needs two independent signals: `DRY_RUN=false`
   in `.env` **and** `--confirm` on the command line. Either alone stays inert.

Tokens are never printed. The logger scrubs registered secrets and any
`access_token` field; `--check` shows only a fingerprint like
`set, 184 chars, ends ...a1b2`.

## Adding images

`content/posts.json` holds the six posts. Each one needs `image_url`: a public
HTTPS URL of the exported 1080×1350 design. Instagram fetches that URL from its
own servers, so a local path, a private bucket or a Canva editor link will not
work. Export each design from the `canva_url` in the manifest, upload it
somewhere public, then paste the direct image URL in.

`--check` lists which posts are still missing one.

## What a run does

```
POST /{ig-user-id}/media          image_url + caption  -> creation_id
GET  /{creation_id}?fields=status_code                 -> poll until FINISHED
POST /{ig-user-id}/media_publish  creation_id          -> media id
```

In dry run the three calls are printed with the caption exactly as Instagram
would receive it, nothing is sent, and the state file is not touched.

## Files

```
src/index.mjs     CLI and the run pipeline
src/config.mjs    .env loading, defaults, deny list
src/guards.mjs    host, account, duplicate and live guards
src/ig.mjs        graph.instagram.com client
src/state.mjs     atomic local state
src/content.mjs   manifest loading, caption assembly, validation
src/log.mjs       redacting logger
content/posts.json  the six posts
state/              local state (gitignored)
```
