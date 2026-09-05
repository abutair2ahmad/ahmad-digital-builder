import { DENY_USERNAMES, REQUIRED_GRAPH_HOST } from './config.mjs';

export class GuardError extends Error {
  constructor(message) {
    super(message);
    this.name = 'GuardError';
  }
}

/**
 * Instagram Login tokens are only valid against graph.instagram.com.
 * Refusing any other host also stops a Facebook-Login app token for another
 * brand from being pointed at this tool.
 */
export function assertGraphHost(config) {
  if (config.graphHost !== REQUIRED_GRAPH_HOST) {
    throw new GuardError(
      `IG_GRAPH_HOST is "${config.graphHost}" but this tool only talks to ${REQUIRED_GRAPH_HOST}.`,
    );
  }
}

/**
 * Pre-flight half of the account guard: reject a denied or empty target before
 * any network call, so a misconfigured .env never reaches Instagram at all.
 */
export function assertTargetAllowed(config) {
  const expected = config.targetUsername.trim().toLowerCase();
  if (!expected) {
    throw new GuardError('IG_TARGET_USERNAME is empty. Set it to movewell.il.');
  }
  if (DENY_USERNAMES.includes(expected)) {
    throw new GuardError(
      `IG_TARGET_USERNAME is set to a denied account (@${expected}). This tool only publishes to movewell.il.`,
    );
  }
}

/**
 * The account guard. Nothing is created or published until the token has been
 * resolved to a real username and that username is exactly the target.
 */
export function assertAccount(me, config) {
  const username = String(me?.username ?? '').trim().toLowerCase();
  const expected = config.targetUsername.trim().toLowerCase();

  if (!username) {
    throw new GuardError('Instagram did not return a username for this token — refusing to continue.');
  }
  if (DENY_USERNAMES.includes(username)) {
    throw new GuardError(
      `Refusing to touch @${username}: it is on the deny list. This tool only publishes to @${expected}.`,
    );
  }
  if (DENY_USERNAMES.includes(expected)) {
    throw new GuardError(
      `IG_TARGET_USERNAME is set to a denied account (@${expected}). Reset it to movewell.il.`,
    );
  }
  if (username !== expected) {
    throw new GuardError(
      `Account mismatch: this token belongs to @${username}, expected @${expected}. ` +
        'Wrong token in .env — nothing was sent.',
    );
  }
  if (config.userId && String(me.id) !== String(config.userId)) {
    throw new GuardError(
      `IG_USER_ID (${config.userId}) does not match the id this token resolves to (${me.id}).`,
    );
  }
  return { id: String(me.id), username };
}

/** The duplicate guard: same id, or byte-identical content under another id. */
export function assertNotPublished(state, post) {
  const already = state.published[post.id];
  if (already) {
    throw new GuardError(
      `Post ${post.id} was already published on ${already.publishedAt} (media ${already.mediaId}).`,
    );
  }
  for (const [id, record] of Object.entries(state.published)) {
    if (record.contentHash && record.contentHash === post.contentHash) {
      throw new GuardError(
        `Identical caption and image were already published as post ${id} on ${record.publishedAt}.`,
      );
    }
  }
}

/**
 * Live publishing needs two independent signals: DRY_RUN=false in .env and
 * --confirm on the command line. Either one alone keeps the run inert.
 */
export function assertLiveAllowed(config, flags) {
  if (config.dryRun) return;
  if (!flags.confirm) {
    throw new GuardError(
      'DRY_RUN=false but --confirm was not passed. Add --confirm to publish for real.',
    );
  }
}
